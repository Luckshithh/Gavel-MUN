import { useState, useEffect } from 'react';
import { listenToDBState } from '../lib/firebase';
import { Gavel } from 'lucide-react';

export default function Header({ committeeId, onOpenLedger }) {
  const [showShare, setShowShare] = useState(false);
  const [munName, setMunName] = useState('2026');
  const formattedName = decodeURIComponent(committeeId).toUpperCase().replace(/-/g, ' ');

  useEffect(() => {
    const unsub = listenToDBState(committeeId, 'munName', (data) => {
      if (data) setMunName(data);
    });
    return () => unsub();
  }, [committeeId]);

  return (
    <>
      <div className="metadata meta-tl flex items-center gap-2" style={{ fontSize: '1.25rem' }}>
        Gavel <Gavel size={24} style={{ transform: 'scaleX(-1)' }} />
      </div>
      <div style={{ position: 'sticky', left: 0, width: '100vw', height: 0, overflow: 'visible', zIndex: 50 }}>
        <div className="metadata" style={{ top: '2rem', left: '50%', transform: 'translateX(-50%)', position: 'absolute', letterSpacing: '0.2em', fontSize: '1.25rem' }}>
          {formattedName}
        </div>
      </div>
      
      <div className="metadata meta-tr" style={{ fontSize: '1.25rem' }}>@{munName}</div>
      
      <div className="metadata meta-bl">Ver 1.0</div>
      
      <div style={{ position: 'sticky', left: 0, width: '100vw', height: 0, overflow: 'visible', zIndex: 50 }}>
        <div className="metadata" style={{ bottom: '2rem', left: '50%', transform: 'translateX(-50%)', position: 'absolute' }}>
          <button onClick={() => setShowShare(true)} style={{ fontStyle: 'italic', fontSize: '1rem', textTransform: 'none' }}>Share Session</button>
        </div>
      </div>
      <div className="metadata meta-br">
        <button onClick={onOpenLedger} style={{ fontStyle: 'italic', fontSize: '1rem', textTransform: 'none' }}>Master Ledger</button>
      </div>

      {showShare && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowShare(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowShare(false)}>Close (X)</button>
            <h3 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Share Access</h3>
            <input 
              type="text" 
              readOnly 
              value={`${window.location.origin}/dashboard/${committeeId}`} 
              style={{ fontSize: '1.5rem', marginBottom: '2rem' }}
            />
            <button 
              className="button-large" 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/dashboard/${committeeId}`);
                setShowShare(false);
              }}>
              Copy to clipboard
            </button>
          </div>
        </div>
      )}
    </>
  );
}
