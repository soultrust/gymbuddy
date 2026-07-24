import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

import { useAuth } from '../contexts/AuthContext'
import { apiRequest } from '../api/client'
import type { Workout, PerformedExercise } from '../types/workout'
import { formatNumber, formatWeight, formatMonthDay } from '../utils/format'
import ArrowIcon from '../components/ArrowIcon'
import LoadingSpinner from '../components/LoadingSpinner'
import CreateSessionModal from '../components/CreateSessionModal'

type NavProps = {
  navigation: {
    navigate: (screen: string, params: { workoutId: number }) => void
  }
}

export default function WorkoutsScreen({ navigation }: NavProps) {
  const { token, userEmail, logout } = useAuth()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [exerciseIndex, setExerciseIndex] = useState(0)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
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

  const handleLogout = async () => {
    await logout()
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>
            <Text style={styles.titleGym}>GYM</Text>
            <Text style={styles.titleBuddy}>BUDDY</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowHeaderMenu(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu" size={26} color="#1c1917" />
        </TouchableOpacity>
      </View>

      {/* Header hamburger dropdown */}
      <Modal
        visible={showHeaderMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowHeaderMenu(false)}
      >
        <TouchableOpacity
          style={styles.headerMenuBackdrop}
          onPress={() => setShowHeaderMenu(false)}
          activeOpacity={1}
        >
          <TouchableOpacity
            style={styles.headerMenuCard}
            activeOpacity={1}
            onPress={() => {}}
          >
            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={() => setShowHeaderMenu(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={18} color="#1c1917" />
              <Text style={styles.headerMenuItemText}>User Profile</Text>
            </TouchableOpacity>

            <View style={styles.headerMenuDivider} />

            <TouchableOpacity
              style={styles.headerMenuItem}
              onPress={() => {
                setShowHeaderMenu(false)
                handleLogout()
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color="#dc2626" />
              <Text style={[styles.headerMenuItemText, { color: '#dc2626' }]}>Logout</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          onPress={() => setShowMenu(false)}
          activeOpacity={1}
        >
          <TouchableOpacity
            style={styles.menuCard}
            activeOpacity={1}
            onPress={() => {}}
          >
            <Text style={styles.menuTitle}>Options</Text>

            <TouchableOpacity
              style={styles.menuCheckboxRow}
              onPress={() => setCollapseEmpty((v) => !v)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={collapseEmpty ? 'checkbox' : 'square-outline'}
                size={22}
                color={collapseEmpty ? '#d97706' : '#a8a29e'}
              />
              <Text style={styles.menuCheckboxLabel}>
                Hide days that have no data
              </Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuAddBtn}
              onPress={() => {
                setShowMenu(false)
                setShowCreateForm(true)
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.menuAddBtnText}>Add New Session</Text>
            </TouchableOpacity>
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
                  style={styles.menuButton}
                  onPress={() => setShowMenu(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="menu-outline" size={28} color="#fff4e6" />
                </TouchableOpacity>
              </View>
              <View style={styles.thExercise}>
                <TouchableOpacity
                  onPress={() => setExerciseIndex((i) => Math.max(0, i - 1))}
                  disabled={!canGoPrev}
                  style={[styles.arrowBtn, !canGoPrev && styles.arrowDisabled]}
                >
                  <ArrowIcon
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
                  <ArrowIcon
                    direction="right"
                    color={canGoNext ? '#fff4e6' : 'rgb(255 255 255 / 0.3)'}
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
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {formatMonthDay(item.date)}
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
    backgroundColor: '#c9a882',
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
    zIndex: 200,
    elevation: 200, // Android
  },
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Oswald_500Medium',
    letterSpacing: 0.5,
  },
  titleGym: {
    color: 'rgba(146, 64, 14, 0.5)',
  },
  titleBuddy: {
    color: '#92400e',
  },
  // Header hamburger dropdown
  headerMenuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  headerMenuCard: {
    position: 'absolute',
    top: 108,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 180,
    overflow: 'hidden',
  },
  headerMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  headerMenuItemText: {
    fontSize: 15,
    color: '#1c1917',
    fontWeight: '500',
  },
  headerMenuDivider: {
    height: 1,
    backgroundColor: '#f5f5f4',
    marginHorizontal: 16,
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
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  menuCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 20,
  },
  menuCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  menuCheckboxLabel: {
    flex: 1,
    fontSize: 15,
    color: '#44403c',
    lineHeight: 20,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e7e5e4',
    marginVertical: 20,
  },
  menuAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 14,
  },
  menuAddBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  table: {
    backgroundColor: '#fff',
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
