import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import Timer from '../components/Timer';
import DelegationsList from '../components/DelegationsList';
import CaucusManager from '../components/CaucusManager';
import MotionsList from '../components/MotionsList';
import PointsLedger from '../components/PointsLedger';
import { syncStateToDB, listenToDBState } from '../lib/firebase';

export default function Dashboard() {
  const { committeeId } = useParams();
  const [activeGsl, setActiveGsl] = useState(null);
  const [activeSubCaucus, setActiveSubCaucus] = useState(null);
  
  const [timerResetTrigger, setTimerResetTrigger] = useState(0);
  
  const [showLedger, setShowLedger] = useState(false);

  useEffect(() => {
    const unsubGsl = listenToDBState(committeeId, 'activeGsl', (data) => setActiveGsl(data || null));
    const unsubSub = listenToDBState(committeeId, 'activeSubCaucus', (data) => setActiveSubCaucus(data || null));
    
    return () => {
      unsubGsl();
      unsubSub();
    };
  }, [committeeId]);

  const handleStartCaucus = (caucusData) => {
    if (caucusData.type === 'gsl') {
      setActiveGsl(caucusData);
      syncStateToDB(committeeId, 'activeGsl', caucusData);
    } else {
      setActiveSubCaucus(caucusData);
      syncStateToDB(committeeId, 'activeSubCaucus', caucusData);
    }

    if ((caucusData.type === 'mod' || caucusData.type === 'gsl') && caucusData.speakerTime) {
      const t = parseInt(caucusData.speakerTime, 10);
      syncStateToDB(committeeId, 'timerState', { isActive: false, timeLeft: t, endTime: null, inputTime: t });
    } else if (caucusData.type === 'unmod' && caucusData.totalTime) {
      const t = Math.floor(parseFloat(caucusData.totalTime) * 60);
      syncStateToDB(committeeId, 'timerState', { isActive: true, timeLeft: t, endTime: Date.now() + (t * 1000), inputTime: t });
    }
  };

  const handleEndCaucus = (type) => {
    if (type === 'gsl') {
      setActiveGsl(null);
      syncStateToDB(committeeId, 'activeGsl', null);
    } else {
      setActiveSubCaucus(null);
      syncStateToDB(committeeId, 'activeSubCaucus', null);
      
      // When a sub-caucus ends, if a GSL is suspended in the background, reset timer to the GSL speaker time
      if (activeGsl && activeGsl.speakerTime) {
        const t = parseInt(activeGsl.speakerTime, 10);
        syncStateToDB(committeeId, 'timerState', { isActive: false, timeLeft: t, endTime: null, inputTime: t });
      }
    }
  };

  // Determine foreground caucus
  const activeForeground = activeSubCaucus || activeGsl;
  const statePrefix = activeSubCaucus ? 'mod_' : (activeGsl ? 'gsl_' : '');
  
  const isForegroundList = activeForeground && (activeForeground.type === 'mod' || activeForeground.type === 'gsl');

  return (
    <div className="app-container">
      <Header committeeId={committeeId} onOpenLedger={() => setShowLedger(true)} />
      
      <Timer resetTrigger={timerResetTrigger} committeeId={committeeId} />
      
      <div className="manuscript-section">
        {/* Hide CaucusManager if a Mod/Unmod is currently running, to prevent starting a 3rd concurrent caucus */}
        {!activeSubCaucus && (
           <CaucusManager activeForeground={activeForeground} onStartCaucus={handleStartCaucus} />
        )}
        
        {/* Dynamic Reordering based on Caucus state */}
        {isForegroundList ? (
          <>
            <DelegationsList 
              activeCaucus={activeForeground} 
              endCaucus={() => handleEndCaucus(activeForeground.type)} 
              onSpeakerAssigned={() => setTimerResetTrigger(prev => prev + 1)} 
              committeeId={committeeId}
              statePrefix={statePrefix}
            />
            <MotionsList committeeId={committeeId} />
          </>
        ) : (
          <>
            <MotionsList committeeId={committeeId} />
            {activeForeground?.type === 'unmod' && (
              <DelegationsList 
                activeCaucus={activeForeground} 
                endCaucus={() => handleEndCaucus(activeForeground?.type)} 
                onSpeakerAssigned={() => setTimerResetTrigger(prev => prev + 1)} 
                committeeId={committeeId}
                statePrefix={statePrefix}
              />
            )}
          </>
        )}
      </div>
      
      {/* Spacer to allow scrolling past the manuscript */}
      <div style={{ height: '20vh' }}></div>

      {showLedger && <PointsLedger committeeId={committeeId} onClose={() => setShowLedger(false)} />}
    </div>
  );
}
