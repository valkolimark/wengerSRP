import { useEffect, useRef, useState } from 'react';
import { play } from '../lib/sound.js';

function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Timer({ totalSeconds, paused, onExpire, onTick }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  const onTickRef = useRef(onTick);

  // Always call the LATEST callbacks from the interval — otherwise the interval
  // closes over the first render's checks/notes and scoring sees an empty board.
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  // Reset when totalSeconds changes (new round)
  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) return;

    const id = setInterval(() => {
      setRemaining((r) => {
        const next = r - 1;
        if (next <= 0) {
          clearInterval(id);
          play('buzzer');
          setTimeout(() => onExpireRef.current?.(), 100);
          return 0;
        }
        if (next <= 10 && next > 0) play('tick');
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [paused, remaining > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Surface remaining to parent for speed bonus
  useEffect(() => {
    onTickRef.current?.(remaining);
  }, [remaining]);

  const isWarning = remaining <= 60 && remaining > 30;
  const isCritical = remaining <= 30;

  return (
    <div
      className={`font-mono tabular-nums text-6xl md:text-7xl font-bold tracking-tight leading-none ${
        isCritical ? 'text-danger animate-timerPulse' :
        isWarning ? 'text-warning' :
        'text-cyan'
      }`}
    >
      {fmt(remaining)}
    </div>
  );
}
