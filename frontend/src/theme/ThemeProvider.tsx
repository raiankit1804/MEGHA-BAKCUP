'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ThemeContextType {
  interfaceStyle: string;
  setInterfaceStyle: (style: string) => void;
  colorScheme: string;
  setColorScheme: (scheme: string) => void;
  themeKey: string;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [interfaceStyle, setInterfaceStyleState] = useState<string>('modern');
  const [colorScheme, setColorSchemeState] = useState<string>('dark');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const savedInterface = localStorage.getItem('wgpt_interface') || 'modern';
    const savedColor = localStorage.getItem('wgpt_color') || 'dark';
    setInterfaceStyleState(savedInterface);
    // Modern mode is strictly dark
    setColorSchemeState(savedInterface === 'modern' ? 'dark' : savedColor);
    setMounted(true);
  }, []);

  const setInterfaceStyle = (style: string) => {
    setInterfaceStyleState(style);
    if (style === 'modern') {
      setColorSchemeState('dark');
    }
  };

  const setColorScheme = (scheme: string) => {
    // Strictly no light mode for modern mode!
    if (interfaceStyle === 'modern') {
      setColorSchemeState('dark');
      return;
    }
    setColorSchemeState(scheme);
  };

  // Modern mode is always locked to dark!
  const effectiveColorScheme = interfaceStyle === 'modern' ? 'dark' : colorScheme;
  const themeKey = `${interfaceStyle}-${effectiveColorScheme}`;

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', themeKey);
    localStorage.setItem('wgpt_interface', interfaceStyle);
    localStorage.setItem('wgpt_color', effectiveColorScheme);
  }, [themeKey, interfaceStyle, effectiveColorScheme, mounted]);

  return (
    <ThemeContext.Provider value={{ interfaceStyle, setInterfaceStyle, colorScheme: effectiveColorScheme, setColorScheme, themeKey }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
