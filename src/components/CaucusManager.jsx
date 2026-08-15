import { useState } from 'react';

export default function CaucusManager({ onStartCaucus, activeForeground }) {
  const [activeTab, setActiveTab] = useState(activeForeground?.type === 'gsl' ? 'mod' : 'gsl'); 
  const [topic, setTopic] = useState('');
  const [totalTime, setTotalTime] = useState('');
  const [speakerTime, setSpeakerTime] = useState('');

  const handleStart = (e) => {
    e.preventDefault();
    if (activeTab === 'gsl' && speakerTime) {
      onStartCaucus({ type: 'gsl', speakerTime, cycle: 1 });
    } else if (activeTab === 'mod' && totalTime && speakerTime) {
      const slots = Math.floor((parseFloat(totalTime) * 60) / parseFloat(speakerTime));
      onStartCaucus({ type: 'mod', topic, totalTime, speakerTime, slots });
    } else if (activeTab === 'unmod' && totalTime) {
      onStartCaucus({ type: 'unmod', topic, totalTime });
    }
  };

  if (activeForeground && activeForeground.type !== 'gsl') {
    return null; // Hide the manager while a Mod or Unmod is active
  }

  return (
    <div>
      <div className="flex gap-8" style={{ marginBottom: '4rem' }}>
        {(!activeForeground || activeForeground.type !== 'gsl') && (
          <button 
            onClick={() => setActiveTab('gsl')}
            style={{ color: activeTab === 'gsl' ? 'var(--text-highlight)' : 'var(--text-secondary)' }}
            className="button-large"
          >
            General Speakers List
          </button>
        )}
        <button 
          onClick={() => setActiveTab('mod')}
          style={{ color: activeTab === 'mod' ? 'var(--text-highlight)' : 'var(--text-secondary)' }}
          className="button-large"
        >
          Moderated
        </button>
        <button 
          onClick={() => setActiveTab('unmod')}
          style={{ color: activeTab === 'unmod' ? 'var(--text-highlight)' : 'var(--text-secondary)' }}
          className="button-large"
        >
          Unmoderated
        </button>
      </div>

      <form onSubmit={handleStart} className="animate-fade-in flex flex-col gap-8">
        {activeTab === 'gsl' ? (
          <>
            <input type="number" placeholder="Fixed Speaker Time (secs)" value={speakerTime} onChange={e => setSpeakerTime(e.target.value)} required min="1" />
          </>
        ) : activeTab === 'mod' ? (
          <>
            <input type="text" placeholder="Topic" value={topic} onChange={e => setTopic(e.target.value)} required />
            <div className="flex gap-8">
              <input type="number" placeholder="Total Time (mins)" value={totalTime} onChange={e => setTotalTime(e.target.value)} required min="0.1" step="0.1" />
              <input type="number" placeholder="Speaker Time (secs)" value={speakerTime} onChange={e => setSpeakerTime(e.target.value)} required min="1" />
            </div>
          </>
        ) : (
          <>
            <input type="text" placeholder="Purpose" value={topic} onChange={e => setTopic(e.target.value)} />
            <input type="number" placeholder="Total Time (mins)" value={totalTime} onChange={e => setTotalTime(e.target.value)} required min="0.1" step="0.1" />
          </>
        )}
        <button type="submit" style={{ alignSelf: 'flex-start', marginTop: '2rem' }}>Start</button>
      </form>
    </div>
  );
}
