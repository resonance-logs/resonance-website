'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface BackgroundContextType {
  enabled: boolean;
  toggleBackground: () => void;
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export const BackgroundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('bg_enabled');
    if (stored !== null) {
      setEnabled(stored === 'true');
    }
    setMounted(true);
  }, []);

  const toggleBackground = () => {
    setEnabled((prev) => {
      const newValue = !prev;
      localStorage.setItem('bg_enabled', String(newValue));
      return newValue;
    });
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <BackgroundContext.Provider value={{ enabled, toggleBackground }}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error('useBackground must be used within BackgroundProvider');
  }
  return context;
};
