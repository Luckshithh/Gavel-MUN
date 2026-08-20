import { useState, useEffect } from 'react';
import { syncStateToDB, listenToDBState } from '../lib/firebase';
import './PointsLedger.css';

export default function PointsLedger({ committeeId, onClose }) {
  const [delegations, setDelegations] = useState([]);
  const [newDelegation, setNewDelegation] = useState('');
  
  // Permanent Stats
  const [ledger, setLedger] = useState({}); // Stores archived points + manual offsets
  const [poiCount, setPoiCount] = useState({});
  const [modCount, setModCount] = useState({});
  const [gslCount, setGslCount] = useState({});
  const [motions, setMotions] = useState([]);
  
  // Active Caucus Stats (for dynamic real-time tallying before archiving)
  const [activeCaucus, setActiveCaucus] = useState(null);
  // Active Sub-Caucus Stats
  const [modSpeakerSlots, setModSpeakerSlots] = useState({});
  const [modScores, setModScores] = useState({});
  const [modPois, setModPois] = useState({});

  // Active GSL Stats
  const [gslSpeakerSlots, setGslSpeakerSlots] = useState({});
  const [gslScores, setGslScores] = useState({});
  const [gslPois, setGslPois] = useState({});

  useEffect(() => {
    const unsubDel = listenToDBState(committeeId, 'delegations', (data) => setDelegations(data || []));
    const unsubLedger = listenToDBState(committeeId, 'ledger', (data) => setLedger(data || {}));
    const unsubPoiCount = listenToDBState(committeeId, 'poiCount', (data) => setPoiCount(data || {}));
    const unsubModCount = listenToDBState(committeeId, 'modCount', (data) => setModCount(data || {}));
    const unsubGslCount = listenToDBState(committeeId, 'gslCount', (data) => setGslCount(data || {}));
    const unsubMotions = listenToDBState(committeeId, 'motions', (data) => setMotions(data || []));

    const unsubActiveCaucus = listenToDBState(committeeId, 'activeCaucus', (data) => setActiveCaucus(data || null));

    const unsubModSlots = listenToDBState(committeeId, 'mod_speakerSlots', (data) => setModSpeakerSlots(data || {}));
    const unsubModScores = listenToDBState(committeeId, 'mod_scores', (data) => setModScores(data || {}));
    const unsubModPois = listenToDBState(committeeId, 'mod_pois', (data) => setModPois(data || {}));

    const unsubGslSlots = listenToDBState(committeeId, 'gsl_speakerSlots', (data) => setGslSpeakerSlots(data || {}));
    const unsubGslScores = listenToDBState(committeeId, 'gsl_scores', (data) => setGslScores(data || {}));
    const unsubGslPois = listenToDBState(committeeId, 'gsl_pois', (data) => setGslPois(data || {}));

    return () => {
      unsubDel(); unsubLedger(); unsubPoiCount(); unsubModCount(); unsubGslCount(); unsubMotions();
      unsubModSlots(); unsubModScores(); unsubModPois(); unsubGslSlots(); unsubGslScores(); unsubGslPois(); unsubActiveCaucus();
    };
  }, [committeeId]);

  // Compute auto-tallied stats from the active caucus (before they are archived)
  const getCalculatedStats = (countryName) => {
    let totalPoints = 0;
    let currentModCount = 0;
    let currentGslCount = 0;
    let currentPoiCount = 0;
    
    // Helper to extract stats from a state set
    const extractStats = (slotsObj, scoresObj, poisObj, isGsl) => {
      Object.keys(scoresObj).forEach(slotIndex => {
        if (slotsObj[slotIndex] === countryName) {
          if (isGsl) currentGslCount += 1;
          else currentModCount += 1;
          
          const score = scoresObj[slotIndex]?.sub;
          if (score !== undefined && score !== '') {
            const parsed = parseInt(score, 10);
            if (!isNaN(parsed)) totalPoints += parsed;
          }
        }
      });

      Object.values(poisObj).forEach(poiList => {
        poiList.forEach(poi => {
          if (poi.delegation === countryName) {
            currentPoiCount += 1;
            const pts = poi.points;
            if (pts !== undefined && pts !== '') {
              const parsed = parseInt(pts, 10);
              if (!isNaN(parsed)) totalPoints += parsed;
            }
          }
        });
      });
    };

    extractStats(modSpeakerSlots, modScores, modPois, false);
    extractStats(gslSpeakerSlots, gslScores, gslPois, true);

    return { totalPoints, currentModCount, currentGslCount, currentPoiCount };
  };

  const handleUpdatePoints = (countryName, valRaw) => {
    const calcStats = getCalculatedStats(countryName);
    let offset = 0;

    if (valRaw === '') {
      offset = -calcStats.totalPoints; // User cleared input, set currentPoints to 0
    } else {
      const typedValue = parseInt(valRaw, 10);
      if (isNaN(typedValue)) return;
      offset = typedValue - calcStats.totalPoints;
    }
    
    const updated = { ...ledger, [countryName]: offset };
    setLedger(updated);
    syncStateToDB(committeeId, 'ledger', updated);
  };

  const handleAddDelegation = (e) => {
    e.preventDefault();
    if (newDelegation.trim()) {
      const updated = [...delegations, { id: Date.now(), name: newDelegation.trim(), status: '-' }];
      setDelegations(updated);
      syncStateToDB(committeeId, 'delegations', updated);
      setNewDelegation('');
    }
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const rows = text.split('\n').map(r => r.trim()).filter(r => r);
      if (rows.length === 0) return;

      const newDels = [];
      
      const headerCols = rows[0].split(',').map(c => c.replace(/['"\r]/g, '').trim().toLowerCase());
      let countryIndex = headerCols.findIndex(c => c === 'country' || c === 'delegation');
      
      let startIndex = 0;
      if (countryIndex !== -1) {
        startIndex = 1;
      } else {
        countryIndex = 0;
      }

      for (let i = startIndex; i < rows.length; i++) {
        const cols = rows[i].split(',');
        if (cols.length <= countryIndex) continue;

        const name = cols[countryIndex].replace(/['"\r]/g, '').trim();
        if (name && name.toLowerCase() !== 'country' && name.toLowerCase() !== 'delegation') {
          if (!delegations.find(d => d.name.toLowerCase() === name.toLowerCase()) && 
              !newDels.find(d => d.name.toLowerCase() === name.toLowerCase())) {
            newDels.push({ id: Date.now() + i, name: name, status: '-' });
          }
        }
      }
      
      if (newDels.length > 0) {
        const updated = [...delegations, ...newDels];
        setDelegations(updated);
        syncStateToDB(committeeId, 'delegations', updated);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const toggleStatus = (id) => {
    const updated = delegations.map(del => {
      if (del.id === id) {
        let newStatus = 'Present';
        if (del.status === '-') newStatus = 'Present';
        else if (del.status === 'Present') newStatus = 'Present and Voting';
        else if (del.status === 'Present and Voting') newStatus = 'Absent';
        else if (del.status === 'Absent') newStatus = 'Present';
        
        return { ...del, status: newStatus };
      }
      return del;
    });
    setDelegations(updated);
    syncStateToDB(committeeId, 'delegations', updated);
  };

  const handleRemoveDelegation = (id) => {
    const delToRemove = delegations.find(d => d.id === id);
    if (!delToRemove) return;
    const nameToRemove = delToRemove.name;

    const updated = delegations.filter(d => d.id !== id);
    setDelegations(updated);
    syncStateToDB(committeeId, 'delegations', updated);

    // Clean up from active Mod Caucus slots
    let modUpdated = false;
    const newModSlots = { ...modSpeakerSlots };
    Object.keys(newModSlots).forEach(key => {
      if (newModSlots[key] === nameToRemove) {
        newModSlots[key] = '';
        modUpdated = true;
      }
    });
    if (modUpdated) syncStateToDB(committeeId, 'mod_speakerSlots', newModSlots);

    // Clean up from active GSL slots
    let gslUpdated = false;
    const newGslSlots = { ...gslSpeakerSlots };
    Object.keys(newGslSlots).forEach(key => {
      if (newGslSlots[key] === nameToRemove) {
        newGslSlots[key] = '';
        gslUpdated = true;
      }
    });
    if (gslUpdated) syncStateToDB(committeeId, 'gsl_speakerSlots', newGslSlots);
  };

  return (
    <div className="modal-overlay animate-fade-in points-ledger-overlay" onClick={onClose}>
      <div className="modal-content points-ledger-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>Close (X)</button>
        <span className="section-title">Master Points Database</span>
        
        <div className="points-ledger-header">
          <form onSubmit={handleAddDelegation} className="points-ledger-form">
            <input 
              type="text" 
              placeholder="Add new country..." 
              value={newDelegation}
              onChange={(e) => setNewDelegation(e.target.value)}
              className="points-ledger-input"
            />
            <button type="submit" className="points-ledger-add-btn">Add</button>
          </form>
          
          <label className="points-ledger-csv-label">
            Import CSV
            <input type="file" accept=".csv" onChange={handleCSVUpload} className="points-ledger-csv-input" />
          </label>
        </div>

        {delegations.length === 0 ? (
          <span className="points-ledger-empty">No delegations registered yet.</span>
        ) : (
          <div className="points-ledger-table-container">
            <table className="points-ledger-table">
              <thead>
                <tr className="points-ledger-thead-tr">
                  <th className="points-ledger-th narrow"></th>
                  <th className="points-ledger-th">Delegation</th>
                  <th className="points-ledger-th center">Status</th>
                  <th className="points-ledger-th right">Total Points</th>
                  <th className="points-ledger-th center">GSL Speeches</th>
                  <th className="points-ledger-th center">Mod Caucuses</th>
                  <th className="points-ledger-th center">POIs Asked</th>
                  <th className="points-ledger-th center">Motions</th>
                </tr>
              </thead>
              <tbody>
                {delegations
                  .map(del => {
                    const calcStats = getCalculatedStats(del.name);
                    const offset = ledger[del.name] || 0;
                    const currentPoints = calcStats.totalPoints + offset;
                    
                    const totalGSLs = (gslCount[del.name] || 0) + calcStats.currentGslCount;
                    const totalMods = (modCount[del.name] || 0) + calcStats.currentModCount;
                    const totalPOIs = (poiCount[del.name] || 0) + calcStats.currentPoiCount;
                    const totalMotions = motions.filter(m => m.proposer === del.name).length;

                    return { ...del, calcStats, currentPoints, totalGSLs, totalMods, totalPOIs, totalMotions };
                  })
                  .sort((a, b) => b.currentPoints - a.currentPoints)
                  .map(del => {
                    const { currentPoints, totalGSLs, totalMods, totalPOIs, totalMotions } = del;
                  return (
                    <tr key={del.id} className="points-ledger-tbody-tr">
                      <td className="points-ledger-td narrow">
                        <button 
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to completely remove ${del.name} from the committee?`)) {
                              handleRemoveDelegation(del.id);
                            }
                          }}
                          className="points-ledger-remove-btn"
                          title="Remove Delegation"
                        >
                          (x)
                        </button>
                      </td>
                      <td className="points-ledger-td lg">{del.name}</td>
                      <td className="points-ledger-td center">
                        <button 
                          onClick={() => toggleStatus(del.id)}
                          className={`points-ledger-status-btn ${del.status === 'Present and Voting' ? 'status-pv' : (del.status === 'Absent' ? 'status-absent' : (del.status === 'Present' ? 'status-present' : 'status-none'))}`}
                        >
                          {del.status === 'Present' ? 'P' : (del.status === 'Present and Voting' ? 'P&V' : (del.status === 'Absent' ? 'A' : '-'))}
                        </button>
                      </td>
                      <td className="points-ledger-td right">
                        <input 
                          type="number" 
                          value={currentPoints}
                          onChange={(e) => handleUpdatePoints(del.name, e.target.value)}
                          className="points-ledger-points-input"
                        />
                      </td>
                      <td className="points-ledger-td lg center">{totalGSLs}</td>
                      <td className="points-ledger-td lg center">{totalMods}</td>
                      <td className="points-ledger-td lg center">{totalPOIs}</td>
                      <td className="points-ledger-td lg center">{totalMotions}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
