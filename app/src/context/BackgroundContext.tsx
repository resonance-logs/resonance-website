'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type BackgroundContextValue = {
  enabled: boolean
  setEnabled: (v: boolean) => void
}

const BackgroundContext = createContext<BackgroundContextValue | undefined>(undefined)

const STORAGE_KEY = 'resonance.backgroundEnabled'

export const BackgroundProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default to backgrounds disabled to reduce CPU usage; users can re-enable via the toggle.
  const [enabled, setEnabled] = useState<boolean>(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw !== null) {
        setEnabled(raw === 'true')
      } else {
        // If user prefers reduced motion at OS level, default to disabled
        if (typeof window !== 'undefined' && window.matchMedia) {
          const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          if (prefersReduced) setEnabled(false)
        }
      }
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false')
      if (typeof document !== 'undefined') {
        if (!enabled) {
          document.documentElement.classList.add('bg-disabled')
        } else {
          document.documentElement.classList.remove('bg-disabled')
        }
      }
    } catch (e) {
      // ignore
    }
  }, [enabled])

  return (
    <BackgroundContext.Provider value={{ enabled, setEnabled }}>
      {children}
    </BackgroundContext.Provider>
  )
}

export function useBackground() {
  const ctx = useContext(BackgroundContext)
  if (!ctx) throw new Error('useBackground must be used within BackgroundProvider')
  return ctx
}

export default BackgroundContext
