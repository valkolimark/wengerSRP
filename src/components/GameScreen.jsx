import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import CustomerPane from './CustomerPane.jsx';
import ScorecardPane from './ScorecardPane.jsx';

export default function GameScreen({ session, onEndRound, onAbort }) {
  const { scenario, customerName, repName, roundSeconds } = session;
  const [checks, setChecks] = useState({});
  const [paused, setPaused] = useState(false);
  const [roundEpoch, setRoundEpoch] = useState(0);
  const remainingRef = useRef(roundSeconds);

  function toggle(area, idx, value) {
    setChecks((prev) => {
      const next = { ...prev, [area]: { ...(prev[area] || {}), [idx]: value } };
      return next;
    });
  }

  function reset() {
    if (!confirm('Reset the round? This clears all checks and restarts the timer.')) return;
    setChecks({});
    setPaused(false);
    remainingRef.current = roundSeconds;
    setRoundEpoch((e) => e + 1);
  }

  function end() {
    onEndRound({
      checks,
      timeRemaining: remainingRef.current,
      ended: true,
    });
  }

  function expire() {
    onEndRound({
      checks,
      timeRemaining: 0,
      ended: true,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="h-screen w-screen relative overflow-hidden flex"
    >
      <div className="basis-2/5 max-w-[40%] min-w-[320px] h-full">
        <CustomerPane scenario={scenario} customerName={customerName} />
      </div>
      <div className="flex-1 h-full relative">
        <ScorecardPane
          scenario={scenario}
          checks={checks}
          onToggle={toggle}
          roundSeconds={roundSeconds}
          roundEpoch={roundEpoch}
          paused={paused}
          onPause={() => setPaused((p) => !p)}
          onReset={reset}
          onEnd={end}
          onExpire={expire}
          onTimeTick={(r) => { remainingRef.current = r; }}
          repName={repName}
        />
      </div>
    </motion.div>
  );
}
