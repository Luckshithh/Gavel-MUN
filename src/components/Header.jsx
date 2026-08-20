import { useState, useEffect } from 'react';
import { listenToDBState } from '../lib/firebase';
import { Gavel, Table } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Header.css';

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
      <div className="metadata meta-tl header-meta-tl">
        <Link to="/" className="header-link" title="Return to Home">
          Gavell <Gavel size={24} className="header-gavel-icon" />
        </Link>
      </div>
      <div className="header-name-wrapper">
        <div className="metadata header-meta-name">
          {formattedName}
        </div>
      </div>

      <div className="metadata meta-tr header-meta-tr">@{munName}</div>

      <div className="metadata meta-bc">
        <button onClick={() => setShowShare(true)} className="header-share-btn">Share Session</button>
      </div>
      <div className="metadata meta-br">
        <button onClick={onOpenLedger} className="header-ledger-btn" title="Master Ledger">
          <Table size={24} />
        </button>
      </div>

      {showShare && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowShare(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowShare(false)}>Close (X)</button>
            <h3 className="header-share-title">Share Access</h3>
            <input
              type="text"
              readOnly
              value={`${window.location.origin}/dashboard/${committeeId}`}
              className="header-share-input"
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
