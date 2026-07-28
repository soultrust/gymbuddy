import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

import { Text } from '../components/AppText'
import { useAuth } from '../contexts/AuthContext'
import { useAccent } from '../contexts/AccentContext'
import { typography } from '../theme/tokens'
import { colors } from '../theme/colors'
import { apiRequest } from '../api/client'
import type { Workout, PerformedExercise } from '../types/workout'
import { formatNumber, formatWeight, formatSessionListTitle, calendarDayKey, daysWithMultipleSessions } from '../utils/format'
import ArrowIcon from '../components/ArrowIcon'
import LoadingSpinner from '../components/LoadingSpinner'
import CreateSessionModal from '../components/CreateSessionModal'

type NavProps = {
  navigation: {
    navigate: (screen: string, params: { workoutId: number }) => void
  }
}

export default function WorkoutsScreen({ navigation }: NavProps) {
  const { token, logout } = useAuth()
  const { accent } = useAccent()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [collapseEmpty, setCollapseEmpty] = useState(true)

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

  useEffect(() => {
    fetchWorkouts().finally(() => {
      setLoading(false)
      setHasLoadedOnce(true)
    })
  }, [fetchWorkouts])

  useFocusEffect(
    useCallback(() => {
      if (hasLoadedOnce) {
        fetchWorkouts()
      }
    }, [fetchWorkouts, hasLoadedOnce]),
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchWorkouts()
    setRefreshing(false)
  }

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

  const multiSessionDays = useMemo(
    () => daysWithMultipleSessions(workouts.map((w) => w.date)),
    [workouts],
  )

  const safeIndex = Math.min(exerciseIndex, Math.max(0, exerciseColumns.length - 1))
  const selectedExercise = exerciseColumns[safeIndex] ?? null
  const canGoPrev = safeIndex > 0
  const canGoNext =
    safeIndex < exerciseColumns.length - 1 && exerciseColumns.length > 1

  const getExerciseForWorkout = (workout: Workout, exerciseId: number) =>
    (workout.exercises || []).find((pe) => pe.exercise?.id === exerciseId)

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
                <Text style={styles.chipRepsText}>{formatNumber(s.reps)}</Text>
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
    return <LoadingSpinner />
  }

  return (
    <View style={styles.container}>

      <CreateSessionModal
        visible={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onCreated={async (workoutId) => {
          setShowCreateForm(false)
          await fetchWorkouts()
          navigation.navigate('WorkoutDetail', { workoutId })
        }}
        token={token}
        workouts={workouts}
      />

      <View style={styles.toolbar}>
        <TouchableOpacity
          style={[styles.addSessionBtn, { backgroundColor: accent }]}
          onPress={() => setShowCreateForm(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addSessionBtnText}>Add New Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.hideEmptyRow}
          onPress={() => setCollapseEmpty((v) => !v)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={collapseEmpty ? 'checkbox' : 'square-outline'}
            size={22}
            color={collapseEmpty ? accent : '#a8a29e'}
          />
          <Text style={styles.hideEmptyLabel}>Hide days that have no data</Text>
        </TouchableOpacity>
      </View>

      {workouts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.empty}>No workouts yet</Text>
          <Text style={styles.emptyHint}>
            Use the same email on web and here to see the same data. If you
            added workouts on the web, log out and log in again with that email.
          </Text>
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
              <View style={styles.thDateSpacer} />
              <View style={styles.thExercise}>
                <TouchableOpacity
                  onPress={() => setExerciseIndex((i) => Math.max(0, i - 1))}
                  disabled={!canGoPrev}
                  style={[styles.arrowBtn, !canGoPrev && styles.arrowDisabled]}
                >
                  <ArrowIcon
                    direction="left"
                    color={canGoPrev ? colors.brown900 : 'rgba(90, 74, 47, 0.3)'}
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
                  <ArrowIcon
                    direction="right"
                    color={canGoNext ? colors.brown900 : 'rgba(90, 74, 47, 0.3)'}
                  />
                </TouchableOpacity>
              </View>
            </View>
            {workouts
              .filter(
                (item) =>
                  !selectedExercise ||
                  !collapseEmpty ||
                  getExerciseForWorkout(item, selectedExercise.id) != null,
              )
              .map((item) => {
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
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {formatSessionListTitle(
                          item.date,
                          multiSessionDays.has(calendarDayKey(item.date)),
                        )}
                      </Text>
                    </View>
                    <View style={styles.tdExercise}>
                      {pe ? renderSetChips(pe) : <Text style={styles.dash}>—</Text>}
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
    backgroundColor: colors.detailBg,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  addSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  addSessionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  hideEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
    maxWidth: '48%',
  },
  hideEmptyLabel: {
    flexShrink: 1,
    fontSize: 13,
    color: '#44403c',
    lineHeight: 18,
  },
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
  table: {
    backgroundColor: colors.cream,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.tableHeader,
    alignItems: 'center',
  },
  thDateSpacer: {
    width: 110,
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
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
    fontSize: 18,
    fontFamily: typography.font.bodyBold,
    fontWeight: '700',
    color: colors.brown900,
    textAlign: 'center',
    marginBottom: 8,
  },
  exerciseCounter: {
    fontSize: 11,
    color: colors.brown900,
    marginBottom: 4,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f4',
    backgroundColor: colors.cream,
  },
  tdTitle: {
    width: 110,
    paddingVertical: 12,
    paddingRight: 12,
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
    fontSize: 16,
    fontFamily: typography.font.bodyBold,
    fontWeight: '700',
    color: '#1c1917',
    textAlign: 'right',
  },
  dash: {
    fontSize: 17,
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
    borderWidth: 1,
    borderColor: colors.stone700,
    borderRadius: 4,
    overflow: 'hidden',
  },
  chipInner: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipReps: {
    backgroundColor: colors.setRowBgTint,
  },
  chipRepsAdjacent: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  chipWeight: {
    backgroundColor: colors.setRowBg,
    borderLeftWidth: 1,
    borderLeftColor: colors.stone700,
  },
  chipText: {
    fontSize: 18,
    fontFamily: typography.font.bodyBold,
    fontWeight: '700',
    color: '#000',
  },
  chipRepsText: {
    fontSize: 18,
    fontFamily: typography.font.bodyBold,
    fontWeight: '700',
    color: '#000',
  },
})
