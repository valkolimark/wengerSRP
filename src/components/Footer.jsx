import { useMemo } from 'react';

const TAGLINES = [
  'Hit the buckets. Win the room.',
  'Discovery wins deals.',
  'BANT or bust.',
  'Close it like Greg Hanbaum.',
  'Ask better questions. Sell more storage.',
  'Timeline is a feature, not a footnote.',
];

const VERSION = '1.4.0';

export default function Footer() {
  const tagline = useMemo(() => TAGLINES[Math.floor(Math.random() * TAGLINES.length)], []);
  return (
    <footer className="text-center text-xs text-white/40 py-4 font-medium tracking-wider">
      WENGER ROLE PLAY · v{VERSION} · <span className="italic text-white/55">"{tagline}"</span>
    </footer>
  );
}
