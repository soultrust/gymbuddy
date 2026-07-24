import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Audio } from 'expo-av'
import * as Haptics from 'expo-haptics'
import type { TimerPreset } from '../types/timer'

const PRESETS_KEY = 'gymbuddy_timer_presets'
const SOUND_URI_KEY = 'gymbuddy_timer_sound_uri'
const ALARM_AUTO_SHUTOFF_KEY = 'gymbuddy_timer_auto_shutoff'
const ALARM_SHUTOFF_SECS_KEY = 'gymbuddy_timer_shutoff_secs'
const DEFAULT_SOUND = require('../../assets/beep.wav')

const DEFAULT_PRESETS: TimerPreset[] = [
  { id: 'default-1', name: 'Quick Rest', duration: 30 },
  { id: 'default-2', name: 'Rest', duration: 60 },
  { id: 'default-3', name: 'Long Rest', duration: 90 },
  { id: 'default-4', name: '3 Minutes', duration: 180 },
]

type TimerContextType = {
  isOverlayOpen: boolean
  isRunning: boolean
  timeLeft: number
  totalTime: number
  activePreset: TimerPreset | null
  presets: TimerPreset[]
  customSoundUri: string | null
  alarmAutoShutoff: boolean
  alarmShutoffSeconds: number
  toggleOverlay: () => void
  play: () => void
  pause: () => void
  reset: () => void
  selectPreset: (preset: TimerPreset) => void
  addPreset: (name: string, duration: number) => Promise<void>
  deletePreset: (id: string) => Promise<void>
  setCustomSoundUri: (uri: string | null) => Promise<void>
  setAlarmAutoShutoff: (val: boolean) => Promise<void>
  setAlarmShutoffSeconds: (val: number) => Promise<void>
}

const TimerContext = createContext<TimerContextType | null>(null)

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(DEFAULT_PRESETS[1].duration)
  const [totalTime, setTotalTime] = useState(DEFAULT_PRESETS[1].duration)
  const [activePreset, setActivePreset] = useState<TimerPreset | null>(DEFAULT_PRESETS[1])
  const [presets, setPresets] = useState<TimerPreset[]>(DEFAULT_PRESETS)
  const [customSoundUri, setCustomSoundUriState] = useState<string | null>(null)
  const [alarmAutoShutoff, setAlarmAutoShutoffState] = useState(true)
  const [alarmShutoffSeconds, setAlarmShutoffSecondsState] = useState(2)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Set to false to cancel an in-progress alarm loop
  const alarmActiveRef = useRef(false)
  // Mirror of totalTime accessible inside the setInterval callback
  const totalTimeRef = useRef(totalTime)

  // Keep ref in sync whenever totalTime changes
  useEffect(() => { totalTimeRef.current = totalTime }, [totalTime])

  // Load persisted settings on mount
  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {})

    AsyncStorage.multiGet([
      PRESETS_KEY,
      SOUND_URI_KEY,
      ALARM_AUTO_SHUTOFF_KEY,
      ALARM_SHUTOFF_SECS_KEY,
    ]).then((pairs) => {
      for (const [key, value] of pairs) {
        if (!value) continue
        if (key === PRESETS_KEY) {
          try {
            const saved = JSON.parse(value) as TimerPreset[]
            if (Array.isArray(saved) && saved.length > 0) setPresets(saved)
          } catch {}
        } else if (key === SOUND_URI_KEY) {
          setCustomSoundUriState(value)
        } else if (key === ALARM_AUTO_SHUTOFF_KEY) {
          setAlarmAutoShutoffState(value === 'true')
        } else if (key === ALARM_SHUTOFF_SECS_KEY) {
          const n = parseInt(value, 10)
          if (!isNaN(n) && n > 0) setAlarmShutoffSecondsState(n)
        }
      }
    })
  }, [])

  // Play a single beep and vibrate; returns true if alarm should continue
  const playOnce = useCallback(
    async (source: Parameters<typeof Audio.Sound.createAsync>[0]) => {
      try {
        const { sound } = await Audio.Sound.createAsync(source, { shouldPlay: true })
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
        sound.setOnPlaybackStatusUpdate((status) => {
          if ('didJustFinish' in status && status.didJustFinish) {
            sound.unloadAsync().catch(() => {})
          }
        })
      } catch {}
    },
    [],
  )

  // Loop beeps until alarmActiveRef is false or shutoff time expires
  const playAlarm = useCallback(
    async (autoShutoff: boolean, shutoffSecs: number, soundUri: string | null) => {
      alarmActiveRef.current = true
      const source = soundUri ? { uri: soundUri } : DEFAULT_SOUND
      const deadline = autoShutoff ? Date.now() + shutoffSecs * 1000 : Infinity

      while (alarmActiveRef.current && Date.now() < deadline) {
        for (let i = 0; i < 3 && alarmActiveRef.current && Date.now() < deadline; i++) {
          await playOnce(source)
          if (i < 2) await new Promise((r) => setTimeout(r, 380))
        }
        // Gap between 3-beep bursts
        if (alarmActiveRef.current && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 800))
        }
      }
      alarmActiveRef.current = false
    },
    [playOnce],
  )

  // Countdown interval
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!)
            intervalRef.current = null
            setIsRunning(false)
            // Snapshot current settings at the moment of completion
            setAlarmAutoShutoffState((shutoff) => {
              setAlarmShutoffSecondsState((secs) => {
                setCustomSoundUriState((uri) => {
                  playAlarm(shutoff, secs, uri)
                  return uri
                })
                return secs
              })
              return shutoff
            })
            // Auto-reset to the full duration
            return totalTimeRef.current
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, playAlarm])

  const toggleOverlay = useCallback(() => setIsOverlayOpen((o) => !o), [])
  const play = useCallback(() => {
    alarmActiveRef.current = false // cancel any running alarm
    if (timeLeft > 0) setIsRunning(true)
  }, [timeLeft])
  const pause = useCallback(() => {
    alarmActiveRef.current = false // cancel looping alarm
    setIsRunning(false)
  }, [])
  const reset = useCallback(() => {
    alarmActiveRef.current = false
    setIsRunning(false)
    setTimeLeft(totalTimeRef.current)
  }, [])

  const selectPreset = useCallback((preset: TimerPreset) => {
    alarmActiveRef.current = false
    setIsRunning(false)
    setActivePreset(preset)
    setTotalTime(preset.duration)
    setTimeLeft(preset.duration)
  }, [])

  const addPreset = useCallback(
    async (name: string, duration: number) => {
      const newPreset: TimerPreset = { id: Date.now().toString(), name, duration }
      const updated = [...presets, newPreset]
      setPresets(updated)
      await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(updated))
    },
    [presets],
  )

  const deletePreset = useCallback(
    async (id: string) => {
      const updated = presets.filter((p) => p.id !== id)
      setPresets(updated)
      await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(updated))
    },
    [presets],
  )

  const setCustomSoundUri = useCallback(async (uri: string | null) => {
    setCustomSoundUriState(uri)
    if (uri) await AsyncStorage.setItem(SOUND_URI_KEY, uri)
    else await AsyncStorage.removeItem(SOUND_URI_KEY)
  }, [])

  const setAlarmAutoShutoff = useCallback(async (val: boolean) => {
    setAlarmAutoShutoffState(val)
    await AsyncStorage.setItem(ALARM_AUTO_SHUTOFF_KEY, String(val))
  }, [])

  const setAlarmShutoffSeconds = useCallback(async (val: number) => {
    setAlarmShutoffSecondsState(val)
    await AsyncStorage.setItem(ALARM_SHUTOFF_SECS_KEY, String(val))
  }, [])

  return (
    <TimerContext.Provider
      value={{
        isOverlayOpen,
        isRunning,
        timeLeft,
        totalTime,
        activePreset,
        presets,
        customSoundUri,
        alarmAutoShutoff,
        alarmShutoffSeconds,
        toggleOverlay,
        play,
        pause,
        reset,
        selectPreset,
        addPreset,
        deletePreset,
        setCustomSoundUri,
        setAlarmAutoShutoff,
        setAlarmShutoffSeconds,
      }}
    >
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() {
  const ctx = useContext(TimerContext)
  if (!ctx) throw new Error('useTimer must be used within TimerProvider')
  return ctx
}
