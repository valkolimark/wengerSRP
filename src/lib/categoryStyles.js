// Visual treatment for each scenario category — Wenger palette, no emoji marks.
// Each category uses a short letter glyph instead of an icon for a cleaner brand feel.

export const CATEGORY_META = {
  Architect:           { glyph: 'A', color: 'bg-cyan/15 text-cyan border-cyan/40' },
  'GC/CM':             { glyph: 'G', color: 'bg-burnt-orange/15 text-burnt-orange border-burnt-orange/40' },
  TSM:                 { glyph: 'T', color: 'bg-leaf/15 text-leaf border-leaf/40' },
  'Tech Director':     { glyph: 'D', color: 'bg-bou/15 text-bou border-bou/40' },
  Facilities:          { glyph: 'F', color: 'bg-pool/20 text-pool border-pool/40' },
  'Athletic Director': { glyph: 'X', color: 'bg-green/20 text-pool border-green/40' },
};

export function metaFor(category) {
  return CATEGORY_META[category] || { glyph: '·', color: 'bg-white/10 text-white border-white/30' };
}
