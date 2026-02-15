import React, { useCallback, useEffect, useState, useRef } from 'react'
import {
  ActivityIndicator,
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
import Svg, { Path } from 'react-native-svg'

import { useAuth } from '../contexts/AuthContext'
import { apiRequest } from '../api/client'

type Workout = {
  id: number
  date: string
  date_display?: string
  name: string
  notes: string
  exercises: PerformedExercise[]
}

type PerformedExercise = {
  id: number
  exercise: { id: number; name: string }
  user_preferred_name?: string
  order: number
  sets: SetEntry[]
  note_for_next_time?: string
}

type SetEntry = {
  id: number
  order: number
  reps: number
  weight?: string | number
  notes?: string
}

type TemplateExercise = {
  exercise: { id: number; name: string }
  user_preferred_name?: string
  order: number
  last_sets: SetEntry[]
}

/** Play-style arrow for stepper: right = increase, left = decrease. */
function StepperArrowIcon({
  direction,
  color,
  size = 18,
}: {
  direction: 'left' | 'right'
  color: string
  size?: number
}) {
  const path =
    'M21.415,12.554 L2.418,0.311 C1.291,-0.296 0,-0.233 0,1.946 L0,26.054 C0,28.046 1.385,28.36 2.418,27.689 L21.415,15.446 C22.197,14.647 22.197,13.353 21.415,12.554'
  const flip = direction === 'left'
  return (
    <Svg
      width={size}
      height={size}
      viewBox="-1 -1 26 30"
      style={[
        { backgroundColor: 'transparent' },
        flip ? { transform: [{ scaleX: -1 }] } : undefined,
      ]}
    >
      <Path fill={color} d={path} />
    </Svg>
  )
}

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
  const [loading, setLoading] = useState(true)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [addingExercise, setAddingExercise] = useState(false)
  const [addingSetFor, setAddingSetFor] = useState<number | null>(null)
  const [newSetReps, setNewSetReps] = useState('10')
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
      setWorkout(data)
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

  useEffect(() => {
    Promise.all([fetchWorkout(), fetchPrevious()]).finally(() =>
      setLoading(false),
    )
  }, [fetchWorkout, fetchPrevious])

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

  const setWeightInteger = (setter: (v: string) => void, text: string) =>
    setter(text.split('.')[0].replace(/[^0-9]/g, ''))

  const formatWeight = (w: string | number | undefined) =>
    w != null && w !== '' ? String(Math.round(Number(w))) : ''

  const formatLastSets = (sets: SetEntry[]) => {
    if (sets.length === 0) return null
    return sets
      .map((s) => {
        const w = formatWeight(s.weight)
        return `${s.reps} reps${w ? ` @ ${w}lbs` : ''}`
      })
      .join(', ')
  }

  const handleAddSet = async (
    performedExerciseId: number,
    currentSets: SetEntry[],
  ) => {
    if (!token || !workout) return
    const nextOrder =
      currentSets.length > 0
        ? Math.max(...currentSets.map((s) => s.order)) + 1
        : 1
    const reps = parseInt(newSetReps, 10)
    if (isNaN(reps) || reps < 0) return
    try {
      await apiRequest(`/performed-exercises/${performedExerciseId}/sets/`, {
        method: 'POST',
        token,
        body: {
          order: nextOrder,
          reps,
          weight: newSetWeight ? Math.round(parseFloat(newSetWeight)) : null,
          notes: '',
        },
      })
      setAddingSetFor(null)
      setNewSetReps('10')
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
          weight: weight ? Math.round(parseFloat(weight)) : null,
        },
      })
      if (exitEdit) setEditingSetId(null)
      await fetchWorkout()
    } catch {
      // ignore
    }
  }

  const handleSaveSet = async (set: SetEntry) => {
    const reps = parseInt(editingSetReps, 10)
    await saveSetToApi(set, reps, editingSetWeight, true)
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
    if (editingSetId === null || !workout) return
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
    if (!token || !newExerciseName.trim()) return
    setAddingExercise(true)
    try {
      const exercises = workout?.exercises ?? []
      const nextOrder =
        exercises.length > 0
          ? Math.max(...exercises.map((e) => e.order)) + 1
          : 1
      await apiRequest(`/workouts/${workoutId}/exercises/`, {
        method: 'POST',
        token,
        body: {
          exercise_name: newExerciseName.trim(),
          order: nextOrder,
          user_preferred_name: '',
        },
      })
      setNewExerciseName('')
      await fetchWorkout()
    } catch {
      // ignore
    } finally {
      setAddingExercise(false)
    }
  }

  /** Format as MM/DD (e.g. 03/17) - no year */
  const formatMonthDay = (d: string) => {
    const date = new Date(d)
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${mm}/${dd}`
  }

  /** Format as "FRI Feb 13, 2006" */
  const formatFullDate = (d: string) => {
    const date = new Date(d)
    const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    const weekday = weekdays[date.getDay()]
    const month = months[date.getMonth()]
    const day = date.getDate()
    const year = date.getFullYear()
    return `${weekday} ${month} ${day}, ${year}`
  }

  if (loading || !workout) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d97706" />
      </View>
    )
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
            <Ionicons name="trash-outline" size={22} color="#78716c" />
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
                      {pe.sets.map((s) =>
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
                                  Set {s.order}
                                </Text>
                              </View>
                              <View style={styles.stepper}>
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  onPress={() => {
                                    const v = Math.max(
                                      0,
                                      parseInt(editingSetReps, 10) - 1,
                                    )
                                    const next = String(isNaN(v) ? 0 : v)
                                    setEditingSetReps(next)
                                    saveSetToApi(
                                      s,
                                      parseInt(next, 10),
                                      editingSetWeight,
                                      false,
                                    )
                                  }}
                                >
                                  <StepperArrowIcon
                                    direction="left"
                                    color="#44403c"
                                  />
                                </TouchableOpacity>
                                <Text style={styles.stepperValue}>
                                  {editingSetReps || '0'}
                                </Text>
                                <TouchableOpacity
                                  style={styles.stepperBtn}
                                  onPress={() => {
                                    const v =
                                      (parseInt(editingSetReps, 10) || 0) + 1
                                    const next = String(v)
                                    setEditingSetReps(next)
                                    saveSetToApi(s, v, editingSetWeight, false)
                                  }}
                                >
                                  <StepperArrowIcon
                                    direction="right"
                                    color="#44403c"
                                  />
                                </TouchableOpacity>
                              </View>
                              <View style={styles.setEditRight}>
                                <TextInput
                                  style={styles.setInput}
                                  value={editingSetWeight}
                                  onChangeText={(t) =>
                                    setWeightInteger(setEditingSetWeight, t)
                                  }
                                  onBlur={() => handleSaveSet(s)}
                                  placeholder="lbs"
                                  keyboardType="numeric"
                                />
                              </View>
                            </Animated.View>
                          </TouchableWithoutFeedback>
                        ) : (
                          <View key={s.id} style={styles.setRow}>
                            <View style={styles.setLabelRow}>
                              <Text style={styles.setLabel}>Set {s.order}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.setValueTouchable}
                              onPress={() => {
                                setEditingSetId(s.id)
                                setEditingSetReps(String(s.reps))
                                setEditingSetWeight(formatWeight(s.weight))
                              }}
                              activeOpacity={0.7}
                            >
                              <View style={styles.setRepsCentered}>
                                <Text style={styles.setValue}>
                                  {s.reps} reps
                                </Text>
                              </View>
                              <Text style={styles.setValue}>
                                {formatWeight(s.weight)
                                  ? `${formatWeight(s.weight)} lbs`
                                  : '—'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ),
                      )}
                      <View style={styles.addSetNotesRow}>
                        {addingSetFor === pe.id ? (
                          <View style={styles.addSetRow}>
                            <View style={styles.stepper}>
                              <TouchableOpacity
                                style={styles.stepperBtn}
                                onPress={() => {
                                  const v = Math.max(
                                    0,
                                    parseInt(newSetReps, 10) - 1,
                                  )
                                  setNewSetReps(String(isNaN(v) ? 0 : v))
                                }}
                              >
                                <StepperArrowIcon
                                  direction="left"
                                  color="#44403c"
                                />
                              </TouchableOpacity>
                              <Text style={styles.stepperValue}>
                                {newSetReps || '0'}
                              </Text>
                              <TouchableOpacity
                                style={styles.stepperBtn}
                                onPress={() => {
                                  const v = (parseInt(newSetReps, 10) || 0) + 1
                                  setNewSetReps(String(v))
                                }}
                              >
                                <StepperArrowIcon
                                  direction="right"
                                  color="#44403c"
                                />
                              </TouchableOpacity>
                            </View>
                            <TextInput
                              style={styles.inputSmall}
                              value={newSetWeight}
                              onChangeText={(t) =>
                                setWeightInteger(setNewSetWeight, t)
                              }
                              placeholder="Weight"
                              keyboardType="numeric"
                            />
                            <TouchableOpacity
                              onPress={() => handleAddSet(pe.id, pe.sets)}
                            >
                              <Text style={styles.addSetBtnText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setAddingSetFor(null)}
                              style={styles.cancelBtn}
                            >
                              <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => {
                              setAddingSetFor(pe.id)
                              const last = pe.sets[pe.sets.length - 1]
                              if (last) {
                                setNewSetReps(String(last.reps))
                                setNewSetWeight(formatWeight(last.weight))
                              }
                            }}
                          >
                            <Text style={styles.addSetLink}>+ Add set</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => setExpandedNotesFor(pe.id)}
                        >
                          <Text style={styles.notesLink}>Notes</Text>
                        </TouchableOpacity>
                      </View>

                      {expandedNotesFor === pe.id && (
                        <View style={styles.notesOverlay}>
                          <View style={styles.notesPanel}>
                            {pe.note_for_next_time ? (
                              <View style={styles.notesFromLastTime}>
                                <Text style={styles.notesFromLastTimeLabel}>
                                  Note from last time
                                </Text>
                                <Text style={styles.notesFromLastTimeText}>
                                  {pe.note_for_next_time}
                                </Text>
                              </View>
                            ) : null}
                            <View style={styles.notesSection}>
                              <Text style={styles.notesLabel}>
                                Notes{' '}
                                <Text style={styles.notesLabelHint}>
                                  (shown on the next instance of this exercise)
                                </Text>
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
                              setExpandedNotesFor(null)
                              if (note.length === 0) return
                              try {
                                await apiRequest(
                                  `/performed-exercises/${pe.id}/note_for_next_time/`,
                                  {
                                    method: 'POST',
                                    body: { note },
                                    token,
                                  },
                                )
                                fetchWorkout()
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

            <View style={styles.addExerciseRow}>
              <TextInput
                style={styles.addExerciseInput}
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                placeholder="Add exercise (e.g. Bench Press)"
                placeholderTextColor="#a8a29e"
              />
              <TouchableOpacity
                onPress={handleAddExercise}
                disabled={addingExercise || !newExerciseName.trim()}
                style={[
                  styles.addExerciseBtn,
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
  container: { flex: 1, backgroundColor: '#c9a882' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
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
  contentInner: { padding: 24, paddingBottom: 32 },
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
    // padding: 16,
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
  addSetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#78716c',
    marginBottom: 4,
    textTransform: 'uppercase',
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
  notesLabelHint: {
    fontWeight: '400',
    color: '#78716c',
    fontSize: 12,
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
  addExerciseRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 24,
  },
  addExerciseInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff4e6',
  },
  addExerciseBtn: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 12,
  },
  addExerciseBtnDisabled: { opacity: 0.5 },
  addExerciseBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
