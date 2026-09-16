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
  const [interfaceStyle, setInterfaceStyle] = useState<string>('modern');
  const [colorScheme, setColorScheme] = useState<string>('light');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const savedInterface = localStorage.getItem('wgpt_interface') || 'modern';
    const savedColor = localStorage.getItem('wgpt_color') || 'light';
    setInterfaceStyle(savedInterface);
    setColorScheme(savedColor);
    setMounted(true);
  }, []);

  const themeKey = `${interfaceStyle}-${colorScheme}`;

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', themeKey);
    localStorage.setItem('wgpt_interface', interfaceStyle);
    localStorage.setItem('wgpt_color', colorScheme);
  }, [themeKey, interfaceStyle, colorScheme, mounted]);

  return (
    <ThemeContext.Provider value={{ interfaceStyle, setInterfaceStyle, colorScheme, setColorScheme, themeKey }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
