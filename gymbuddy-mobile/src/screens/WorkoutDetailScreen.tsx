import React, { useCallback, useEffect, useState, useRef } from 'react'
import {
  Alert,
  Animated,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import Ionicons from '@expo/vector-icons/Ionicons'

import { useAuth } from '../contexts/AuthContext'
import { apiRequest } from '../api/client'
import type {
  Workout,
  PerformedExercise,
  SetEntry,
  TemplateExercise,
  TemplateSetEntry,
} from '../types/workout'
import { formatNumber, formatWeight, formatFullDate } from '../utils/format'
import { setDecimalInput, parseReps, stepRepsValue } from '../utils/numberInput'
import ArrowIcon from '../components/ArrowIcon'
import LoadingSpinner from '../components/LoadingSpinner'
import { colors } from '../theme/colors'

export default function WorkoutDetailScreen({
  route,
  navigation,
}: {
  route: { params: { workoutId: number } }
  navigation: { goBack: () => void }
}) {
  const { workoutId } = route.params
  const { token } = useAuth()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [previousExercises, setPreviousExercises] = useState<
    TemplateExercise[]
  >([])
  const [userExercises, setUserExercises] = useState<
    { id: number; name: string }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseBodyweight, setNewExerciseBodyweight] = useState(false)
  const [addingExercise, setAddingExercise] = useState(false)
  const [addingSetFor, setAddingSetFor] = useState<number | null>(null)
  const [newSetReps, setNewSetReps] = useState('1')
  const [newSetWeight, setNewSetWeight] = useState('')
  const [editingSetId, setEditingSetId] = useState<number | null>(null)
  const [editingSetReps, setEditingSetReps] = useState('')
  const [editingSetWeight, setEditingSetWeight] = useState('')
  const [editingDate, setEditingDate] = useState(false)
  const [editingDateValue, setEditingDateValue] = useState<Date | null>(null)
  const [expandedNotesFor, setExpandedNotesFor] = useState<number | null>(null)
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
      const data = await apiRequest<Workout>(`/workouts/${workoutId}/`, {
        token,
      })
      setWorkout((prev) => {
        if (!prev?.exercises?.length || !data.exercises) return data
        const exercises = data.exercises.map((e) => {
          const prevEx = prev.exercises.find((p) => p.id === e.id)
          if (prevEx?.is_bodyweight === true)
            return { ...e, is_bodyweight: true }
          return e
        })
        return { ...data, exercises }
      })
    } catch {
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
    Promise.all([
      fetchWorkout(),
      fetchPrevious(),
      fetchUserExercises(),
    ]).finally(() => setLoading(false))
  }, [fetchWorkout, fetchPrevious, fetchUserExercises])

  useEffect(() => {
    if (editingSetId !== null) {
      // Reset to 0 and immediately animate to 1
      fadeAnim.setValue(0)
      // Small delay to ensure the component has rendered
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false, // Try without native driver for opacity
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
      currentSets.length > 0
        ? Math.max(...currentSets.map((s) => s.order)) + 1
        : 1
    const reps = parseReps(newSetReps)
    if (reps == null) return
    try {
      const isBodyweight = workout.exercises.find(
        (e) => e.id === performedExerciseId,
      )?.is_bodyweight
      await apiRequest(`/performed-exercises/${performedExerciseId}/sets/`, {
        method: 'POST',
        token,
        body: {
          order: nextOrder,
          reps,
          weight: isBodyweight
            ? 0
            : newSetWeight
              ? parseFloat(newSetWeight)
              : null,
          notes: '',
        },
      })
      if (!keepAdding) setAddingSetFor(null)
      setNewSetReps('1')
      setNewSetWeight('')
      await fetchWorkout()
    } catch {
      // ignore
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
        body: {
          reps,
          weight: weight ? parseFloat(weight) : null,
        },
      })
      if (exitEdit) setEditingSetId(null)
      await fetchWorkout()
    } catch {
      // ignore
    }
  }

  const handleSaveSet = async (set: SetEntry) => {
    const reps = parseReps(editingSetReps)
    if (reps == null) return
    const pe = workout?.exercises.find((e) =>
      e.sets.some((ss) => ss.id === set.id),
    )
    const weight = pe?.is_bodyweight ? '0' : editingSetWeight
    await saveSetToApi(set, reps, weight, true)
  }

  const handleSaveDate = async (dateToSave?: Date) => {
    if (!token || !workout) return
    const date = dateToSave || editingDateValue
    if (!date) return
    try {
      const dateISO = date.toISOString()
      await apiRequest(`/workouts/${workoutId}/`, {
        method: 'PATCH',
        token,
        body: { date: dateISO },
      })
      setEditingDate(false)
      setEditingDateValue(null)
      await fetchWorkout()
    } catch {
      // ignore
    }
  }

  const handleDeleteSet = async (set: SetEntry) => {
    if (!token) return
    try {
      await apiRequest(`/set-entries/${set.id}/`, {
        method: 'DELETE',
        token,
      })
      setEditingSetId(null)
      await fetchWorkout()
    } catch {
      // ignore
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
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeleteSet(set),
        },
      ],
    )
  }

  const handleDeleteExercise = async (pe: PerformedExercise) => {
    if (!token) return
    try {
      await apiRequest(`/performed-exercises/${pe.id}/`, {
        method: 'DELETE',
        token,
      })
      await fetchWorkout()
    } catch {
      // ignore
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

  const handleDeleteWorkout = async () => {
    if (!token || !workout) return

    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/workouts/${workoutId}/`, {
                method: 'DELETE',
                token,
              })
              navigation.goBack()
            } catch {
              // ignore
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
    try {
      const exercises = workout.exercises ?? []
      const nextOrder =
        exercises.length > 0
          ? Math.max(...exercises.map((e) => e.order)) + 1
          : 1
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
          },
        },
      )
      setNewExerciseName('')
      setNewExerciseBodyweight(false)
      if (created) {
        created.is_bodyweight = wasBodyweight
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
        const exercises =
          created && wasBodyweight
            ? (fresh.exercises?.map((e) =>
                e.id === created.id ? { ...e, is_bodyweight: true } : e,
              ) ?? fresh.exercises)
            : fresh.exercises
        setWorkout({ ...fresh, exercises: exercises ?? [] })
      }
    } catch {
      // ignore
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
        exercises.length > 0
          ? Math.max(...exercises.map((e) => e.order)) + 1
          : 1

      let userPreferredName = ''
      let lastSets: TemplateSetEntry[] = []
      try {
        const last = await apiRequest<TemplateExercise>(
          `/workouts/last_exercise_performance/?exercise_id=${exerciseId}`,
          { token },
        )
        if (last?.user_preferred_name)
          userPreferredName = last.user_preferred_name
        if (Array.isArray(last?.last_sets) && last.last_sets.length > 0)
          lastSets = last.last_sets
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
    } catch {
      // ignore
    } finally {
      setAddingExercise(false)
    }
  }

  if (loading || !workout) {
    return <LoadingSpinner />
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        {editingDate ? (
          <View style={styles.dateEditContainer}>
            <DateTimePicker
              value={editingDateValue || new Date(workout.date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_event: unknown, selectedDate?: Date) => {
                if (Platform.OS === 'android') {
                  setEditingDate(false)
                }
                if (selectedDate) {
                  setEditingDateValue(selectedDate)
                  if (Platform.OS === 'android') {
                    handleSaveDate(selectedDate)
                  }
                }
              }}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.dateEditActions}>
                <TouchableOpacity
                  style={styles.dateEditBtn}
                  onPress={() => {
                    setEditingDate(false)
                    setEditingDateValue(null)
                  }}
                >
                  <Text style={styles.dateEditBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dateEditBtn}
                  onPress={() => handleSaveDate()}
                >
                  <Text style={styles.dateEditBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => {
              setEditingDate(true)
              setEditingDateValue(new Date(workout.date))
            }}
            activeOpacity={0.7}
            style={styles.titleContainer}
          >
            <Text style={styles.title} numberOfLines={1}>
              {formatFullDate(workout.date)}
            </Text>
          </TouchableOpacity>
        )}
        {!editingDate && (
          <TouchableOpacity
            onPress={handleDeleteWorkout}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.deleteBtn}
          >
            <Ionicons name="close-outline" size={32} color="#000" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        <TouchableWithoutFeedback onPress={dismissEditSet}>
          <View>
            {workout.exercises.length === 0 ? (
              <Text style={styles.empty}>No exercises yet. Add one below.</Text>
            ) : (
              workout.exercises.map((pe) => {
                const lastSets = getLastSets(pe.exercise.id)
                const lastText = formatLastSets(lastSets)
                const isBodyweight = Boolean(pe.is_bodyweight)
                return (
                  <View key={pe.id} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      <Text style={styles.exerciseName}>
                        {pe.user_preferred_name || pe.exercise.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => confirmDeleteExercise(pe)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ padding: 2 }}
                      >
                        <Ionicons
                          name="close-outline"
                          size={24}
                          color="#fff7ed"
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.cardBodyWrapper}>
                      {pe.sets.map((s, index) =>
                        editingSetId === s.id ? (
                          <TouchableWithoutFeedback
                            key={s.id}
                            onPress={() => {}}
                          >
                            <Animated.View
                              style={[
                                styles.setRow,
                                styles.setRowEditing,
                                { opacity: fadeAnim },
                              ]}
                            >
                              <View style={styles.setLabelRow}>
                                <TouchableOpacity
                                  onPress={() => confirmDeleteSet(s)}
                                  hitSlop={{
                                    top: 8,
                                    bottom: 8,
                                    left: 8,
                                    right: 8,
                                  }}
                                  style={{ padding: 2 }}
                                >
                                  <Ionicons
                                    name="close-outline"
                                    size={24}
                                    color="#000"
                                  />
                                </TouchableOpacity>
                                <Text style={styles.setLabel}>
                                  Set {index + 1}
                                </Text>
                              </View>
                              <View style={styles.stepper}>
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  onPress={() => {
                                    const v = stepRepsValue(
                                      editingSetReps,
                                      'prev',
                                    )
                                    const next = String(v)
                                    setEditingSetReps(next)
                                    saveSetToApi(
                                      s,
                                      v,
                                      isBodyweight ? '0' : editingSetWeight,
                                      false,
                                    )
                                  }}
                                >
                                  <ArrowIcon
                                    direction="left"
                                    color="#44403c"
                                  />
                                </TouchableOpacity>
                                <TextInput
                                  style={styles.stepperValue}
                                  value={editingSetReps}
                                  onChangeText={(t) =>
                                    setRepsDecimal(setEditingSetReps, t)
                                  }
                                  onBlur={() => handleSaveSet(s)}
                                  keyboardType="decimal-pad"
                                />
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  onPress={() => {
                                    const v = stepRepsValue(
                                      editingSetReps,
                                      'next',
                                    )
                                    const next = String(v)
                                    setEditingSetReps(next)
                                    saveSetToApi(
                                      s,
                                      v,
                                      isBodyweight ? '0' : editingSetWeight,
                                      false,
                                    )
                                  }}
                                >
                                  <ArrowIcon
                                    direction="right"
                                    color="#44403c"
                                  />
                                </TouchableOpacity>
                              </View>
                              {!isBodyweight && (
                                <View style={styles.setEditRight}>
                                  <TextInput
                                    style={styles.setInput}
                                    value={editingSetWeight}
                                    onChangeText={(t) =>
                                      setWeightDecimal(setEditingSetWeight, t)
                                    }
                                    onBlur={() => handleSaveSet(s)}
                                    placeholder="lbs"
                                    keyboardType="decimal-pad"
                                  />
                                </View>
                              )}
                            </Animated.View>
                          </TouchableWithoutFeedback>
                        ) : (
                          <View key={s.id} style={styles.setRow}>
                            <View style={styles.setLabelRow}>
                              <Text style={styles.setLabel}>
                                Set {index + 1}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.setValueTouchable}
                              onPress={() => {
                                setAddingSetFor(null)
                                setEditingSetId(s.id)
                                setEditingSetReps(formatNumber(s.reps))
                                setEditingSetWeight(formatWeight(s.weight))
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={styles.setRepsCentered}>
                                <Text style={styles.setValue}>
                                  {formatNumber(s.reps)} reps
                                </Text>
                              </View>
                              {!isBodyweight && (
                                <Text style={styles.setValue}>
                                  {formatWeight(s.weight)
                                    ? `${formatWeight(s.weight)} lbs`
                                    : '—'}
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        ),
                      )}
                      <View style={styles.addSetNotesColumn}>
                        {addingSetFor === pe.id && (
                          <View
                            style={[styles.addSetRow, styles.addSetRowEditing]}
                          >
                            <TouchableOpacity
                              onPress={() => setAddingSetFor(null)}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              style={styles.addSetCancelBtn}
                            >
                              <Ionicons
                                name="close-outline"
                                size={24}
                                color="#1c1917"
                              />
                            </TouchableOpacity>
                            <Text style={styles.addSetLabel}>
                              Set {pe.sets.length + 1}
                            </Text>
                            <View style={styles.addSetStepperCenter}>
                              <View style={styles.stepper}>
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  onPress={() => {
                                    const v = stepRepsValue(newSetReps, 'prev')
                                    setNewSetReps(String(v))
                                  }}
                                >
                                  <ArrowIcon
                                    direction="left"
                                    color="#1c1917"
                                  />
                                </TouchableOpacity>
                                <TextInput
                                  style={[
                                    styles.stepperValue,
                                    { color: '#1c1917' },
                                  ]}
                                  value={newSetReps}
                                  onChangeText={(t) =>
                                    setRepsDecimal(setNewSetReps, t)
                                  }
                                  keyboardType="decimal-pad"
                                >
                                </TextInput>
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  onPress={() => {
                                    const v = stepRepsValue(newSetReps, 'next')
                                    setNewSetReps(String(v))
                                  }}
                                >
                                  <ArrowIcon
                                    direction="right"
                                    color="#1c1917"
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>
                            {!isBodyweight && (
                              <TextInput
                                style={[
                                  styles.inputSmall,
                                  styles.addSetInputEditing,
                                ]}
                                value={newSetWeight}
                                onChangeText={(t) =>
                                  setWeightDecimal(setNewSetWeight, t)
                                }
                                onBlur={() => handleAddSet(pe.id, pe.sets)}
                                placeholder="Weight"
                                placeholderTextColor="#78716c"
                                keyboardType="decimal-pad"
                              />
                            )}
                          </View>
                        )}
                        <View
                          style={[
                            styles.addSetNotesRow,
                            addingSetFor === pe.id &&
                              styles.addSetNotesRowBelow,
                          ]}
                        >
                          <TouchableOpacity
                            onPress={() => {
                              if (addingSetFor === pe.id) {
                                handleAddSet(pe.id, pe.sets, true)
                                return
                              }
                              setEditingSetId(null)
                              setAddingSetFor(pe.id)
                              const last = pe.sets[pe.sets.length - 1]
                              setNewSetReps('1')
                              if (last) {
                                setNewSetWeight(formatWeight(last.weight))
                              }
                            }}
                          >
                            <Text style={styles.addSetLink}>+ Add set</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setExpandedNotesFor(pe.id)}
                            style={styles.notesLinkRow}
                          >
                            {pe.note_for_next_time ? (
                              <Ionicons
                                name="notifications"
                                size={16}
                                color="#d97706"
                                style={styles.notesBellIcon}
                              />
                            ) : null}
                            <Text style={styles.notesLink}>Note</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {expandedNotesFor === pe.id && (
                        <View style={styles.notesOverlay}>
                          <View style={styles.notesPanel}>
                            {pe.note_for_next_time ? (
                              <>
                                <Text style={styles.notesFromLastTimeLabel}>
                                  Note from last time
                                </Text>
                                <View style={styles.notesFromLastTime}>
                                  <Text style={styles.notesFromLastTimeText}>
                                    {pe.note_for_next_time}
                                  </Text>
                                </View>
                              </>
                            ) : null}
                            <View style={styles.notesSection}>
                              <Text style={styles.notesLabel}>
                                Note for next time
                              </Text>
                              <TextInput
                                style={styles.notesInput}
                                placeholder="e.g. Increase weight to 5 lbs"
                                placeholderTextColor="#a8a29e"
                                multiline
                                value={getNotesFor(pe.id).nextTimeNote}
                                onChangeText={(text) =>
                                  setNotesFor(pe.id, (prev) => ({
                                    ...prev,
                                    nextTimeNote: text,
                                  }))
                                }
                              />
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.notesDoneBtn}
                            onPress={async () => {
                              const note = (
                                getNotesFor(pe.id).nextTimeNote ?? ''
                              ).trim()
                              if (note.length === 0) {
                                setExpandedNotesFor(null)
                                return
                              }
                              try {
                                await apiRequest(
                                  `/performed-exercises/${pe.id}/note_for_next_time/`,
                                  {
                                    method: 'POST',
                                    body: { note },
                                    token,
                                  },
                                )
                                setNotesFor(pe.id, (prev) => ({
                                  ...prev,
                                  nextTimeNote: '',
                                }))
                                await fetchWorkout()
                                setExpandedNotesFor(null)
                              } catch (e) {
                                Alert.alert(
                                  'Could not save note',
                                  (e as Error)?.message ?? 'Please try again.',
                                )
                              }
                            }}
                          >
                            <Text style={styles.notesDoneText}>Done</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                )
              })
            )}

            {userExercises.length > 0 && (
              <View style={[styles.addPastExerciseSection, styles.card]}>
                <Text style={styles.addPastExerciseLabel}>
                  Add past exercise{' '}
                  <Text style={styles.addPastExerciseHint}>
                    (uses data from last time)
                  </Text>
                </Text>
                <ScrollView
                  style={styles.addPastExerciseList}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {userExercises.map((ex) => (
                    <TouchableOpacity
                      key={ex.id}
                      onPress={() => handleAddPastExercise(ex.id)}
                      disabled={addingExercise}
                      style={styles.addPastExerciseItem}
                    >
                      <Text style={styles.addPastExerciseItemText}>
                        {ex.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={[styles.addExerciseSection, styles.card]}>
              <Text style={styles.addPastExerciseLabel}>Add New Exercise</Text>
              <TextInput
                style={[styles.addExerciseInput, styles.addExerciseInputFull]}
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                placeholder="e.g. Bench Press"
                placeholderTextColor="#a8a29e"
              />
              <TouchableOpacity
                style={styles.addExerciseCheckboxRow}
                onPress={() => setNewExerciseBodyweight((v) => !v)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={newExerciseBodyweight ? 'checkbox' : 'square-outline'}
                  size={22}
                  color="#5A4A2F"
                  style={styles.addExerciseCheckboxIcon}
                />
                <Text style={styles.addExerciseCheckboxLabel}>
                  Bodyweight (no extra weight)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddExercise}
                disabled={addingExercise || !newExerciseName.trim()}
                style={[
                  styles.addExerciseBtn,
                  styles.addExerciseBtnFull,
                  (!newExerciseName.trim() || addingExercise) &&
                    styles.addExerciseBtnDisabled,
                ]}
              >
                <Text style={styles.addExerciseBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 48,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#fff4e6',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 10,
  },
  backBtn: {
    color: '#d97706',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  deleteBtn: {
    marginLeft: 16,
    padding: 4,
  },
  dateEditContainer: {
    flex: 1,
    alignItems: 'center',
  },
  dateEditActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  dateEditBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e7e5e4',
  },
  dateEditBtnText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1917',
  },
  content: { flex: 1 },
  contentInner: { padding: 24, paddingBottom: 32, backgroundColor: '#c9a882' },
  empty: {
    textAlign: 'center',
    color: '#78716c',
    paddingVertical: 32,
    fontSize: 16,
  },
  exerciseCard: {
    backgroundColor: '#fff4e6',
    borderRadius: 12,
    borderColor: '#e7e5e4',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#5A4A2F',
    // marginHorizontal: -16,
    // marginTop: -16,
    // marginBottom: 12,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff7ed',
  },
  lastText: {
    fontSize: 14,
    color: '#78716c',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: '#ffedd2',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  setRowEditing: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: -11,
    marginBottom: 8,
  },
  setLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setLabel: {
    fontSize: 18,
    color: '#44403c',
  },
  setValueTouchable: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setRepsCentered: {
    flex: 1,
    alignItems: 'center',
  },
  setInputCentered: {
    textAlign: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    minWidth: 32,
    fontSize: 18,
    fontWeight: '500',
    color: '#44403c',
    textAlign: 'center',
  },
  setValue: {
    fontSize: 18,
    color: '#44403c',
  },
  setInput: {
    width: 56,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 18,
    backgroundColor: '#fff4e6',
  },
  setEditRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSetNotesColumn: {
    marginTop: 8,
  },
  addSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addSetRowEditing: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: -11,
  },
  addSetCancelBtn: {
    padding: 4,
  },
  addSetLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1917',
  },
  addSetStepperCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSetInputEditing: {
    backgroundColor: '#fff4e6',
  },
  addSetNotesRowBelow: {
    marginTop: 8,
  },
  inputSmall: {
    width: 60,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
  },
  addSetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addSetBtnText: {
    color: '#d97706',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelBtn: { paddingHorizontal: 8 },
  cancelBtnText: { color: '#78716c', fontSize: 14 },
  addSetLink: {
    marginTop: 0,
    fontSize: 14,
    color: '#d97706',
    fontWeight: '600',
  },
  addSetNotesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  notesLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notesBellIcon: {
    marginRight: 4,
  },
  notesLink: {
    fontSize: 14,
    color: '#d97706',
    fontWeight: '600',
  },
  cardBodyWrapper: {
    position: 'relative',
    backgroundColor: '#fff4e6',
    padding: 16,
  },
  notesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff4e6',
  },
  notesPanel: {
    marginTop: 0,
    padding: 16,
  },
  notesFromLastTime: {
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#ffedd2',
    borderRadius: 8,
  },
  notesFromLastTimeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78716c',
    marginBottom: 4,
  },
  notesFromLastTimeText: {
    fontSize: 14,
    color: '#44403c',
  },
  notesSection: {
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#44403c',
    marginBottom: 6,
  },
  notesInput: {
    height: 36,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  notesDoneBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  notesDoneText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#d97706',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  addPastExerciseSection: {
    marginTop: 24,
  },
  addPastExerciseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  addPastExerciseHint: {
    fontWeight: '400',
    color: '#a8a29e',
    textTransform: 'none',
  },
  addPastExerciseList: {
    maxHeight: 200,
  },
  addPastExerciseItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    backgroundColor: '#ffedd2',
    borderRadius: 8,
  },
  addPastExerciseItemText: {
    fontSize: 14,
    color: '#44403c',
    fontWeight: '500',
  },
  addExerciseSection: {
    marginTop: 24,
  },
  addExerciseInput: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff4e6',
    marginTop: 8,
  },
  addExerciseInputFull: {
    width: '100%',
  },
  addExerciseCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  addExerciseCheckboxIcon: {
    marginRight: 8,
  },
  addExerciseCheckboxLabel: {
    fontSize: 15,
    color: '#44403c',
  },
  addExerciseBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    marginTop: 12,
  },
  addExerciseBtnFull: {
    width: '100%',
  },
  addExerciseBtnDisabled: { opacity: 0.5 },
  addExerciseBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
})
