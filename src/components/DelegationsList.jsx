import { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import { syncStateToDB, listenToDBState } from '../lib/firebase';
import AutocompleteDropdown from './AutocompleteDropdown';

export default function DelegationsList({ activeCaucus, endCaucus, onSpeakerAssigned, committeeId, statePrefix = '' }) {
  const [delegations, setDelegations] = useState([]);
  const [newDelegation, setNewDelegation] = useState('');
  
  const [speakerSlots, setSpeakerSlots] = useState({});
  const [activeSlotIndex, setActiveSlotIndex] = useState(null);
  const [scores, setScores] = useState({});
  const [pois, setPois] = useState({});

  // Editing / Adding States
  const [editingSpeaker, setEditingSpeaker] = useState(null);
  const [editingPOI, setEditingPOI] = useState(null);
  const [addingPOI, setAddingPOI] = useState(null);

  // Permanent Stats Archiving State
  const [ledger, setLedger] = useState({});
  const [poiCount, setPoiCount] = useState({});
  const [modCount, setModCount] = useState({});
  const [gslCount, setGslCount] = useState({});

  useEffect(() => {
    const unsubDel = listenToDBState(committeeId, 'delegations', (data) => {
      setDelegations(data || []);
    });
    const unsubSlots = listenToDBState(committeeId, `${statePrefix}speakerSlots`, (data) => setSpeakerSlots(data || {}));
    const unsubActive = listenToDBState(committeeId, `${statePrefix}activeSlotIndex`, (data) => setActiveSlotIndex(data !== null ? data : null));
    const unsubScores = listenToDBState(committeeId, `${statePrefix}scores`, (data) => setScores(data || {}));
    const unsubPois = listenToDBState(committeeId, `${statePrefix}pois`, (data) => setPois(data || {}));
    
    // Listeners for archiving stats
    const unsubLedger = listenToDBState(committeeId, 'ledger', (data) => setLedger(data || {}));
    const unsubPoiCount = listenToDBState(committeeId, 'poiCount', (data) => setPoiCount(data || {}));
    const unsubModCount = listenToDBState(committeeId, 'modCount', (data) => setModCount(data || {}));
    const unsubGslCount = listenToDBState(committeeId, 'gslCount', (data) => setGslCount(data || {}));

    return () => {
      unsubDel(); unsubSlots(); unsubActive(); unsubScores(); unsubPois();
      unsubLedger(); unsubPoiCount(); unsubModCount(); unsubGslCount();
    };
  }, [committeeId, statePrefix]);

  const isModCaucus = activeCaucus && activeCaucus.type === 'mod';
  const isGslCaucus = activeCaucus && activeCaucus.type === 'gsl';
  const isUnmodCaucus = activeCaucus && activeCaucus.type === 'unmod';
  const isListCaucus = isModCaucus || isGslCaucus;

  const populateGslSlots = () => {
    const safeDelegations = Array.isArray(delegations) ? delegations : Object.values(delegations || {});
    const sorted = [...safeDelegations]
      .filter(d => d && d.status !== 'Absent')
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    const newSlots = {};
    sorted.forEach((del, i) => {
      newSlots[i] = del.name;
    });
    
    setSpeakerSlots(newSlots);
    syncStateToDB(committeeId, `${statePrefix}speakerSlots`, newSlots);
  };

  useEffect(() => {
    if (isGslCaucus && !activeCaucus.slotsPopulated && delegations && (Array.isArray(delegations) ? delegations.length : Object.keys(delegations).length) > 0) {
      populateGslSlots();
      syncStateToDB(committeeId, 'activeGsl', { ...activeCaucus, slotsPopulated: true });
    }
  }, [activeCaucus, delegations, isGslCaucus]);

  const addDelegation = (e) => {
    e.preventDefault();
    if (newDelegation.trim()) {
      const updated = [...delegations, { id: Date.now(), name: newDelegation.trim(), status: '-' }];
      setDelegations(updated);
      syncStateToDB(committeeId, 'delegations', updated);
      setNewDelegation('');
    }
  };

  const removeDelegation = (id) => {
    const updated = delegations.filter(d => d.id !== id);
    setDelegations(updated);
    syncStateToDB(committeeId, 'delegations', updated);
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

  const assignSlot = (index) => {
    setEditingSpeaker({ index, name: '' });
  };

  const saveEditedSpeaker = () => {
    if (editingSpeaker && editingSpeaker.name) {
      const updated = { ...speakerSlots, [editingSpeaker.index]: editingSpeaker.name };
      setSpeakerSlots(updated);
      syncStateToDB(committeeId, `${statePrefix}speakerSlots`, updated);
    }
    setEditingSpeaker(null);
  };

  const handleActivateSpeaker = (index) => {
    setActiveSlotIndex(index);
    syncStateToDB(committeeId, `${statePrefix}activeSlotIndex`, index);
    if (onSpeakerAssigned) onSpeakerAssigned(); 
  };

  const handleScoreChange = (index, field, val) => {
    const updated = { ...scores, [index]: { ...(scores[index] || {}), [field]: val } };
    setScores(updated);
    syncStateToDB(committeeId, `${statePrefix}scores`, updated);
  };

  const saveNewPOI = () => {
    if (addingPOI && addingPOI.delegation) {
      const newPoints = parseInt(addingPOI.points, 10);
      if (isNaN(newPoints)) {
        alert("Points must be a valid integer.");
        return;
      }
      const slotIndex = addingPOI.slotIndex;
      const updated = { ...pois, [slotIndex]: [...(pois[slotIndex] || []), { delegation: addingPOI.delegation, points: newPoints }] };
      setPois(updated);
      syncStateToDB(committeeId, `${statePrefix}pois`, updated);
    }
    setAddingPOI(null);
  };

  const saveEditedPOI = () => {
    if (editingPOI && editingPOI.delegation.trim()) {
      const slotIndex = editingPOI.slotIndex;
      const poiIndex = editingPOI.poiIndex;
      
      const newPoints = parseInt(editingPOI.points, 10);
      if (isNaN(newPoints)) {
        alert("Points must be a valid integer.");
        return;
      }
      
      const currentList = [...(pois[slotIndex] || [])];
      currentList[poiIndex] = { delegation: editingPOI.delegation.trim(), points: newPoints };
      
      const updated = { ...pois, [slotIndex]: currentList };
      setPois(updated);
      syncStateToDB(committeeId, `${statePrefix}pois`, updated);
    }
    setEditingPOI(null);
  };

  const archiveCurrentScores = () => {
    let newLedger = { ...ledger };
    let newPoiCount = { ...poiCount };
    let newModCount = { ...modCount };
    let newGslCount = { ...gslCount };

    // Tally speaker scores & mod/gsl participation
    Object.keys(scores).forEach(slotIndex => {
      const country = speakerSlots[slotIndex];
      if (country) {
        if (isGslCaucus) {
          newGslCount[country] = (newGslCount[country] || 0) + 1;
        } else if (isModCaucus) {
          newModCount[country] = (newModCount[country] || 0) + 1;
        }
        
        const score = scores[slotIndex]?.sub;
        if (score !== undefined && score !== '') {
          const parsed = parseInt(score, 10);
          if (!isNaN(parsed)) newLedger[country] = (newLedger[country] || 0) + parsed;
        }
      }
    });

    // Tally POIs
    Object.values(pois).forEach(poiList => {
      poiList.forEach(poi => {
        const country = poi.delegation;
        if (country) {
          newPoiCount[country] = (newPoiCount[country] || 0) + 1;
          const pts = poi.points;
          if (pts !== undefined && pts !== '') {
            const parsed = parseInt(pts, 10);
            if (!isNaN(parsed)) newLedger[country] = (newLedger[country] || 0) + parsed;
          }
        }
      });
    });

    syncStateToDB(committeeId, 'ledger', newLedger);
    syncStateToDB(committeeId, 'poiCount', newPoiCount);
    syncStateToDB(committeeId, 'modCount', newModCount);
    syncStateToDB(committeeId, 'gslCount', newGslCount);
  };

  const handleEndCaucusArchiving = () => {
    archiveCurrentScores();
    setSpeakerSlots({}); syncStateToDB(committeeId, `${statePrefix}speakerSlots`, null);
    setActiveSlotIndex(null); syncStateToDB(committeeId, `${statePrefix}activeSlotIndex`, null);
    setScores({}); syncStateToDB(committeeId, `${statePrefix}scores`, null);
    setPois({}); syncStateToDB(committeeId, `${statePrefix}pois`, null);
    endCaucus();
  };

  const handleNextGslCycle = () => {
    archiveCurrentScores();
    setScores({}); syncStateToDB(committeeId, `${statePrefix}scores`, null);
    setPois({}); syncStateToDB(committeeId, `${statePrefix}pois`, null);
    setActiveSlotIndex(null); syncStateToDB(committeeId, `${statePrefix}activeSlotIndex`, null);
    
    const nextCycle = (activeCaucus.cycle || 1) + 1;
    syncStateToDB(committeeId, 'activeGsl', { ...activeCaucus, cycle: nextCycle, slotsPopulated: false });
  };

  // Determine list length
  const listLength = isGslCaucus ? Object.keys(speakerSlots).length : (activeCaucus?.slots || 0);

  return (
    <div>
      <div className="flex justify-between items-baseline" style={{ marginBottom: '2rem' }}>
        <span className="section-title">
          {isModCaucus ? `Moderated Caucus: ${activeCaucus.topic || 'General'} / ${activeSlotIndex !== null ? activeSlotIndex : 0}/${activeCaucus.slots} Delegates Finished` : 
           isGslCaucus ? `General Speakers List / ${activeSlotIndex !== null ? activeSlotIndex : 0}/${Object.keys(speakerSlots).length} Delegates Finished` : 
           isUnmodCaucus ? `Unmoderated Caucus: ${activeCaucus.topic || 'General'} / ${activeCaucus.totalTime} mins` :
           ''}
        </span>
        <div className="flex gap-4">
          {(isModCaucus || isUnmodCaucus) && (
            <button onClick={isUnmodCaucus ? endCaucus : handleEndCaucusArchiving} className="button-large" style={{ color: 'var(--accent-dark)' }}>
              End Caucus
            </button>
          )}
        </div>
      </div>

      {isListCaucus ? (
        <>
          <div className="text-list">
          {isModCaucus && (
            <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Topic: {activeCaucus.topic}
            </p>
          )}
          {Array.from({ length: listLength }).map((_, i) => {
            const isAssigned = !!speakerSlots[i];
            const isActive = activeSlotIndex === i;
            
            return (
              <div key={i} className="text-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottomStyle: isActive ? 'solid' : 'dashed', paddingBottom: '1.5rem' }}>
                <div className="flex justify-between items-baseline" style={{ width: '100%' }}>
                  
                  <div className="flex items-center gap-4">
                    <span style={{ fontSize: isActive ? '2rem' : '1.25rem', color: isAssigned ? (isActive ? 'var(--text-highlight)' : 'inherit') : 'var(--text-secondary)', transition: 'all 0.3s ease' }}>
                      {i + 1}. {speakerSlots[i] || 'Empty Slot'}
                    </span>
                    {isAssigned && isModCaucus && (
                      <button onClick={() => setEditingSpeaker({ index: i, name: speakerSlots[i] })} style={{ color: 'var(--text-secondary)', padding: '0.25rem' }}>
                        <Edit2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  {isAssigned && !isActive && (
                    <button onClick={() => handleActivateSpeaker(i)}>Select Speaker</button>
                  )}
                  {!isAssigned && isModCaucus && (
                    <button onClick={() => assignSlot(i)}>Assign</button>
                  )}
                </div>

                {isActive && (
                  <div className="animate-fade-in" style={{ width: '100%', paddingLeft: '2rem', marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    <div className="flex gap-8">
                      <div className="flex flex-col" style={{ flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>Score / Points</span>
                        <input 
                          type="number" 
                          placeholder="Grade" 
                          value={scores[i]?.sub || ''} 
                          onChange={(e) => handleScoreChange(i, 'sub', parseInt(e.target.value, 10) || '')} 
                          style={{ fontSize: '1rem' }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-baseline" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)' }}>Points of Information</span>
                        <button onClick={() => setAddingPOI({ slotIndex: i, delegation: '', points: '' })}>+ Log POI</button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {pois[i] && pois[i].length > 0 ? (
                          pois[i].map((poi, idx) => (
                            <div key={idx} className="flex justify-between items-center">
                              <div className="flex gap-4 items-center">
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{idx + 1}.</span>
                                <span style={{ fontSize: '1.25rem' }}>{poi.delegation}</span>
                                <button onClick={() => setEditingPOI({ slotIndex: i, poiIndex: idx, delegation: poi.delegation, points: poi.points })} style={{ color: 'var(--text-secondary)', padding: '0.25rem' }}>
                                  <Edit2 size={14} />
                                </button>
                              </div>
                              <span style={{ fontSize: '1rem', color: 'var(--text-highlight)' }}>+{poi.points} pts</span>
                            </div>
                          ))
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>No POIs logged for this speaker.</span>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
        {isGslCaucus && (
          <div className="flex justify-between items-center" style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '1.25rem', color: 'var(--text-highlight)' }}>
              Current Cycle: {activeCaucus.cycle || 1}
            </span>
            <div className="flex gap-4">
              <button onClick={handleNextGslCycle} className="button-large" style={{ color: 'var(--text-highlight)' }}>
                Next Cycle
              </button>
              <button onClick={handleEndCaucusArchiving} className="button-large" style={{ color: 'var(--accent-dark)' }}>
                End GSL
              </button>
            </div>
          </div>
        )}
        </>
      ) : isUnmodCaucus ? (
        <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: '2rem' }}>
          Unmoderated caucus is in session. 
        </div>
      ) : null}

      {/* Modals for Editing & Adding */}
      {editingSpeaker && (
        <div className="modal-overlay animate-fade-in" onClick={() => setEditingSpeaker(null)} style={{ zIndex: 150 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-section)', padding: '4rem' }}>
            <button className="modal-close" onClick={() => setEditingSpeaker(null)}>Close (X)</button>
            <h3 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Assign Speaker</h3>
            <AutocompleteDropdown 
              options={delegations.map(d => d.name)} 
              value={editingSpeaker.name} 
              onChange={name => setEditingSpeaker({ ...editingSpeaker, name })}
              placeholder="Search Delegation..."
            />
            <button className="button-large" onClick={saveEditedSpeaker} style={{ marginTop: '1rem' }}>Save Changes</button>
          </div>
        </div>
      )}

      {addingPOI && (
        <div className="modal-overlay animate-fade-in" onClick={() => setAddingPOI(null)} style={{ zIndex: 150 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-section)', padding: '4rem' }}>
            <button className="modal-close" onClick={() => setAddingPOI(null)}>Close (X)</button>
            <h3 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Log POI</h3>
            <AutocompleteDropdown 
              options={delegations.map(d => d.name)} 
              value={addingPOI.delegation} 
              onChange={delegation => setAddingPOI({ ...addingPOI, delegation })}
              placeholder="Search Delegation..."
            />
            <input 
              type="number" 
              placeholder="Points"
              value={addingPOI.points} 
              onChange={e => setAddingPOI({ ...addingPOI, points: e.target.value })}
              style={{ fontSize: '1.5rem', marginBottom: '2rem' }}
            />
            <button className="button-large" onClick={saveNewPOI}>Save Changes</button>
          </div>
        </div>
      )}

      {editingPOI && (
        <div className="modal-overlay animate-fade-in" onClick={() => setEditingPOI(null)} style={{ zIndex: 150 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-section)', padding: '4rem' }}>
            <button className="modal-close" onClick={() => setEditingPOI(null)}>Close (X)</button>
            <h3 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Edit POI</h3>
            <AutocompleteDropdown 
              options={delegations.map(d => d.name)} 
              value={editingPOI.delegation} 
              onChange={delegation => setEditingPOI({ ...editingPOI, delegation })}
              placeholder="Search Delegation..."
            />
            <input 
              type="number" 
              placeholder="Points"
              value={editingPOI.points} 
              onChange={e => setEditingPOI({ ...editingPOI, points: e.target.value })}
              style={{ fontSize: '1.5rem', marginBottom: '2rem' }}
            />
            <button className="button-large" onClick={saveEditedPOI}>Save Changes</button>
          </div>
        </div>
      )}

    </div>
  );
}
