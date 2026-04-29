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
      className="fixed top-4 right-4 z-50 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-xl backdrop-blur-sm"
      title={muted ? 'Sound off — click to unmute' : 'Sound on — click to mute'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  );
}
