import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, ArrowRight } from 'lucide-react';
import { syncStateToDB } from '../lib/firebase';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [committeeName, setCommitteeName] = useState(() => {
    return localStorage.getItem('last_committee_name') || '';
  });
  const [munName, setMunName] = useState(() => {
    return localStorage.getItem('last_mun_name') || '';
  });

  const lastSessionId = localStorage.getItem('last_committee_id');

  const handleCreate = (e) => {
    e.preventDefault();
    if (committeeName.trim() && munName.trim()) {
      localStorage.setItem('last_committee_name', committeeName.trim());
      localStorage.setItem('last_mun_name', munName.trim());

      const baseId = committeeName.trim().toLowerCase().replace(/\s+/g, '-');
      const randomHash = Math.random().toString(36).substring(2, 6);
      const id = encodeURIComponent(`${baseId}-${randomHash}`);

      localStorage.setItem('last_committee_id', id);

      syncStateToDB(id, 'munName', munName.trim());

      navigate(`/dashboard/${id}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center home-container">
      
      <div className="metadata flex items-center gap-2 home-metadata">
        Gavell <Gavel size={24} className="home-gavel-icon" />
      </div>

      <div className="card animate-fade-in home-card">

        <form onSubmit={handleCreate} className="flex flex-col gap-4 home-form">
          <div className="input-group">
            <input
              type="text"
              placeholder="Committee Name"
              value={committeeName}
              onChange={(e) => setCommitteeName(e.target.value)}
              required
              className="home-input spaced"
            />
            <input
              type="text"
              placeholder="MUN Name"
              value={munName}
              onChange={(e) => setMunName(e.target.value)}
              required
              className="home-input"
            />
          </div>
          <button type="submit" className="home-button flex items-center justify-center gap-2">
            Create Register <ArrowRight size={20} />
          </button>

          {lastSessionId && (
            <button
              type="button"
              onClick={() => navigate(`/dashboard/${lastSessionId}`)}
              className="home-resume-button"
            >
              Resume Previous Session ({localStorage.getItem('last_committee_name')})
            </button>
          )}
        </form>
      </div>

    </div>
  );
}
