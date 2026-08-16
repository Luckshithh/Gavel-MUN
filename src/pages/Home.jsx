import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gavel, ArrowRight } from 'lucide-react';
import { syncStateToDB } from '../lib/firebase';

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
    <div className="flex flex-col items-center justify-center" style={{ minHeight: '100vh', padding: '2rem' }}>
      
      <div className="metadata flex items-center gap-2" style={{ position: 'absolute', top: '2rem', left: '2rem', fontSize: '1.25rem', letterSpacing: '0.1em' }}>
        Gavell <Gavel size={24} style={{ transform: 'scaleX(-1)' }} />
      </div>

      <div className="card animate-fade-in" style={{ maxWidth: '600px', width: '100%', textAlign: 'center', padding: '4rem 2rem' }}>

        <form onSubmit={handleCreate} className="flex flex-col gap-4" style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Committee Name"
              value={committeeName}
              onChange={(e) => setCommitteeName(e.target.value)}
              required
              style={{ padding: '1rem', fontSize: '1.125rem', textAlign: 'center', marginBottom: '1rem', width: '100%' }}
            />
            <input
              type="text"
              placeholder="MUN Name"
              value={munName}
              onChange={(e) => setMunName(e.target.value)}
              required
              style={{ padding: '1rem', fontSize: '1.125rem', textAlign: 'center', width: '100%' }}
            />
          </div>
          <button type="submit" style={{ padding: '1rem', fontSize: '1.125rem' }}>
            Create Register <ArrowRight size={20} />
          </button>

          {lastSessionId && (
            <button
              type="button"
              onClick={() => navigate(`/dashboard/${lastSessionId}`)}
              style={{ padding: '0.5rem', fontSize: '1rem', marginTop: '1rem', color: 'var(--text-secondary)' }}
            >
              Resume Previous Session ({localStorage.getItem('last_committee_name')})
            </button>
          )}
        </form>
      </div>

    </div>
  );
}
