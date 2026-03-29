/** Wunderkind Factory design tokens — matches the HTML style guide */
export const WK = {
  // Backgrounds
  greenDark:  '#1a5c2a',
  greenMid:   '#2d7a3a',
  tealDark:   '#1a4a4a',
  tealMid:    '#1e6b5e',
  tealPanel:  '#2a8a7a',
  tealLight:  '#3db89a',
  tealCard:   '#1d5c52',

  // Accents
  yellow: '#f5c842',
  orange: '#e8852a',
  red:    '#d94040',
  blue:   '#3a8fd4',
  green:  '#2eab5a',

  // Text
  text:   '#e8f4e8',
  dim:    '#aadac9',  // raised from #8ecfbe — now passes WCAG AA on tealCard

  // Border
  border: '#0d2e28',

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
