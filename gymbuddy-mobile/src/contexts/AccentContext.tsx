import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ACCENT_KEY = 'gymbuddy_accent'

// ─── Preset palette ────────────────────────────────────────────────────────
// Each entry: [label, primary, dark (for pressed/shadow states)]
export const ACCENT_PRESETS = [
  { id: 'amber',  label: 'Amber',   primary: '#f59e0b', dark: '#d97706' },
  { id: 'orange', label: 'Orange',  primary: '#f97316', dark: '#ea580c' },
  { id: 'red',    label: 'Red',     primary: '#ef4444', dark: '#dc2626' },
  { id: 'rose',   label: 'Rose',    primary: '#f43f5e', dark: '#e11d48' },
  { id: 'purple', label: 'Purple',  primary: '#a855f7', dark: '#9333ea' },
  { id: 'blue',   label: 'Blue',    primary: '#3b82f6', dark: '#2563eb' },
  { id: 'teal',   label: 'Teal',    primary: '#14b8a6', dark: '#0d9488' },
  { id: 'green',  label: 'Green',   primary: '#22c55e', dark: '#16a34a' },
] as const

export type AccentId = typeof ACCENT_PRESETS[number]['id']

type AccentContextType = {
  accent: string       // primary accent color  e.g. '#f59e0b'
  accentDark: string   // darker shade          e.g. '#d97706'
  accentId: AccentId
  setAccent: (id: AccentId) => Promise<void>
}

const DEFAULT = ACCENT_PRESETS[0]

const AccentContext = createContext<AccentContextType>({
  accent: DEFAULT.primary,
  accentDark: DEFAULT.dark,
  accentId: DEFAULT.id,
  setAccent: async () => {},
})

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const [preset, setPreset] = useState(DEFAULT)

  useEffect(() => {
    AsyncStorage.getItem(ACCENT_KEY).then((saved) => {
      if (!saved) return
      const found = ACCENT_PRESETS.find((p) => p.id === saved)
      if (found) setPreset(found)
    })
  }, [])

  const setAccent = useCallback(async (id: AccentId) => {
    const found = ACCENT_PRESETS.find((p) => p.id === id)
    if (!found) return
    setPreset(found)
    await AsyncStorage.setItem(ACCENT_KEY, id)
  }, [])

  return (
    <AccentContext.Provider
      value={{
        accent: preset.primary,
        accentDark: preset.dark,
        accentId: preset.id,
        setAccent,
      }}
    >
      {children}
    </AccentContext.Provider>
  )
}

export function useAccent() {
  return useContext(AccentContext)
}
