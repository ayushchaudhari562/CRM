// Single source of truth: all base tokens come from starter/theme.ts.
import { colors as baseColors, radius, space, font, type, minTouch } from '../../starter/theme';

export { baseColors, radius, space, font, type, minTouch };

// Font names exactly as loaded with useFonts() in app/_layout.tsx.
// Use these instead of fontFamily 'Inter' + fontWeight: Android ignores fontWeight
// for custom fonts, and 'Inter' itself is not a loaded font name.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

// Extra colors for the red (admin web) variant. Not in starter/theme.ts.
const redVariant = {
  onAccent: '#FFFFFF',
  accentSoftBg: '#4D1B1E',
} as const;

// Colors used by design-reference/*.html (or needed by the UI) but missing in starter/theme.ts.
const extraColors = {
  ringTick: '#BFE3C5', // lit ticks of the visits ring (02, 06)
  tabBar: '#111213', // bottom tab bar background (02, 06, 07)
  timelineDone: '#2E5E3A', // "done" node fill in the visit timeline (08)
  onDanger: '#FFFFFF', // text on adminRed buttons
  // Offline banner. Not in the design files: picked to read as a warning on dark bg.
  warning: '#E5A855',
  warningBg: '#2A2015',
  warningBorder: '#664D28',
} as const;

export type ThemeVariant = 'green' | 'red';

export interface Theme {
  variant: ThemeVariant;
  colors: Record<keyof typeof baseColors | keyof typeof extraColors, string>;
  radius: typeof radius;
  space: typeof space;
  font: typeof font;
  type: typeof type;
  minTouch: number;
}

export function createTheme(variant: ThemeVariant = 'green'): Theme {
  const isRed = variant === 'red';
  return {
    variant,
    colors: {
      ...baseColors,
      ...extraColors,
      accent: isRed ? baseColors.adminRed : baseColors.accent,
      onAccent: isRed ? redVariant.onAccent : baseColors.onAccent,
      accentSoftBg: isRed ? redVariant.accentSoftBg : baseColors.accentSoftBg,
    },
    radius,
    space,
    font,
    type,
    minTouch,
  };
}

export const defaultTheme = createTheme('green');
export const colors = baseColors;
