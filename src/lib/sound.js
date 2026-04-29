// Sound engine — synthesizes arcade-y SFX with the Web Audio API.
// If real MP3s are dropped into /public/sounds/<name>.mp3 they take precedence.

const SOUND_FILES = {
  check: '/sounds/check.mp3',
  bonus: '/sounds/bonus.mp3',
  tick: '/sounds/tick.mp3',
  buzzer: '/sounds/buzzer.mp3',
  draw: '/sounds/draw.mp3',
  applause: '/sounds/applause.mp3',
  whoosh: '/sounds/whoosh.mp3',
};

let ctx = null;
let muted = false;
const audioCache = {};
const fileAvailability = {};

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(value) {
  muted = !!value;
}

export function isMuted() {
  return muted;
}

// Try to play an MP3 if present. Returns true if the file plays, false otherwise.
async function tryPlayFile(name) {
  if (fileAvailability[name] === false) return false;
  try {
    if (!audioCache[name]) {
      const audio = new Audio(SOUND_FILES[name]);
      audio.preload = 'auto';
      audioCache[name] = audio;
    }
    const audio = audioCache[name].cloneNode();
    audio.volume = 0.6;
    await audio.play();
    fileAvailability[name] = true;
    return true;
  } catch {
    fileAvailability[name] = false;
    return false;
  }
}

// Synthesized fallbacks — soft, chime-like, easy on the ears.
// Every voice routes through a master lowpass + makeup gain to tame harshness.

let masterChain = null;
function getMaster() {
  const ac = getCtx();
  if (!ac) return null;
  if (!masterChain || masterChain.ctx !== ac) {
    const lowpass = ac.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 4200;
    lowpass.Q.value = 0.4;
    const out = ac.createGain();
    out.gain.value = 0.7;
    lowpass.connect(out).connect(ac.destination);
    masterChain = { ctx: ac, input: lowpass };
  }
  return masterChain.input;
}

// Smooth bell-curve envelope: gentle attack, no abrupt holds, long exponential tail.
function softEnvelope(gain, t0, attack, decay, peak) {
  gain.gain.setValueAtTime(0.00001, t0);
  gain.gain.linearRampToValueAtTime(peak, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.00001, t0 + attack + decay);
}

// Single sine voice with built-in lowpass shaping (rounded chime tone).
function chime({ freq, duration = 0.6, peak = 0.16, delay = 0, slideTo = null, harmonics = true }) {
  const ac = getCtx();
  const dest = getMaster();
  if (!ac || !dest) return;
  const t0 = ac.currentTime + delay;

  // Fundamental
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  const gain = ac.createGain();
  softEnvelope(gain, t0, 0.02, duration, peak);
  osc.connect(gain).connect(dest);
  osc.start(t0);
  osc.stop(t0 + duration + 0.1);

  // Subtle 2nd-harmonic shimmer (gives bell-like color without being harsh)
  if (harmonics) {
    const osc2 = ac.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, t0);
    const gain2 = ac.createGain();
    softEnvelope(gain2, t0, 0.04, duration * 0.7, peak * 0.18);
    osc2.connect(gain2).connect(dest);
    osc2.start(t0);
    osc2.stop(t0 + duration + 0.1);
  }
}

// Filtered noise — used for breath/airy textures (whoosh, applause).
function softNoise({ duration = 0.5, peak = 0.08, delay = 0, filterFreq = 1200, sweepTo = null }) {
  const ac = getCtx();
  const dest = getMaster();
  if (!ac || !dest) return;
  const t0 = ac.currentTime + delay;
  const bufferSize = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  // Pink-ish noise: average a couple random samples for a softer spectrum
  let last = 0;
  for (let i = 0; i < bufferSize; i++) {
    const r = Math.random() * 2 - 1;
    last = last * 0.85 + r * 0.15;
    data[i] = last;
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, t0);
  if (sweepTo != null) filter.frequency.linearRampToValueAtTime(sweepTo, t0 + duration);
  filter.Q.value = 0.6;
  const gain = ac.createGain();
  softEnvelope(gain, t0, 0.08, duration, peak);
  src.connect(filter).connect(gain).connect(dest);
  src.start(t0);
  src.stop(t0 + duration + 0.1);
}

// Pentatonic notes (C major pentatonic, octaves around C5/C6) — always pleasant intervals.
const PENTA = {
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
  C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760.00,
};

const synth = {
  check() {
    // Soft single chime, perfect-fifth above for warmth
    chime({ freq: PENTA.E6, duration: 0.45, peak: 0.10 });
    chime({ freq: PENTA.G6, duration: 0.55, peak: 0.07, delay: 0.02 });
  },
  bonus() {
    // Gentle three-note pentatonic arpeggio — celebratory but soft
    chime({ freq: PENTA.C6, duration: 0.7, peak: 0.10 });
    chime({ freq: PENTA.E6, duration: 0.7, peak: 0.10, delay: 0.10 });
    chime({ freq: PENTA.G6, duration: 0.9, peak: 0.10, delay: 0.20 });
    chime({ freq: PENTA.C6 * 2, duration: 0.7, peak: 0.06, delay: 0.30 });
  },
  tick() {
    // Quiet sine pip — barely noticeable but rhythmic
    chime({ freq: PENTA.A5, duration: 0.18, peak: 0.05, harmonics: false });
  },
  buzzer() {
    // Round-end: a gentle resolving chord, not a klaxon.
    chime({ freq: PENTA.C5, duration: 1.4, peak: 0.12 });
    chime({ freq: PENTA.E5, duration: 1.4, peak: 0.10, delay: 0.05 });
    chime({ freq: PENTA.G5, duration: 1.4, peak: 0.08, delay: 0.10 });
    chime({ freq: PENTA.C6, duration: 1.6, peak: 0.07, delay: 0.15 });
  },
  draw() {
    // Glassy ascending pentatonic — slot-machine vibe but smooth
    const notes = [PENTA.C5, PENTA.E5, PENTA.G5, PENTA.C6, PENTA.E6, PENTA.G6];
    notes.forEach((f, i) => chime({ freq: f, duration: 0.35, peak: 0.07, delay: i * 0.10 }));
    chime({ freq: PENTA.C6 * 2, duration: 0.9, peak: 0.10, delay: notes.length * 0.10 });
  },
  applause() {
    // Soft pad chord under hushed noise — warm "well done" feel rather than crowd cheer
    chime({ freq: PENTA.C5, duration: 1.6, peak: 0.07 });
    chime({ freq: PENTA.G5, duration: 1.6, peak: 0.06, delay: 0.05 });
    chime({ freq: PENTA.E6, duration: 1.6, peak: 0.05, delay: 0.10 });
    softNoise({ duration: 1.6, peak: 0.04, filterFreq: 900, sweepTo: 600 });
  },
  whoosh() {
    // Airy lowpass-swept noise — like a soft sigh, no high-end zip
    softNoise({ duration: 0.5, peak: 0.07, filterFreq: 1400, sweepTo: 400 });
    chime({ freq: PENTA.G5, duration: 0.4, peak: 0.05, slideTo: PENTA.C5, harmonics: false });
  },
};

export async function play(name) {
  if (muted) return;
  const played = await tryPlayFile(name);
  if (played) return;
  if (synth[name]) synth[name]();
}

// Pre-warm the audio context on first user gesture (browsers require this)
export function unlockAudio() {
  getCtx();
}
