/** Wunderkind Factory design tokens — matches the HTML style guide */
export const WK = {
  // Backgrounds — navy/plum base (was green/teal)
  greenDark:  '#0f1420',  // app background — dark navy
  greenMid:   '#1a2240',  // secondary background — navy mid
  tealDark:   '#120d18',  // header background — dark plum
  tealMid:    '#2a1e38',  // dividers/panels — plum-navy
  tealPanel:  '#1e2a50',  // panel background — navy
  tealLight:  '#3FAA7E',  // accent highlights — muted sage (palette green, accent-only)
  tealCard:   '#1e2448',  // card surfaces — indigo-navy

  // Accents
  yellow: '#E8CF59',  // main interactive accent — warm gold
  orange: '#e8852a',
  red:    '#C44747',  // danger/loss — deep crimson
  blue:   '#3F52A5',  // info/links — indigo
  green:  '#3FAA7E',  // positive stats — muted sage
  plum:   '#7D2A60',  // special callouts, badges, feature highlights

  // Text — green tint removed
  text:   '#e8f0f4',
  dim:    '#9bb0c4',  // passes WCAG AA on tealCard (#1e2448)

  // Border
  border: '#080d1a',  // dark navy border

  // Typography
  font:       'PressStart2P_400Regular',
  fontVT323:  'VT323_400Regular',  // pixel terminal font — legible at 16–20px
  fontSubNav: 'VT323_400Regular',  // sub-nav / table header font — narrower than Press Start 2P, fits 5 tabs at ~360dp
} as const;

/** Returns bar fill color based on 1–20 trait value */
export function traitColor(value: number): string {
  if (value >= 15) return WK.green;
  if (value >= 10) return WK.yellow;
  if (value >= 6)  return WK.orange;
  return WK.red;
}

/** Shared pixel-art card shadow (iOS + Android) */
export const pixelShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 3, height: 3 },
  shadowOpacity: 0.45,
  shadowRadius: 0,
} as const;
