import { useState, useEffect } from 'react';
import { listenToDBState } from '../lib/firebase';
import { Gavel, Table } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Header({ committeeId, onOpenLedger }) {
  const [showShare, setShowShare] = useState(false);
  const [munName, setMunName] = useState('2026');
  const formattedName = decodeURIComponent(committeeId).replace(/-[a-zA-Z0-9]{4}$/, '').toUpperCase().replace(/-/g, ' ');

  useEffect(() => {
    const unsub = listenToDBState(committeeId, 'munName', (data) => {
      if (data) setMunName(data);
    });
    return () => unsub();
  }, [committeeId]);

  return (
    <>
      <div className="metadata meta-tl" style={{ fontSize: '1.25rem' }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }} title="Return to Home">
          Gavell <Gavel size={24} style={{ transform: 'scaleX(-1)' }} />
        </Link>
      </div>
      <div style={{ position: 'sticky', left: 0, width: '100vw', height: 0, overflow: 'visible', zIndex: 50 }}>
        <div className="metadata" style={{ top: '2rem', left: '50%', transform: 'translateX(-50%)', position: 'absolute', letterSpacing: '0.2em', fontSize: '1.25rem' }}>
          {formattedName}
        </div>
      </div>

      <div className="metadata meta-tr" style={{ fontSize: '1.25rem' }}>@{munName}</div>

      <div style={{ position: 'sticky', left: 0, width: '100vw', height: 0, overflow: 'visible', zIndex: 50 }}>
        <div className="metadata" style={{ bottom: '2rem', left: '50%', transform: 'translateX(-50%)', position: 'absolute' }}>
          <button onClick={() => setShowShare(true)} style={{ fontStyle: 'italic', fontSize: '1rem', textTransform: 'none' }}>Share Session</button>
        </div>
      </div>
      <div className="metadata meta-br">
        <button onClick={onOpenLedger} style={{ background: 'transparent', padding: '0.5rem', color: 'var(--text-secondary)' }} title="Master Ledger">
          <Table size={24} />
        </button>
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
