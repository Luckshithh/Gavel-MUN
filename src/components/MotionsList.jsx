import { useState, useEffect } from 'react';
import { syncStateToDB, listenToDBState } from '../lib/firebase';
import AutocompleteDropdown from './AutocompleteDropdown';
import { History, X } from 'lucide-react';

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
      <div className="flex justify-between items-baseline" style={{ marginBottom: '2rem' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowHistory(true)} style={{ color: 'var(--text-secondary)', padding: '0.5rem', background: 'transparent' }} title="Motion History">
            <History size={24} />
          </button>
          <span className="section-title" style={{ margin: 0 }}>Motions / Floor</span>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="button-large">Raise Motion</button>
      </div>

      {showNew && (
        <form onSubmit={addMotion} className="animate-fade-in" style={{ marginBottom: '4rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <AutocompleteDropdown 
              options={delegations.map(d => d.name)} 
              value={proposer} 
              onChange={val => setProposer(val)}
              placeholder="Proposing Delegation..."
            />
          </div>
          <input type="text" required value={newMotion} onChange={e => setNewMotion(e.target.value)} placeholder="Motion Details" style={{ marginBottom: '2rem' }} />
          <div className="flex gap-8">
            <button type="submit" className="button-large">Submit</button>
            <button type="button" onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="text-list">
        {motions.filter(m => m.status === 'pending').map(motion => (
          <div key={motion.id} className="text-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', paddingBottom: '2rem', gap: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Proposed by {motion.proposer}</span>
            <p style={{ fontSize: '1.5rem', color: 'inherit' }}>
              {motion.text}
            </p>
            
            <div className="flex gap-4">
              <button onClick={() => updateStatus(motion.id, 'passed')}>Pass</button>
              <button onClick={() => updateStatus(motion.id, 'failed')}>Fail</button>
            </div>
          </div>
        ))}
        {motions.filter(m => m.status === 'pending').length === 0 && (
          <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>No pending motions.</span>
        )}
      </div>

      {showHistory && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowHistory(false)} style={{ zIndex: 150 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-section)', padding: '4rem', maxHeight: '80vh', overflowY: 'auto', width: '100%', maxWidth: '800px' }}>
            <div className="flex justify-between items-baseline" style={{ marginBottom: '4rem' }}>
              <span className="section-title">Motion History</span>
              <button onClick={() => setShowHistory(false)} style={{ color: 'var(--text-secondary)', background: 'transparent', padding: '0.5rem' }}><X size={24} /></button>
            </div>
            <div className="text-list">
              {motions.map(motion => (
                <div key={motion.id} className="text-list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', paddingBottom: '2rem', gap: '1rem' }}>
                  <div className="flex justify-between" style={{ width: '100%' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Proposed by {motion.proposer}</span>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: motion.status === 'passed' ? 'var(--text-highlight)' : motion.status === 'failed' ? 'var(--accent-dark)' : 'var(--text-secondary)' }}>
                      {motion.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '1.25rem', color: motion.status === 'passed' ? 'var(--text-highlight)' : motion.status === 'failed' ? 'var(--accent-dark)' : 'inherit' }}>
                    {motion.text}
                  </p>
                  
                  {motion.status === 'pending' && (
                    <div className="flex gap-4" style={{ marginTop: '1rem' }}>
                      <button onClick={() => updateStatus(motion.id, 'passed')}>Pass</button>
                      <button onClick={() => updateStatus(motion.id, 'failed')}>Fail</button>
                    </div>
                  )}
                </div>
              ))}
              {motions.length === 0 && (
                <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>No motions have been raised yet.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
