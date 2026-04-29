import { useState, useEffect } from 'react';
import { isMuted, setMuted, unlockAudio } from '../lib/sound.js';

export default function MuteToggle() {
  const [muted, setLocal] = useState(isMuted());

  useEffect(() => { unlockAudio(); }, []);

  function toggle() {
    const next = !muted;
    setMuted(next);
    setLocal(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={muted ? 'Unmute' : 'Mute'}
      className={`fixed bottom-4 right-4 z-50 px-3 h-10 rounded-lg border backdrop-blur-sm font-display text-xs tracking-[0.25em] transition-colors ${
        muted
          ? 'bg-burnt-orange/15 border-burnt-orange/40 text-burnt-orange hover:bg-burnt-orange/25'
          : 'bg-leaf/15 border-leaf/40 text-leaf hover:bg-leaf/25'
      }`}
      title={muted ? 'Sound off — click to unmute' : 'Sound on — click to mute'}
    >
      {muted ? 'SOUND OFF' : 'SOUND ON'}
    </button>
  );
}
