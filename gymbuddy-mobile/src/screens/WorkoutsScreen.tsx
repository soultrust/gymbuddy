import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import Ionicons from '@expo/vector-icons/Ionicons'
import Svg, { Path } from 'react-native-svg'

import { useAuth } from '../contexts/AuthContext'
import { apiRequest } from '../api/client'

type TemplateSetEntry = {
  order: number
  reps: number
  weight?: string | number | null
  notes?: string
}

type TemplateExercise = {
  exercise: { id: number; name: string }
  user_preferred_name?: string
  order: number
  last_sets?: TemplateSetEntry[]
}

type NavProps = {
  navigation: {
    navigate: (screen: string, params: { workoutId: number }) => void
  }
}

type SetEntry = {
  order: number
  reps: number
  weight?: string | number
  notes?: string
}

type PerformedExercise = {
  id?: number
  exercise: { id: number; name: string }
  user_preferred_name?: string
  order: number
  sets: SetEntry[]
}

type Workout = {
  id: number
  date: string
  date_display?: string
  name: string
  notes: string
  exercises: PerformedExercise[]
}

/** Play-style arrow (right-pointing). Set direction="left" for previous. */
function TableArrowIcon({
  direction,
  color,
  size = 20,
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

export default function WorkoutsScreen({ navigation }: NavProps) {
  const { token, userEmail, logout } = useAuth()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [template, setTemplate] = useState<TemplateExercise[]>([])
  const [createDate, setCreateDate] = useState(() => new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [createNotes, setCreateNotes] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [useTemplate, setUseTemplate] = useState(true)

  const fetchWorkouts = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiRequest<Workout[] | { results: Workout[] }>(
        '/workouts/',
        { token },
      )
      setWorkouts(Array.isArray(data) ? data : (data.results ?? []))
    } catch (err) {
      setWorkouts([])
      // 401 = wrong or expired token; clear so user can log in again (same account as web)
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        (err as { status?: number }).status === 401
      ) {
        await logout()
      }
    }
  }, [token, logout])

  const fetchTemplate = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiRequest<TemplateExercise[]>('/workouts/template/', {
        token,
      })
      setTemplate(Array.isArray(data) ? data : [])
    } catch {
      setTemplate([])
    }
  }, [token])

  useEffect(() => {
    fetchWorkouts().finally(() => {
      setLoading(false)
      setHasLoadedOnce(true)
    })
  }, [fetchWorkouts])

  // Refresh data when screen comes into focus (e.g., when navigating back)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we've already loaded once (skip initial mount)
      if (hasLoadedOnce) {
        fetchWorkouts()
      }
    }, [fetchWorkouts, hasLoadedOnce]),
  )

  useEffect(() => {
    if (showCreateForm) {
      fetchTemplate()
      setCreateDate(new Date())
    }
  }, [showCreateForm, fetchTemplate])

  const handleCreateSubmit = async () => {
    if (!token) return
    setCreateError(null)
    setCreateSubmitting(true)
    try {
      const dateISO = createDate.toISOString().slice(0, 10)
      const workout = await apiRequest<Workout>('/workouts/', {
        method: 'POST',
        token,
        body: {
          date: `${dateISO}T12:00:00.000Z`,
          name: '',
          notes: createNotes.trim() || '',
        },
      })
      if (useTemplate && template.length > 0) {
        for (const t of template) {
          const performed = await apiRequest<PerformedExercise>(
            `/workouts/${workout.id}/exercises/`,
            {
              method: 'POST',
              token,
              body: {
                exercise: t.exercise.id,
                user_preferred_name: t.user_preferred_name || '',
                order: t.order,
              },
            },
          )
          const sets = t.last_sets ?? []
          for (const s of sets) {
            await apiRequest(`/performed-exercises/${performed.id}/sets/`, {
              method: 'POST',
              token,
              body: {
                order: s.order,
                reps: s.reps,
                weight:
                  s.weight != null && s.weight !== '' ? Number(s.weight) : null,
                notes: s.notes ?? '',
              },
            })
          }
        }
      }
      setShowCreateForm(false)
      setCreateDate(new Date())
      setCreateNotes('')
      setUseTemplate(true)
      await fetchWorkouts()
      if (workout.id) {
        navigation.navigate('WorkoutDetail', { workoutId: workout.id })
      }
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Failed to create workout',
      )
    } finally {
      setCreateSubmitting(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchWorkouts()
    setRefreshing(false)
  }

  const handleLogout = async () => {
    await logout()
  }

  /** Format as M/DD (e.g. 3/17) for workout list - no year, no leading zero on month */
  const formatMonthDay = (d: string) => {
    const date = new Date(d)
    const mm = String(date.getMonth() + 1)
    const dd = String(date.getDate()).padStart(2, '0')
    return `${mm}/${dd}`
  }

  // Build ordered list of exercises (by first appearance across workouts)
  const exerciseColumns = useMemo(() => {
    const map = new Map<number, string>()
    const ids: number[] = []
    for (const w of workouts) {
      for (const pe of w.exercises || []) {
        const id = pe.exercise?.id
        const name = pe.user_preferred_name || pe.exercise?.name || ''
        if (id && name && !map.has(id)) {
          map.set(id, name)
          ids.push(id)
        }
      }
    }
    return ids.map((id) => ({ id, name: map.get(id) ?? '' }))
  }, [workouts])

  const safeIndex = Math.min(
    exerciseIndex,
    Math.max(0, exerciseColumns.length - 1),
  )
  const selectedExercise = exerciseColumns[safeIndex] ?? null
  const canGoPrev = safeIndex > 0
  const canGoNext =
    safeIndex < exerciseColumns.length - 1 && exerciseColumns.length > 1

  const getExerciseForWorkout = (workout: Workout, exerciseId: number) =>
    (workout.exercises || []).find((pe) => pe.exercise?.id === exerciseId)

  const formatWeight = (w: string | number | undefined) =>
    w != null && w !== '' ? String(Math.round(Number(w))) : ''

  const renderSetChips = (pe: PerformedExercise) => {
    const sets = pe.sets || []
    if (sets.length === 0) return <Text style={styles.dash}>—</Text>
    return (
      <View style={styles.chipRow}>
        {sets.map((s, i) => {
          const hasWeight = !!formatWeight(s.weight)
          return (
            <View key={i} style={styles.chip}>
              <View
                style={[
                  styles.chipInner,
                  styles.chipReps,
                  hasWeight && styles.chipRepsAdjacent,
                ]}
              >
                <Text style={styles.chipRepsText}>{s.reps}</Text>
              </View>
              {hasWeight ? (
                <View style={[styles.chipInner, styles.chipWeight]}>
                  <Text style={styles.chipText}>{formatWeight(s.weight)}</Text>
                </View>
              ) : null}
            </View>
          )
        })}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#d97706" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>GymBuddy</Text>
          {userEmail ? (
            <Text style={styles.userEmail} numberOfLines={1}>
              {userEmail}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Log out</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showCreateForm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!createSubmitting) {
            setShowCreateForm(false)
            setShowDatePicker(false)
          }
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            if (!createSubmitting) {
              setShowCreateForm(false)
              setShowDatePicker(false)
            }
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={styles.modalContent}
          >
            <Text style={styles.modalTitle}>New Workout</Text>
            <View style={styles.templateCheckRow}>
              <Switch
                value={useTemplate}
                onValueChange={setUseTemplate}
                disabled={createSubmitting}
                trackColor={{ false: '#d6d3d1', true: '#f59e0b' }}
                thumbColor="#fff"
              />
              <Text style={styles.templateCheckLabel}>
                Use previous session as starting template
              </Text>
            </View>
            {useTemplate && template.length > 0 && (
              <Text style={styles.modalTemplate}>
                Based on last workout:{' '}
                {template.map((t) => t.exercise.name).join(', ')}
              </Text>
            )}
            <Text style={styles.inputLabel}>Date</Text>
            <TouchableOpacity
              style={styles.modalInput}
              onPress={() => !createSubmitting && setShowDatePicker(true)}
              disabled={createSubmitting}
            >
              <Text style={styles.dateButtonText}>
                {createDate.toLocaleDateString(undefined, {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={createDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_event: unknown, selectedDate?: Date) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false)
                    }
                    if (selectedDate) setCreateDate(selectedDate)
                  }}
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.datePickerDoneBtn}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <Text style={styles.inputLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={createNotes}
              onChangeText={setCreateNotes}
              placeholder="Any notes..."
              placeholderTextColor="#a8a29e"
              multiline
              numberOfLines={3}
              editable={!createSubmitting}
            />
            {createError && (
              <Text style={styles.modalError}>{createError}</Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  if (!createSubmitting) {
                    setShowCreateForm(false)
                    setShowDatePicker(false)
                  }
                }}
                disabled={createSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalCreateBtn,
                  createSubmitting && styles.modalCreateBtnDisabled,
                ]}
                onPress={handleCreateSubmit}
                disabled={createSubmitting}
              >
                {createSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.empty}>No workouts yet</Text>
          <Text style={styles.emptyHint}>
            Use the same email on web and here to see the same data. If you
            added workouts on the web, log out and log in again with that email.
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateForm(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={24} color="#d97706" />
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <View style={styles.thAddButton}>
                <TouchableOpacity
                  style={[styles.addButton]}
                  onPress={() => setShowCreateForm(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={34} color="#1c1917" />
                </TouchableOpacity>
              </View>
              <View style={styles.thExercise}>
                <TouchableOpacity
                  onPress={() => setExerciseIndex((i) => Math.max(0, i - 1))}
                  disabled={!canGoPrev}
                  style={[styles.arrowBtn, !canGoPrev && styles.arrowDisabled]}
                >
                  <TableArrowIcon
                    direction="left"
                    color={canGoPrev ? '#fff4e6' : 'rgb(255 255 255 / 0.3)'}
                  />
                </TouchableOpacity>
                <View style={styles.exerciseNameColumn}>
                  {exerciseColumns.length > 1 && (
                    <Text style={styles.exerciseCounter}>
                      {safeIndex + 1} / {exerciseColumns.length}
                    </Text>
                  )}
                  <Text style={styles.exerciseName} numberOfLines={1}>
                    {selectedExercise?.name ?? '—'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setExerciseIndex((i) =>
                      Math.min(Math.max(0, exerciseColumns.length - 1), i + 1),
                    )
                  }
                  disabled={!canGoNext}
                  style={[styles.arrowBtn, !canGoNext && styles.arrowDisabled]}
                >
                  <TableArrowIcon
                    direction="right"
                    color={canGoNext ? '#fff4e6' : 'rgb(255 255 255 / 0.3)'} //'#a8a29e'
                  />
                </TouchableOpacity>
              </View>
            </View>
            {workouts.map((item) => {
              const pe = selectedExercise
                ? getExerciseForWorkout(item, selectedExercise.id)
                : null
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.row}
                  onPress={() =>
                    navigation.navigate('WorkoutDetail', { workoutId: item.id })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.tdTitle}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {formatMonthDay(item.date)}
                    </Text>
                  </View>
                  <View style={styles.tdExercise}>
                    {pe ? (
                      renderSetChips(pe)
                    ) : (
                      <Text style={styles.dash}>—</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#c9a882',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  userEmail: {
    fontSize: 14,
    color: '#78716c',
    marginTop: 2,
  },
  logout: {
    color: '#d97706',
    fontSize: 16,
    fontWeight: '500',
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24, paddingBottom: 32 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 48,
  },
  empty: {
    textAlign: 'center',
    color: '#78716c',
    fontSize: 16,
    marginBottom: 12,
  },
  emptyHint: {
    textAlign: 'center',
    color: '#a8a29e',
    fontSize: 14,
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 16,
  },
  modalTemplate: {
    fontSize: 14,
    color: '#57534e',
    marginBottom: 16,
  },
  templateCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  templateCheckLabel: {
    flex: 1,
    fontSize: 15,
    color: '#44403c',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#44403c',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#1c1917',
  },
  datePickerContainer: {
    marginBottom: 16,
  },
  datePickerDoneBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d97706',
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalError: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#78716c',
    fontSize: 16,
    fontWeight: '500',
  },
  modalCreateBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  modalCreateBtnDisabled: {
    opacity: 0.7,
  },
  modalCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  table: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 0,
    borderColor: '#e7e5e4',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    backgroundColor: '#5A4A2F',
    alignItems: 'center',
  },
  thAddButton: {
    width: 80,
    paddingHorizontal: 16,
  },
  thExercise: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-start',
  },
  exerciseNameColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  thText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#44403c',
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.2,
    // shadowRadius: 3,
    // elevation: 3,
  },
  arrowDisabled: {},
  arrowText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#44403c',
  },
  arrowTextDisabled: {
    color: '#a8a29e',
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  exerciseCounter: {
    fontSize: 11,
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
    backgroundColor: '#fff4e6',
  },
  tdTitle: {
    width: 75,
    paddingVertical: 12,
    paddingRight: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    textAlign: 'right',
  },
  tdExercise: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1c1917',
  },
  dash: {
    fontSize: 14,
    color: '#57534e',
  },
  chipRow: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 9,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipInner: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipReps: {
    backgroundColor: '#fdba74',
  },
  chipRepsAdjacent: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  chipWeight: {
    backgroundColor: '#ffe5d0',
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderLeftWidth: 0,
  },
  chipText: {
    fontSize: 15,
    color: '#000',
  },
  chipRepsText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
})
