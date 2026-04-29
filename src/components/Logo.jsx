// Wenger logo lockup. Variant `dk` is the white-on-dark version (default for the app);
// `lt` is the dark-on-light version used on print/light surfaces.
// Sizes: sm/md/lg control the width — height auto-scales by aspect ratio.

const SRC = {
  dk: '/images/logos/logo-dk.png',
  lt: '/images/logos/logo-lt.png',
};

const SIZES = {
  xs: 'h-5',
  sm: 'h-7',
  md: 'h-10',
  lg: 'h-16',
  xl: 'h-24',
};

export default function Logo({ variant = 'dk', size = 'md', className = '', dim = false }) {
  return (
    <img
      src={SRC[variant] || SRC.dk}
      alt="Wenger Corporation"
      className={`${SIZES[size] || SIZES.md} w-auto select-none pointer-events-none ${dim ? 'opacity-70' : ''} ${className}`}
      draggable="false"
    />
  );
}
