// Single source of truth: all base tokens come from starter/theme.ts.
import { colors as baseColors, radius, space, font, type, minTouch } from '../../starter/theme';

export { baseColors, radius, space, font, type, minTouch };

// Extra colors for the red (admin web) variant. Not in starter/theme.ts.
const redVariant = {
  onAccent: '#FFFFFF',
  accentSoftBg: '#4D1B1E',
} as const;

export type ThemeVariant = 'green' | 'red';

export interface Theme {
  variant: ThemeVariant;
  colors: {
    bg: string;
    surface: string;
    surface2: string;
    border: string;
    track: string;
    neutral: string;
    text: string;
    muted: string;
    accent: string;
    onAccent: string;
    accentSoftBg: string;
    adminRed: string;
    adminRedText: string;
  };
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

