import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType>({ isDark: false, toggleTheme: () => {}, isTransitioning: false });

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('pilgriment-theme');
    return stored === 'dark';
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('pilgriment-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('pilgriment-theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    // Trigger glitch transition
    setIsTransitioning(true);
    
    // Apply theme mid-transition (at the peak of the glitch)
    setTimeout(() => {
      setIsDark(prev => !prev);
    }, 400);

    // End transition
    setTimeout(() => {
      setIsTransitioning(false);
    }, 900);
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, isTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
};
