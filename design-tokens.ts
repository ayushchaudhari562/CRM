export const colors = {
  bg: '#0B0C0D',
  surface: '#17181A',
  surface2: '#1F2022',
  border: '#2A2B2E',
  track: '#3A3C40',
  neutral: '#5A5C61',
  text: '#F4F4F2',
  muted: '#9EA1A6',
  accent: '#7FC08A',       // salesman app + admin mobile
  onAccent: '#0B0C0D',
  accentSoftBg: '#1F3A27', // check circles
  adminRed: '#D13438',     // admin web bento fill
  adminRedText: '#FF6B6F', // red used as text on dark
} as const;

export const radius = { field: 14, chip: 20, card: 22, tile: 24, sheet: 28, pill: 26 } as const;
export const space = { screen: 20, gap: 16, tile: 24 } as const;
export const font = { family: 'Inter', regular: '400', medium: '500', semibold: '600' } as const;
export const type = { h1: 30, title: 18, body: 15, label: 13, caption: 12, hero: 52 } as const;
export const minTouch = 44;
