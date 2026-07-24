import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Animated, Keyboard } from 'react-native'

import { apiRequest } from '../api/client'
import type {
  Workout,
  PerformedExercise,
  SetEntry,
  TemplateExercise,
  TemplateSetEntry,
} from '../types/workout'
import { formatNumber, formatWeight } from '../utils/format'
import { setDecimalInput, parseReps, stepRepsValue } from '../utils/numberInput'

export function useWorkoutDetail(
  workoutId: number,
  token: string | null,
  goBack: () => void,
) {
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [previousExercises, setPreviousExercises] = useState<TemplateExercise[]>([])
  const [userExercises, setUserExercises] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseNote, setNewExerciseNote] = useState('')
  const [newExerciseBodyweight, setNewExerciseBodyweight] = useState(false)
  const [newExerciseMeasureUnit, setNewExerciseMeasureUnit] = useState<'sets_reps' | 'stopwatch'>('sets_reps')
  const [addingExercise, setAddingExercise] = useState(false)
  const [addingSetFor, setAddingSetFor] = useState<number | null>(null)
  const [newSetReps, setNewSetReps] = useState('1')
  const [newSetWeight, setNewSetWeight] = useState('')
  const [newSetMinutes, setNewSetMinutes] = useState('0')
  const [newSetSeconds, setNewSetSeconds] = useState('0')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingTitleValue, setEditingTitleValue] = useState('')
  const [editingExerciseId, setEditingExerciseId] = useState<number | null>(null)
  const [editingExerciseName, setEditingExerciseName] = useState('')
  const [editingSetId, setEditingSetId] = useState<number | null>(null)
  const [editingSetReps, setEditingSetReps] = useState('')
  const [editingSetWeight, setEditingSetWeight] = useState('')
  const [editingSetMinutes, setEditingSetMinutes] = useState('0')
  const [editingSetSeconds, setEditingSetSeconds] = useState('0')
  const [editingDate, setEditingDate] = useState(false)
  const [editingDateValue, setEditingDateValue] = useState<Date | null>(null)
  const [expandedNotesFor, setExpandedNotesFor] = useState<number | null>(null)
  const [editingNoteFor, setEditingNoteFor] = useState<number | null>(null)
  const [exerciseNotes, setExerciseNotes] = useState<
    Record<number, { todayNotes: string; nextTimeNote: string }>
  >({})
  const fadeAnim = useRef(new Animated.Value(0)).current

  const getNotesFor = (peId: number) =>
    exerciseNotes[peId] ?? { todayNotes: '', nextTimeNote: '' }

  const setNotesFor = (
    peId: number,
    updater: (prev: { todayNotes: string; nextTimeNote: string }) => {
      todayNotes: string
      nextTimeNote: string
    },
  ) =>
    setExerciseNotes((prev) => ({
      ...prev,
      [peId]: updater(prev[peId] ?? { todayNotes: '', nextTimeNote: '' }),
    }))

  const fetchWorkout = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiRequest<Workout>(`/workouts/${workoutId}/`, { token })
      setFetchError(null)
      setWorkout((prev) => {
        if (!prev?.exercises?.length || !data.exercises) return data
        const exercises = data.exercises.map((e) => {
          const prevEx = prev.exercises.find((p) => p.id === e.id)
          if (prevEx?.is_bodyweight === true) return { ...e, is_bodyweight: true }
          return e
        })
        return { ...data, exercises }
      })
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'Could not load workout.')
      setWorkout(null)
    }
  }, [token, workoutId])

  const fetchPrevious = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiRequest<TemplateExercise[]>(
        `/workouts/${workoutId}/previous_exercises/`,
        { token },
      )
      setPreviousExercises(Array.isArray(data) ? data : [])
    } catch {
      setPreviousExercises([])
    }
  }, [token, workoutId])

  const fetchUserExercises = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiRequest<{ id: number; name: string }[]>(
        `/workouts/user_exercises/`,
        { token },
      )
      setUserExercises(Array.isArray(data) ? data : [])
    } catch {
      setUserExercises([])
    }
  }, [token])

  useEffect(() => {
    Promise.all([fetchWorkout(), fetchPrevious(), fetchUserExercises()]).finally(() =>
      setLoading(false),
    )
  }, [fetchWorkout, fetchPrevious, fetchUserExercises])

  useEffect(() => {
    if (editingSetId !== null) {
      fadeAnim.setValue(0)
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start()
      }, 50)
    } else {
      fadeAnim.setValue(0)
    }
  }, [editingSetId, fadeAnim])

  const getLastSets = (exerciseId: number) =>
    previousExercises.find((p) => p.exercise.id === exerciseId)?.last_sets ?? []

  const setWeightDecimal = (setter: (v: string) => void, text: string) =>
    setDecimalInput(setter, text)

  const setRepsDecimal = (setter: (v: string) => void, text: string) =>
    setDecimalInput(setter, text)

  const formatLastSets = (sets: (SetEntry | TemplateSetEntry)[]) => {
    if (sets.length === 0) return null
    return sets
      .map((s) => {
        const w = formatWeight(s.weight ?? undefined)
        return `${formatNumber(s.reps)} reps${w ? ` @ ${w}lbs` : ''}`
      })
      .join(', ')
  }

  const handleAddSet = async (
    performedExerciseId: number,
    currentSets: SetEntry[],
    keepAdding = false,
  ) => {
    if (!token || !workout) return
    const nextOrder =
      currentSets.length > 0 ? Math.max(...currentSets.map((s) => s.order)) + 1 : 1
    const pe = workout.exercises.find((e) => e.id === performedExerciseId)

    if (pe?.measure_unit === 'stopwatch') {
      const mins = parseInt(newSetMinutes || '0', 10)
      const secs = parseInt(newSetSeconds || '0', 10)
      const totalSeconds = mins * 60 + secs
      if (totalSeconds <= 0) return
      try {
        await apiRequest(`/performed-exercises/${performedExerciseId}/sets/`, {
          method: 'POST',
          token,
          body: { order: nextOrder, reps: totalSeconds, weight: null, notes: '' },
        })
        if (!keepAdding) setAddingSetFor(null)
        setNewSetMinutes('0')
        setNewSetSeconds('0')
        await fetchWorkout()
      } catch (e) {
        Alert.alert('Could not add set', e instanceof Error ? e.message : 'Please try again.')
      }
    } else {
      const reps = parseReps(newSetReps)
      if (reps == null) return
      try {
        await apiRequest(`/performed-exercises/${performedExerciseId}/sets/`, {
          method: 'POST',
          token,
          body: {
            order: nextOrder,
            reps,
            weight: pe?.is_bodyweight ? 0 : newSetWeight ? parseFloat(newSetWeight) : null,
            notes: '',
          },
        })
        if (!keepAdding) setAddingSetFor(null)
        setNewSetReps('1')
        setNewSetWeight('')
        await fetchWorkout()
      } catch (e) {
        Alert.alert('Could not add set', e instanceof Error ? e.message : 'Please try again.')
      }
    }
  }

  const saveSetToApi = async (
    set: SetEntry,
    reps: number,
    weight: string,
    exitEdit = true,
  ) => {
    if (!token) return
    if (isNaN(reps) || reps < 0) return
    try {
      await apiRequest(`/set-entries/${set.id}/`, {
        method: 'PATCH',
        token,
        body: { reps, weight: weight ? parseFloat(weight) : null },
      })
      if (exitEdit) setEditingSetId(null)
      await fetchWorkout()
    } catch (e) {
      Alert.alert('Could not save set', e instanceof Error ? e.message : 'Please try again.')
    }
  }

  const handleSaveSet = async (set: SetEntry) => {
    const pe = workout?.exercises.find((e) => e.sets.some((ss) => ss.id === set.id))
    if (pe?.measure_unit === 'stopwatch') {
      const mins = parseInt(editingSetMinutes || '0', 10)
      const secs = parseInt(editingSetSeconds || '0', 10)
      const totalSeconds = mins * 60 + secs
      if (totalSeconds < 0) return
      await saveSetToApi(set, totalSeconds, '', true)
    } else {
      const reps = parseReps(editingSetReps)
      if (reps == null) return
      const weight = pe?.is_bodyweight ? '0' : editingSetWeight
      await saveSetToApi(set, reps, weight, true)
    }
  }

  const handleSaveDate = async (dateToSave?: Date) => {
    if (!token || !workout) return
    const date = dateToSave || editingDateValue
    if (!date) return
    try {
      await apiRequest(`/workouts/${workoutId}/`, {
        method: 'PATCH',
        token,
        body: { date: date.toISOString() },
      })
      setEditingDate(false)
      setEditingDateValue(null)
      await fetchWorkout()
    } catch (e) {
      Alert.alert('Could not save date', e instanceof Error ? e.message : 'Please try again.')
    }
  }

  const handleDeleteSet = async (set: SetEntry) => {
    if (!token) return
    try {
      await apiRequest(`/set-entries/${set.id}/`, { method: 'DELETE', token })
      setEditingSetId(null)
      await fetchWorkout()
    } catch (e) {
      Alert.alert(
        'Could not delete set',
        e instanceof Error ? e.message : 'Please try again.',
      )
    }
  }

  const dismissEditSet = () => {
    if (!workout) return
    if (addingSetFor !== null) {
      const pe = workout.exercises.find((e) => e.id === addingSetFor)
      if (pe) {
        Keyboard.dismiss()
        handleAddSet(addingSetFor, pe.sets)
      }
      setAddingSetFor(null)
      return
    }
    if (editingSetId === null) return
    for (const pe of workout.exercises) {
      const set = pe.sets.find((se) => se.id === editingSetId)
      if (set) {
        Keyboard.dismiss()
        handleSaveSet(set)
        return
      }
    }
    setEditingSetId(null)
  }

  const confirmDeleteSet = (set: SetEntry) => {
    Alert.alert(
      'Delete set',
      'Are you sure you want to delete this set? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteSet(set) },
      ],
    )
  }

  const handleDeleteExercise = async (pe: PerformedExercise) => {
    if (!token) return
    try {
      await apiRequest(`/performed-exercises/${pe.id}/`, { method: 'DELETE', token })
      await fetchWorkout()
    } catch (e) {
      Alert.alert(
        'Could not delete exercise',
        e instanceof Error ? e.message : 'Please try again.',
      )
    }
  }

  const confirmDeleteExercise = (pe: PerformedExercise) => {
    Alert.alert(
      'Delete exercise',
      'Are you sure you want to remove this exercise from the workout? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteExercise(pe),
        },
      ],
    )
  }

  const handleDeleteWorkout = () => {
    if (!token || !workout) return
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/workouts/${workoutId}/`, { method: 'DELETE', token })
              goBack()
            } catch (e) {
              Alert.alert(
                'Could not delete workout',
                e instanceof Error ? e.message : 'Please try again.',
              )
            }
          },
        },
      ],
    )
  }

  const handleAddExercise = async () => {
    if (!token || !newExerciseName.trim() || !workout) return
    setAddingExercise(true)
    const wasBodyweight = newExerciseBodyweight
    const wasMeasureUnit = newExerciseMeasureUnit
    const noteToSave = newExerciseNote.trim()
    try {
      const exercises = workout.exercises ?? []
      const nextOrder =
        exercises.length > 0 ? Math.max(...exercises.map((e) => e.order)) + 1 : 1
      const created = await apiRequest<PerformedExercise>(
        `/workouts/${workoutId}/exercises/`,
        {
          method: 'POST',
          token,
          body: {
            exercise_name: newExerciseName.trim(),
            order: nextOrder,
            user_preferred_name: '',
            is_bodyweight: wasBodyweight,
            measure_unit: wasMeasureUnit,
          },
        },
      )
      setNewExerciseName('')
      setNewExerciseNote('')
      setNewExerciseBodyweight(false)
      setNewExerciseMeasureUnit('sets_reps')
      if (noteToSave && created) {
        await apiRequest(`/performed-exercises/${created.id}/note_for_next_time/`, {
          method: 'POST',
          body: { note: noteToSave },
          token,
        }).catch(() => {})
      }
      if (created) {
        created.is_bodyweight = wasBodyweight
        created.measure_unit = wasMeasureUnit
        setWorkout((prev) => {
          if (!prev) return prev
          const next = [...(prev.exercises || []), created].sort(
            (a, b) => a.order - b.order,
          )
          return { ...prev, exercises: next }
        })
      }
      const fresh = await apiRequest<Workout>(`/workouts/${workoutId}/`, {
        token,
      }).catch(() => null)
      if (fresh) {
        const updatedExercises =
          created && wasBodyweight
            ? (fresh.exercises?.map((e) =>
                e.id === created.id ? { ...e, is_bodyweight: true } : e,
              ) ?? fresh.exercises)
            : fresh.exercises
        setWorkout({ ...fresh, exercises: updatedExercises ?? [] })
      }
    } catch (e) {
      Alert.alert(
        'Could not add exercise',
        e instanceof Error ? e.message : 'Please try again.',
      )
    } finally {
      setAddingExercise(false)
    }
  }

  const handleAddPastExercise = async (exerciseId: number) => {
    if (!token || !workout) return
    setAddingExercise(true)
    try {
      const exercises = workout.exercises ?? []
      const nextOrder =
        exercises.length > 0 ? Math.max(...exercises.map((e) => e.order)) + 1 : 1

      let userPreferredName = ''
      let lastSets: TemplateSetEntry[] = []
      let lastPerformance: TemplateExercise | null = null
      try {
        lastPerformance = await apiRequest<TemplateExercise>(
          `/workouts/last_exercise_performance/?exercise_id=${exerciseId}`,
          { token },
        )
        if (lastPerformance?.user_preferred_name) userPreferredName = lastPerformance.user_preferred_name
        if (Array.isArray(lastPerformance?.last_sets) && lastPerformance.last_sets.length > 0)
          lastSets = lastPerformance.last_sets
      } catch {
        // No previous performance; add exercise with no sets
      }

      const created = await apiRequest<PerformedExercise>(
        `/workouts/${workoutId}/exercises/`,
        {
          method: 'POST',
          token,
          body: {
            exercise: exerciseId,
            order: nextOrder,
            user_preferred_name: userPreferredName,
            measure_unit: lastPerformance?.measure_unit ?? 'sets_reps',
          },
        },
      )

      for (let i = 0; i < lastSets.length; i++) {
        const s = lastSets[i]
        const reps =
          typeof s.reps === 'number' ? s.reps : parseFloat(String(s.reps))
        if (Number.isNaN(reps) || reps < 0) continue
        await apiRequest(`/performed-exercises/${created.id}/sets/`, {
          method: 'POST',
          token,
          body: {
            order: i + 1,
            reps,
            weight:
              s.weight != null && s.weight !== ''
                ? parseFloat(String(s.weight))
                : null,
            notes: s.notes ?? '',
          },
        })
      }
      await fetchWorkout()
    } catch (e) {
      Alert.alert(
        'Could not add exercise',
        e instanceof Error ? e.message : 'Please try again.',
      )
    } finally {
      setAddingExercise(false)
    }
  }

  const handleSaveTitle = async () => {
    if (!token || !workout) return
    const name = editingTitleValue.trim()
    if (name === (workout.name ?? '').trim()) {
      setEditingTitle(false)
      return
    }
    try {
      await apiRequest(`/workouts/${workoutId}/`, {
        method: 'PATCH',
        token,
        body: { name },
      })
      setEditingTitle(false)
      await fetchWorkout()
    } catch (e) {
      Alert.alert('Could not save title', (e as Error)?.message ?? 'Please try again.')
    }
  }

  const handleSaveExerciseName = async (pe: PerformedExercise) => {
    if (!token) return
    const name = editingExerciseName.trim()
    try {
      await apiRequest(`/performed-exercises/${pe.id}/`, {
        method: 'PATCH',
        token,
        body: { user_preferred_name: name || '' },
      })
      setEditingExerciseId(null)
      await fetchWorkout()
    } catch (e) {
      Alert.alert('Could not save name', (e as Error)?.message ?? 'Please try again.')
    }
  }

  const handleSaveNote = async (peId: number, originalNote?: string | null) => {
    const note = (getNotesFor(peId).nextTimeNote ?? '').trim()
    const original = (originalNote ?? '').trim()
    if (note === original) {
      // Unchanged — switch to view mode if note exists, else close panel
      setEditingNoteFor(null)
      if (!note) setExpandedNotesFor(null)
      return
    }
    try {
      await apiRequest(`/performed-exercises/${peId}/note_for_next_time/`, {
        method: 'POST',
        body: { note },
        token,
      })
      await fetchWorkout()
      setEditingNoteFor(null)
      if (!note) setExpandedNotesFor(null)
    } catch (e) {
      Alert.alert('Could not save note', (e as Error)?.message ?? 'Please try again.')
    }
  }

  const retry = () => {
    setFetchError(null)
    setLoading(true)
    Promise.all([fetchWorkout(), fetchPrevious(), fetchUserExercises()]).finally(() =>
      setLoading(false),
    )
  }

  return {
    // state
    workout,
    loading,
    fetchError,
    previousExercises,
    userExercises,
    newExerciseName,
    setNewExerciseName,
    newExerciseNote,
    setNewExerciseNote,
    newExerciseBodyweight,
    setNewExerciseBodyweight,
    newExerciseMeasureUnit,
    setNewExerciseMeasureUnit,
    addingExercise,
    addingSetFor,
    setAddingSetFor,
    newSetReps,
    setNewSetReps,
    newSetWeight,
    setNewSetWeight,
    newSetMinutes,
    setNewSetMinutes,
    newSetSeconds,
    setNewSetSeconds,
    editingTitle,
    setEditingTitle,
    editingTitleValue,
    setEditingTitleValue,
    editingExerciseId,
    setEditingExerciseId,
    editingExerciseName,
    setEditingExerciseName,
    editingSetId,
    setEditingSetId,
    editingSetReps,
    setEditingSetReps,
    editingSetWeight,
    setEditingSetWeight,
    editingSetMinutes,
    setEditingSetMinutes,
    editingSetSeconds,
    setEditingSetSeconds,
    editingDate,
    setEditingDate,
    editingDateValue,
    setEditingDateValue,
    expandedNotesFor,
    setExpandedNotesFor,
    editingNoteFor,
    setEditingNoteFor,
    exerciseNotes,
    getNotesFor,
    setNotesFor,
    fadeAnim,
    // helpers
    getLastSets,
    formatLastSets,
    setWeightDecimal,
    setRepsDecimal,
    // handlers
    fetchWorkout,
    handleAddSet,
    saveSetToApi,
    handleSaveSet,
    handleSaveDate,
    handleDeleteSet,
    dismissEditSet,
    confirmDeleteSet,
    handleDeleteExercise,
    confirmDeleteExercise,
    handleDeleteWorkout,
    handleSaveTitle,
    handleSaveExerciseName,
    handleAddExercise,
    handleAddPastExercise,
    handleSaveNote,
    retry,
  }
}
