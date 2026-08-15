import { useState, useEffect, useRef } from 'react';
import { listenToDBState, syncStateToDB } from '../lib/firebase';

export default function Timer({ resetTrigger, committeeId }) {
  // DB State (The ultimate source of truth across all devices)
  const [timerState, setTimerState] = useState({
    isActive: false,
    timeLeft: 0,
    endTime: null,
    inputTime: 60
  });

  // Local Display State (Tick down 60fps locally based on the DB target)
  const [displayTime, setDisplayTime] = useState(0);

  // We use refs to avoid infinite re-renders or stale closures during syncs
  const timerStateRef = useRef(timerState);
  const lastBeepedEndTime = useRef(null);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  // 1. Listen to the global Timer State
  useEffect(() => {
    const unsub = listenToDBState(committeeId, 'timerState', (data) => {
      if (data) setTimerState(data);
    });
    return () => unsub();
  }, [committeeId]);

  const playBeep = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioCtx = new AudioContext();
    
    let time = audioCtx.currentTime;
    for (let i = 0; i < 3; i++) {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, time); // A5 note
      
      gainNode.gain.setValueAtTime(0.8, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start(time);
      oscillator.stop(time + 0.15);
      
      time += 0.25; 
    }
  };

  // 2. Compute the display time locally at high frequency
  useEffect(() => {
    let interval = null;
    if (timerState.isActive && timerState.endTime) {
      interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((timerState.endTime - Date.now()) / 1000));
        setDisplayTime(remaining);
        
        // Auto-pause if time expires
        if (remaining === 0) {
          clearInterval(interval);
          if (lastBeepedEndTime.current !== timerState.endTime) {
            lastBeepedEndTime.current = timerState.endTime;
            playBeep();
          }
        }
      }, 100);
    } else {
      setDisplayTime(timerState.timeLeft);
    }
    return () => clearInterval(interval);
  }, [timerState]);


  // 4. Handle global speaker reset (when a new Speaker is assigned)
  useEffect(() => {
    if (resetTrigger > 0) {
      const currentInput = timerStateRef.current.inputTime;
      const newState = { isActive: false, timeLeft: currentInput, endTime: null, inputTime: currentInput };
      syncStateToDB(committeeId, 'timerState', newState);
    }
  }, [resetTrigger, committeeId]);

  // 5. User UI Interactions (Push directly to global DB)
  const toggle = () => {
    const current = timerStateRef.current;
    if (current.isActive) {
      // Pause
      const newState = { ...current, isActive: false, timeLeft: displayTime, endTime: null };
      syncStateToDB(committeeId, 'timerState', newState);
    } else {
      // Start
      if (current.timeLeft > 0) {
        const newState = { ...current, isActive: true, endTime: Date.now() + (current.timeLeft * 1000) };
        syncStateToDB(committeeId, 'timerState', newState);
      }
    }
  };

  const reset = () => {
    const current = timerStateRef.current;
    const newState = { ...current, isActive: false, timeLeft: current.inputTime, endTime: null };
    syncStateToDB(committeeId, 'timerState', newState);
  };

  const setCustomTime = (seconds) => {
    const newState = { isActive: false, timeLeft: seconds, endTime: null, inputTime: seconds };
    syncStateToDB(committeeId, 'timerState', newState);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(customInputValue, 10);
    if (!isNaN(val) && val > 0) {
      setCustomTime(val);
      setShowCustomInput(false);
      setCustomInputValue('');
    }
  };

  return (
    <div className="hero-section">
      <h1 className="display-text animate-fade-in" style={{ color: displayTime <= 10 && displayTime > 0 ? 'var(--accent-dark)' : 'var(--accent-light)' }}>
        {formatTime(displayTime)}
      </h1>
      
      <div className="flex items-center gap-8 animate-fade-in" style={{ marginTop: '2rem', zIndex: 30 }}>
        <button onClick={toggle} className="button-large">
          {timerState.isActive ? 'Pause' : 'Start'}
        </button>
        <button onClick={reset} className="button-large">
          Reset
        </button>
      </div>

      <div className="flex items-center gap-8 animate-fade-in" style={{ marginTop: '3rem', zIndex: 30, color: 'var(--text-secondary)' }}>
        <button onClick={() => setCustomTime(30)}>30s</button>
        <button onClick={() => setCustomTime(60)}>60s</button>
        <button onClick={() => setCustomTime(90)}>90s</button>
        {showCustomInput ? (
          <form onSubmit={handleCustomSubmit} className="flex gap-2 items-center" style={{ margin: 0 }}>
            <input 
              type="number" 
              value={customInputValue} 
              onChange={e => setCustomInputValue(e.target.value)} 
              placeholder="Secs" 
              autoFocus
              onBlur={() => setShowCustomInput(false)}
              style={{ width: '60px', padding: '0.25rem', fontSize: '1rem', background: 'transparent', borderBottom: '1px solid var(--text-secondary)', textAlign: 'center' }} 
            />
          </form>
        ) : (
          <button onClick={() => setShowCustomInput(true)}>Custom</button>
        )}
      </div>
    </div>
  );
}
