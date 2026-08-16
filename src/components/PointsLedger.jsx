import { useState, useEffect } from 'react';
import { syncStateToDB, listenToDBState } from '../lib/firebase';

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
    <div className="modal-overlay animate-fade-in" onClick={onClose} style={{ zIndex: 150 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-section)', padding: '4rem', maxHeight: '80vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={onClose}>Close (X)</button>
        <span className="section-title" style={{ marginBottom: '2rem', display: 'block' }}>Master Points Database</span>
        
        <div style={{ marginBottom: '4rem', display: 'flex', gap: '2rem', alignItems: 'flex-end' }}>
          <form onSubmit={handleAddDelegation} style={{ display: 'flex', gap: '1.5rem', flex: 1, alignItems: 'baseline' }}>
            <input 
              type="text" 
              placeholder="Add new country..." 
              value={newDelegation}
              onChange={(e) => setNewDelegation(e.target.value)}
              style={{ fontSize: '1.25rem', padding: '0.25rem 0', flex: 1, border: 'none', borderBottom: '1px solid var(--text-secondary)' }}
            />
            <button type="submit" style={{ fontSize: '1.125rem' }}>Add</button>
          </form>
          
          <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Import CSV
            <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {delegations.length === 0 ? (
          <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>No delegations registered yet.</span>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  <th style={{ padding: '1rem', fontWeight: 'normal', width: '40px' }}></th>
                  <th style={{ padding: '1rem', fontWeight: 'normal' }}>Delegation</th>
                  <th style={{ padding: '1rem', fontWeight: 'normal', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '1rem', fontWeight: 'normal', textAlign: 'right' }}>Total Points</th>
                  <th style={{ padding: '1rem', fontWeight: 'normal', textAlign: 'center' }}>GSL Speeches</th>
                  <th style={{ padding: '1rem', fontWeight: 'normal', textAlign: 'center' }}>Mod Caucuses</th>
                  <th style={{ padding: '1rem', fontWeight: 'normal', textAlign: 'center' }}>POIs Asked</th>
                  <th style={{ padding: '1rem', fontWeight: 'normal', textAlign: 'center' }}>Motions</th>
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
                    <tr key={del.id} style={{ borderBottom: '1px dashed var(--border-color)' }}>
                      <td style={{ padding: '1.5rem 0 1.5rem 1rem', width: '40px' }}>
                        <button 
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to completely remove ${del.name} from the committee?`)) {
                              handleRemoveDelegation(del.id);
                            }
                          }}
                          style={{ color: 'var(--text-secondary)', fontSize: '1rem', padding: '0', background: 'transparent' }}
                          title="Remove Delegation"
                        >
                          (x)
                        </button>
                      </td>
                      <td style={{ padding: '1.5rem 1rem', fontSize: '1.25rem' }}>{del.name}</td>
                      <td style={{ padding: '1.5rem 1rem', fontSize: '1rem', textAlign: 'center' }}>
                        <button 
                          onClick={() => toggleStatus(del.id)}
                          style={{ 
                            padding: '0.5rem 1rem', 
                            fontSize: '1rem', 
                            color: del.status === 'Present and Voting' ? 'var(--accent-dark)' : (del.status === 'Absent' ? 'var(--text-secondary)' : 'var(--text-primary)'),
                            border: `1px solid ${del.status === 'Present and Voting' ? 'var(--accent-dark)' : 'var(--border-color)'}`,
                            background: 'transparent',
                            borderRadius: '0',
                            cursor: 'pointer',
                            minWidth: '60px',
                            textAlign: 'center'
                          }}
                        >
                          {del.status === 'Present' ? 'P' : (del.status === 'Present and Voting' ? 'P&V' : (del.status === 'Absent' ? 'A' : '-'))}
                        </button>
                      </td>
                      <td style={{ padding: '1.5rem 1rem', textAlign: 'right' }}>
                        <input 
                          type="number" 
                          value={currentPoints}
                          onChange={(e) => handleUpdatePoints(del.name, e.target.value)}
                          style={{ 
                            width: '80px', 
                            textAlign: 'right', 
                            fontSize: '1.5rem', 
                            color: 'var(--text-highlight)',
                            borderBottom: '1px solid var(--text-secondary)',
                            padding: '0.25rem 0',
                            background: 'transparent'
                          }}
                        />
                      </td>
                      <td style={{ padding: '1.5rem 1rem', fontSize: '1.25rem', textAlign: 'center' }}>{totalGSLs}</td>
                      <td style={{ padding: '1.5rem 1rem', fontSize: '1.25rem', textAlign: 'center' }}>{totalMods}</td>
                      <td style={{ padding: '1.5rem 1rem', fontSize: '1.25rem', textAlign: 'center' }}>{totalPOIs}</td>
                      <td style={{ padding: '1.5rem 1rem', fontSize: '1.25rem', textAlign: 'center' }}>{totalMotions}</td>
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
