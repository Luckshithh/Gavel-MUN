import { useState, useEffect } from 'react';
import { syncStateToDB, listenToDBState } from '../lib/firebase';
import AutocompleteDropdown from './AutocompleteDropdown';
import { History, X } from 'lucide-react';
import './MotionsList.css';

export default function MotionsList({ committeeId }) {
  const [motions, setMotions] = useState([]);
  const [delegations, setDelegations] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newMotion, setNewMotion] = useState('');
  const [proposer, setProposer] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const unsubMotions = listenToDBState(committeeId, 'motions', (data) => data && setMotions(data));
    const unsubDel = listenToDBState(committeeId, 'delegations', (data) => setDelegations(data || []));
    return () => {
      unsubMotions();
      unsubDel();
    };
  }, [committeeId]);

  const addMotion = (e) => {
    e.preventDefault();
    if (newMotion.trim() && proposer.trim()) {
      const updated = [{ id: Date.now(), text: newMotion, proposer, status: 'pending' }, ...motions];
      setMotions(updated);
      syncStateToDB(committeeId, 'motions', updated);
      setNewMotion(''); setProposer(''); setShowNew(false);
    }
  };

  const updateStatus = (id, status) => {
    const updated = motions.map(m => m.id === id ? { ...m, status } : m);
    setMotions(updated);
    syncStateToDB(committeeId, 'motions', updated);
  };

  return (
    <div>
      <div className="flex justify-between items-baseline motions-header">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowHistory(true)} className="motions-history-btn" title="Motion History">
            <History size={24} />
          </button>
          <span className="section-title motions-title">Motions / Floor</span>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="button-large">Raise Motion</button>
      </div>

      {showNew && (
        <form onSubmit={addMotion} className="animate-fade-in motions-form">
          <div className="motions-dropdown-wrapper">
            <AutocompleteDropdown 
              options={delegations.map(d => d.name)} 
              value={proposer} 
              onChange={val => setProposer(val)}
              placeholder="Proposing Delegation..."
            />
          </div>
          <input type="text" required value={newMotion} onChange={e => setNewMotion(e.target.value)} placeholder="Motion Details" className="motions-input" />
          <div className="flex gap-8">
            <button type="submit" className="button-large">Submit</button>
            <button type="button" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="text-list">
        {motions.filter(m => m.status === 'pending').map(motion => (
          <div key={motion.id} className="text-list-item motions-item">
            <span className="motions-proposer">Proposed by {motion.proposer}</span>
            <p className="motions-text">
              {motion.text}
            </p>
            
            <div className="flex gap-4">
              <button onClick={() => updateStatus(motion.id, 'passed')}>Pass</button>
              <button onClick={() => updateStatus(motion.id, 'failed')}>Fail</button>
            </div>
          </div>
        ))}
        {motions.filter(m => m.status === 'pending').length === 0 && (
          <span className="motions-empty">No pending motions.</span>
        )}
      </div>

      {showHistory && (
        <div className="modal-overlay animate-fade-in motions-history-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content motions-history-content" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-baseline motions-history-header">
              <span className="section-title">Motion History</span>
              <button onClick={() => setShowHistory(false)} className="motions-history-close"><X size={24} /></button>
            </div>
            <div className="text-list">
              {motions.map(motion => (
                <div key={motion.id} className="text-list-item motions-item">
                  <div className="flex justify-between motions-history-list">
                    <span className="motions-proposer">Proposed by {motion.proposer}</span>
                    <span className={`motions-status motions-status-${motion.status}`}>
                      {motion.status}
                    </span>
                  </div>
                  <p className={`motions-history-text motions-history-text-${motion.status}`}>
                    {motion.text}
                  </p>
                  
                  {motion.status === 'pending' && (
                    <div className="flex gap-4 motions-action-buttons">
                      <button onClick={() => updateStatus(motion.id, 'passed')}>Pass</button>
                      <button onClick={() => updateStatus(motion.id, 'failed')}>Fail</button>
                    </div>
                  )}
                </div>
              ))}
              {motions.length === 0 && (
                <span className="motions-empty">No motions have been raised yet.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
