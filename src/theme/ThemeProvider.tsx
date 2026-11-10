import React, { createContext, useContext, useState } from 'react';
import { Theme, ThemeVariant, createTheme, defaultTheme } from './tokens';

interface ThemeContextValue {
  theme: Theme;
  setThemeVariant: (variant: ThemeVariant) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  setThemeVariant: () => {},
});

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialVariant?: ThemeVariant;
}> = ({ children, initialVariant = 'green' }) => {
  const [variant, setVariant] = useState<ThemeVariant>(initialVariant);
  const theme = createTheme(variant);

  return (
    <ThemeContext.Provider value={{ theme, setThemeVariant: setVariant }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

