// Visual treatment for each scenario category. Used by chips, persona badges, etc.

export const CATEGORY_META = {
  Architect:        { icon: '📐', color: 'bg-cyan/20 text-cyan border-cyan/40' },
  'GC/CM':          { icon: '🏗️', color: 'bg-warning/20 text-warning border-warning/40' },
  TSM:              { icon: '🎺', color: 'bg-magenta/20 text-magenta-glow border-magenta/40' },
  'Tech Director':  { icon: '🎭', color: 'bg-purple-400/20 text-purple-300 border-purple-300/40' },
  Facilities:       { icon: '🏛️', color: 'bg-gold/20 text-gold border-gold/40' },
  'Athletic Director': { icon: '🏆', color: 'bg-success/20 text-success border-success/40' },
};

export function metaFor(category) {
  return CATEGORY_META[category] || { icon: '🎯', color: 'bg-white/10 text-white border-white/30' };
}
