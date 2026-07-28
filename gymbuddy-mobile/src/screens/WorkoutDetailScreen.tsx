import React, { useState } from 'react'
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import Ionicons from '@expo/vector-icons/Ionicons'

import { Text, TextInput } from '../components/AppText'
import { useAuth } from '../contexts/AuthContext'
import { formatWeight, formatSessionTitle, formatNumber } from '../utils/format'
import { stepRepsValue } from '../utils/numberInput'
import ArrowIcon from '../components/ArrowIcon'
import LoadingSpinner from '../components/LoadingSpinner'
import { colors } from '../theme/colors'
import { typography } from '../theme/tokens'
import { useAccent } from '../contexts/AccentContext'
import { useWorkoutDetail } from '../hooks/useWorkoutDetail'

export default function WorkoutDetailScreen({
  route,
  navigation,
}: {
  route: { params: { workoutId: number } }
  navigation: { goBack: () => void }
}) {
  const { workoutId } = route.params
  const { token } = useAuth()
  const { accent, accentDark } = useAccent()

  const {
    workout,
    loading,
    fetchError,
    userExercises,
    newExerciseName,
    setNewExerciseName,
    newExerciseNote,
    setNewExerciseNote,
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
    getNoteValue,
    setNoteDraft,
    fadeAnim,
    setWeightDecimal,
    setRepsDecimal,
    handleAddSet,
    saveSetToApi,
    handleSaveSet,
    handleSaveDate,
    confirmDeleteSet,
    confirmDeleteExercise,
    handleDeleteWorkout,
    handleSaveExerciseName,
    handleAddExercise,
    handleAddPastExercise,
    handleSaveNote,
    dismissEditSet,
    retry,
  } = useWorkoutDetail(workoutId, token, navigation.goBack)

  const [measureUnitDropdownOpen, setMeasureUnitDropdownOpen] = useState(false)

  const formatDuration = (totalSeconds: number) => {
    const total = Math.round(Number(totalSeconds))
    const mins = Math.floor(total / 60)
    const secs = total % 60
    if (mins === 0) return `${secs}s`
    return `${mins}m ${secs}s`
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (fetchError || !workout) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backBtn, { color: accentDark }]}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{fetchError ?? 'Workout not found.'}</Text>
          <TouchableOpacity style={[styles.errorRetryBtn, { backgroundColor: accent }]} onPress={retry}>
            <Text style={styles.errorRetryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* ── Subheader: Back + session date title, sits directly below AppHeader ── */}
      <View style={styles.subheader}>
        <View style={styles.subheaderRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={accentDark} />
            <Text style={[styles.backBtnText, { color: accentDark }]}>Back</Text>
          </TouchableOpacity>

          <View style={styles.titleContainer}>
            {editingDate ? (
              <View style={styles.dateEditContainer}>
                <DateTimePicker
                  value={editingDateValue || new Date(workout.date)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_event: unknown, selectedDate?: Date) => {
                    if (Platform.OS === 'android') setEditingDate(false)
                    if (selectedDate) {
                      // Keep original time-of-day when changing the calendar date
                      const prev = new Date(workout.date)
                      selectedDate.setHours(prev.getHours(), prev.getMinutes(), prev.getSeconds(), prev.getMilliseconds())
                      setEditingDateValue(selectedDate)
                      if (Platform.OS === 'android') handleSaveDate(selectedDate)
                    }
                  }}
                />
                {Platform.OS === 'ios' && (
                  <View style={styles.dateEditActions}>
                    <TouchableOpacity
                      style={styles.dateEditBtn}
                      onPress={() => { setEditingDate(false); setEditingDateValue(null) }}
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
              >
                <Text style={styles.title} numberOfLines={1}>
                  {formatSessionTitle(workout.date)}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {!editingDate && (
            <TouchableOpacity
              onPress={handleDeleteWorkout}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.deleteBtn}
            >
              <Ionicons name="close-outline" size={26} color="#78716c" />
            </TouchableOpacity>
          )}
        </View>

      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <TouchableWithoutFeedback onPress={dismissEditSet}>
          <View>
            {workout.exercises.length === 0 ? (
              <Text style={styles.empty}>No exercises yet. Add one below.</Text>
            ) : (
              workout.exercises.map((pe) => {
                const isBodyweight = Boolean(pe.is_bodyweight)
                return (
                  <View key={pe.id} style={styles.exerciseCard}>
                    <View style={styles.exerciseHeader}>
                      {editingExerciseId === pe.id ? (
                        <TextInput
                          value={editingExerciseName}
                          onChangeText={setEditingExerciseName}
                          onBlur={() => handleSaveExerciseName(pe)}
                          onSubmitEditing={() => handleSaveExerciseName(pe)}
                          autoFocus
                          returnKeyType="done"
                          style={[styles.exerciseNameInput, { borderBottomColor: accent }]}
                        />
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            setEditingExerciseId(pe.id)
                            setEditingExerciseName(
                              pe.user_preferred_name || pe.exercise.name || '',
                            )
                          }}
                        >
                          <Text style={styles.exerciseName}>
                            {pe.user_preferred_name || pe.exercise.name}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => confirmDeleteExercise(pe)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ padding: 2 }}
                      >
                        <Ionicons name="close-outline" size={24} color={colors.brown900} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.cardBodyWrapper}>
                      {pe.sets.map((s, index) =>
                        editingSetId === s.id ? (
                          <TouchableWithoutFeedback key={s.id} onPress={() => {}}>
                            <Animated.View
                              style={[
                                styles.setRow,
                                styles.setRowEditing,
                                { opacity: fadeAnim, backgroundColor: accent },
                              ]}
                            >
                              <View style={styles.setLabelRow}>
                                <TouchableOpacity
                                  onPress={() => confirmDeleteSet(s)}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  style={{ padding: 2 }}
                                >
                                  <Ionicons
                                    name="close-outline"
                                    size={24}
                                    color="#000"
                                  />
                                </TouchableOpacity>
                                <Text style={styles.setLabel}>Set {index + 1}</Text>
                              </View>
                              {pe.measure_unit === 'stopwatch' ? (
                                <View style={styles.stopwatchEditContainer}>
                                  <View style={styles.stopwatchInputRow}>
                                    <Text style={styles.stopwatchFieldLabel}>minutes</Text>
                                    <TextInput
                                      style={[styles.setInput, styles.stopwatchInput]}
                                      value={editingSetMinutes}
                                      onChangeText={(t) => setEditingSetMinutes(t.replace(/[^0-9]/g, ''))}
                                      onBlur={() => handleSaveSet(s)}
                                      keyboardType="number-pad"
                                      placeholder="0"
                                      placeholderTextColor="#78716c"
                                    />
                                  </View>
                                  <View style={styles.stopwatchInputRow}>
                                    <Text style={styles.stopwatchFieldLabel}>seconds</Text>
                                    <TextInput
                                      style={[styles.setInput, styles.stopwatchInput]}
                                      value={editingSetSeconds}
                                      onChangeText={(t) => setEditingSetSeconds(t.replace(/[^0-9]/g, ''))}
                                      onBlur={() => handleSaveSet(s)}
                                      keyboardType="number-pad"
                                      placeholder="0"
                                      placeholderTextColor="#78716c"
                                    />
                                  </View>
                                </View>
                              ) : (
                                <>
                                  <View style={styles.stepper}>
                                    <TouchableOpacity
                                      style={styles.stepperBtn}
                                      onPress={() => {
                                        const v = stepRepsValue(editingSetReps, 'prev')
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
                                      <ArrowIcon direction="left" color="#44403c" />
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
                                        const v = stepRepsValue(editingSetReps, 'next')
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
                                      <ArrowIcon direction="right" color="#44403c" />
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
                                </>
                              )}
                            </Animated.View>
                          </TouchableWithoutFeedback>
                        ) : (
                          <View key={s.id} style={styles.setRow}>
                            <View style={styles.setLabelRow}>
                              <Text style={styles.setLabel}>Set {index + 1}</Text>
                            </View>
                            <TouchableOpacity
                              style={styles.setValueTouchable}
                              onPress={() => {
                                setAddingSetFor(null)
                                setEditingSetId(s.id)
                                if (pe.measure_unit === 'stopwatch') {
                                  const total = Math.round(Number(s.reps))
                                  setEditingSetMinutes(String(Math.floor(total / 60)))
                                  setEditingSetSeconds(String(total % 60))
                                } else {
                                  setEditingSetReps(formatNumber(s.reps))
                                  setEditingSetWeight(formatWeight(s.weight))
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              {pe.measure_unit === 'stopwatch' ? (
                                <View style={styles.setPair}>
                                  <View style={styles.setRepsCentered}>
                                    <Text style={styles.setValue}>
                                      {formatDuration(Number(s.reps))}
                                    </Text>
                                  </View>
                                </View>
                              ) : (
                                <View style={styles.setPair}>
                                  <View style={styles.setRepsCentered}>
                                    <Text style={styles.setValue}>
                                      {formatNumber(s.reps)} reps
                                    </Text>
                                  </View>
                                  {!isBodyweight && (
                                    <View style={styles.setWeightChip}>
                                      <Text style={styles.setValue}>
                                        {formatWeight(s.weight)
                                          ? `${formatWeight(s.weight)} lbs`
                                          : '—'}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )}
                            </TouchableOpacity>
                          </View>
                        ),
                      )}

                      <TextInput
                        style={styles.noteInput}
                        placeholder="Add Note"
                        placeholderTextColor="#a16207"
                        clearButtonMode="while-editing"
                        returnKeyType="done"
                        value={getNoteValue(pe.id, pe.note_for_next_time)}
                        onChangeText={(text) => setNoteDraft(pe.id, text)}
                        onBlur={() => handleSaveNote(pe.id, pe.note_for_next_time)}
                      />

                      <View style={styles.addSetNotesColumn}>
                        {addingSetFor === pe.id && (
                          pe.measure_unit === 'stopwatch' ? (
                            <View style={[styles.addSetRowStopwatch, styles.addSetRowEditing, { backgroundColor: accent }]}>
                              <View style={styles.addSetTopRow}>
                                <TouchableOpacity
                                  onPress={() => setAddingSetFor(null)}
                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                  style={styles.addSetCancelBtn}
                                >
                                  <Ionicons name="close-outline" size={24} color="#1c1917" />
                                </TouchableOpacity>
                                <Text style={styles.addSetLabel}>Set {pe.sets.length + 1}</Text>
                              </View>
                              <View style={styles.stopwatchInputRow}>
                                <Text style={styles.stopwatchFieldLabel}>minutes</Text>
                                <TextInput
                                  style={[styles.inputSmall, styles.addSetInputEditing, styles.stopwatchInput]}
                                  value={newSetMinutes}
                                  onChangeText={(t) => setNewSetMinutes(t.replace(/[^0-9]/g, ''))}
                                  keyboardType="number-pad"
                                  placeholder="0"
                                  placeholderTextColor="#78716c"
                                />
                              </View>
                              <View style={styles.stopwatchInputRow}>
                                <Text style={styles.stopwatchFieldLabel}>seconds</Text>
                                <TextInput
                                  style={[styles.inputSmall, styles.addSetInputEditing, styles.stopwatchInput]}
                                  value={newSetSeconds}
                                  onChangeText={(t) => setNewSetSeconds(t.replace(/[^0-9]/g, ''))}
                                  onBlur={() => handleAddSet(pe.id, pe.sets)}
                                  keyboardType="number-pad"
                                  placeholder="0"
                                  placeholderTextColor="#78716c"
                                />
                              </View>
                            </View>
                          ) : (
                            <View style={[styles.addSetRow, styles.addSetRowEditing, { backgroundColor: accent }]}>
                              <TouchableOpacity
                                onPress={() => setAddingSetFor(null)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                style={styles.addSetCancelBtn}
                              >
                                <Ionicons name="close-outline" size={24} color="#1c1917" />
                              </TouchableOpacity>
                              <Text style={styles.addSetLabel}>Set {pe.sets.length + 1}</Text>
                              <View style={styles.addSetStepperCenter}>
                                <View style={styles.stepper}>
                                  <TouchableOpacity
                                    style={styles.stepperBtn}
                                    onPress={() => {
                                      const v = stepRepsValue(newSetReps, 'prev')
                                      setNewSetReps(String(v))
                                    }}
                                  >
                                    <ArrowIcon direction="left" color="#1c1917" />
                                  </TouchableOpacity>
                                  <TextInput
                                    style={[styles.stepperValue, { color: '#1c1917' }]}
                                    value={newSetReps}
                                    onChangeText={(t) => setRepsDecimal(setNewSetReps, t)}
                                    keyboardType="decimal-pad"
                                  />
                                  <TouchableOpacity
                                    style={styles.stepperBtn}
                                    onPress={() => {
                                      const v = stepRepsValue(newSetReps, 'next')
                                      setNewSetReps(String(v))
                                    }}
                                  >
                                    <ArrowIcon direction="right" color="#1c1917" />
                                  </TouchableOpacity>
                                </View>
                              </View>
                              {!isBodyweight && (
                                <TextInput
                                  style={[styles.inputSmall, styles.addSetInputEditing]}
                                  value={newSetWeight}
                                  onChangeText={(t) => setWeightDecimal(setNewSetWeight, t)}
                                  onBlur={() => handleAddSet(pe.id, pe.sets)}
                                  placeholder="Weight"
                                  placeholderTextColor="#78716c"
                                  keyboardType="decimal-pad"
                                />
                              )}
                            </View>
                          )
                        )}
                        <View
                          style={[
                            styles.addSetNotesRow,
                            addingSetFor === pe.id && styles.addSetNotesRowBelow,
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
                              if (pe.measure_unit === 'stopwatch') {
                                if (last) {
                                  const total = Math.round(Number(last.reps))
                                  setNewSetMinutes(String(Math.floor(total / 60)))
                                  setNewSetSeconds(String(total % 60))
                                } else {
                                  setNewSetMinutes('0')
                                  setNewSetSeconds('0')
                                }
                              } else {
                                setNewSetReps('1')
                                if (last) setNewSetWeight(formatWeight(last.weight))
                              }
                            }}
                          >
                            <Text style={[styles.addSetLink, { color: accentDark }]}>+ Add Set</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                    </View>
                  </View>
                )
              })
            )}

            <View style={styles.addSectionsZone}>
            {userExercises.length > 0 && (
              <View style={styles.addPastExerciseSection}>
                <Text style={styles.addPastExerciseLabel}>
                  Add Past Exercise{' '}
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
                      <Text style={styles.addPastExerciseItemText}>{ex.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.addExerciseSection}>
              <Text style={styles.addPastExerciseLabel}>Add New Exercise</Text>

              <Text style={styles.addExerciseFieldLabel}>Title of Exercise</Text>
              <TextInput
                style={[styles.addExerciseInput, styles.addExerciseInputFull]}
                value={newExerciseName}
                onChangeText={setNewExerciseName}
                placeholder="e.g. Bench Press"
                placeholderTextColor="#a8a29e"
              />

              <Text style={styles.addExerciseFieldLabel}>Track by</Text>
              <TouchableOpacity
                style={styles.measureUnitDropdownTrigger}
                onPress={() => setMeasureUnitDropdownOpen((o) => !o)}
                activeOpacity={0.8}
              >
                <Text style={styles.measureUnitDropdownValue}>
                  {newExerciseMeasureUnit === 'stopwatch' ? 'Stopwatch' : 'Sets / Reps'}
                </Text>
                <Ionicons
                  name={measureUnitDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#78716c"
                />
              </TouchableOpacity>
              {measureUnitDropdownOpen && (
                <View style={styles.measureUnitOptions}>
                  {(['sets_reps', 'stopwatch'] as const).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.measureUnitOption,
                        newExerciseMeasureUnit === opt && styles.measureUnitOptionSelected,
                      ]}
                      onPress={() => {
                        setNewExerciseMeasureUnit(opt)
                        setMeasureUnitDropdownOpen(false)
                      }}
                    >
                      <Text
                        style={[
                          styles.measureUnitOptionText,
                          newExerciseMeasureUnit === opt && [styles.measureUnitOptionTextSelected, { color: accentDark }],
                        ]}
                      >
                        {opt === 'stopwatch' ? 'Stopwatch' : 'Sets / Reps'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.addExerciseFieldLabel}>Note</Text>
              <TextInput
                style={[styles.addExerciseInput, styles.addExerciseInputFull]}
                value={newExerciseNote}
                onChangeText={setNewExerciseNote}
                placeholder="e.g. Focus on form, keep elbows tucked"
                placeholderTextColor="#a8a29e"
                clearButtonMode="while-editing"
              />

              <TouchableOpacity
                onPress={handleAddExercise}
                disabled={addingExercise || !newExerciseName.trim()}
                style={[
                  styles.addExerciseBtn,
                  styles.addExerciseBtnFull,
                  { backgroundColor: accent },
                  (!newExerciseName.trim() || addingExercise) &&
                    styles.addExerciseBtnDisabled,
                ]}
              >
                <Text style={styles.addExerciseBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.detailBg },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorText: { fontSize: 16, color: '#78716c', textAlign: 'center' },
  errorRetryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  errorRetryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  subheader: {
    backgroundColor: colors.detailBgLight,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  subheaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginRight: 4,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
  titleContainer: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#1c1917' },
  deleteBtn: { padding: 4 },
  dateEditContainer: { flex: 1, alignItems: 'center' },
  dateEditActions: { flexDirection: 'row', gap: 16, marginTop: 8 },
  dateEditBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e7e5e4',
  },
  dateEditBtnText: { fontSize: 16, fontWeight: '500', color: '#1c1917' },
  content: { flex: 1 },
  contentInner: { padding: 24, paddingBottom: 32, backgroundColor: colors.detailBg },
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
    backgroundColor: colors.tableHeader,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  exerciseName: { fontSize: 20, fontFamily: typography.font.bodyBold, fontWeight: '700', color: colors.brown900 },
  exerciseNameInput: {
    fontSize: 20,
    fontFamily: typography.font.bodyBold,
    fontWeight: '700',
    color: colors.brown900,
    borderBottomWidth: 1,
    flex: 1,
    paddingVertical: 0,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: colors.setRowBg,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  setRowEditing: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: -11,
    marginBottom: 8,
  },
  setLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  setLabel: { fontSize: 21, fontFamily: typography.font.bodyBold, fontWeight: '700', color: '#44403c' },
  setValueTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  setPair: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.stone700,
    borderRadius: 4,
    overflow: 'hidden',
  },
  setRepsCentered: {
    flexGrow: 0,
    flexShrink: 0,
    alignItems: 'center',
    backgroundColor: colors.setRowBgTint,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  setWeightChip: {
    backgroundColor: colors.setRowBg,
    borderLeftWidth: 1,
    borderLeftColor: colors.stone700,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  setInputCentered: { textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    minWidth: 32,
    fontSize: 21,
    fontFamily: typography.font.bodyBold,
    fontWeight: '700',
    color: '#44403c',
    textAlign: 'center',
  },
  setValue: { fontSize: 21, fontFamily: typography.font.bodyBold, fontWeight: '700', color: '#44403c' },
  setInput: {
    width: 56,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 21,
    fontFamily: typography.font.bodyBold,
    fontWeight: '700',
    backgroundColor: '#fff4e6',
  },
  setEditRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addSetNotesColumn: { marginTop: 8 },
  addSetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addSetRowEditing: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginHorizontal: -11,
  },
  addSetCancelBtn: { padding: 4 },
  addSetLabel: { fontSize: 21, fontFamily: typography.font.bodyBold, fontWeight: '700', color: '#1c1917' },
  addSetStepperCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addSetInputEditing: { backgroundColor: '#fff4e6' },
  addSetNotesRowBelow: { marginTop: 8 },
  inputSmall: {
    width: 60,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 16,
  },
  addSetBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  addSetBtnText: { fontWeight: '600', fontSize: 16 },
  cancelBtn: { paddingHorizontal: 8 },
  cancelBtnText: { color: '#78716c', fontSize: 16 },
  addSetLink: {
    marginTop: 0,
    fontSize: 18,
    fontFamily: typography.font.bodyBold,
    fontWeight: '700',
  },
  addSetNotesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cardBodyWrapper: {
    backgroundColor: '#fff4e6',
    padding: 16,
  },
  noteInput: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#f5ee90',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 17,
    color: '#92400e',
    lineHeight: 22,
  },
  addSectionsZone: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    backgroundColor: colors.detailZoneDark,
  },
  addPastExerciseSection: { marginTop: 0 },
  addPastExerciseLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#78716c',
    marginBottom: 8,
  },
  addPastExerciseHint: { fontWeight: '400', color: '#a8a29e' },
  addPastExerciseList: { maxHeight: 200 },
  addPastExerciseItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    backgroundColor: colors.setRowBg,
    borderRadius: 8,
  },
  addPastExerciseItemText: { fontSize: 14, color: '#44403c', fontWeight: '500' },
  addExerciseSection: { marginTop: 24 },
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
  addExerciseInputFull: { width: '100%' },
  addExerciseCheckboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  addExerciseCheckboxIcon: { marginRight: 8 },
  addExerciseCheckboxLabel: { fontSize: 15, color: '#44403c' },
  addExerciseBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginTop: 12,
  },
  addExerciseBtnFull: { width: '100%' },
  addExerciseBtnDisabled: { opacity: 0.5 },
  addExerciseBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  addExerciseFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 4,
  },
  measureUnitDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff4e6',
  },
  measureUnitDropdownValue: {
    fontSize: 16,
    color: '#1c1917',
  },
  measureUnitOptions: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 4,
  },
  measureUnitOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  measureUnitOptionSelected: {
    backgroundColor: '#fff4e6',
  },
  measureUnitOptionText: {
    fontSize: 15,
    color: '#44403c',
  },
  measureUnitOptionTextSelected: {
    fontWeight: '600',
  },
  stopwatchEditContainer: {
    flex: 1,
    gap: 6,
  },
  stopwatchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stopwatchFieldLabel: {
    fontSize: 16,
    color: '#44403c',
    fontWeight: '500',
    flex: 1,
  },
  stopwatchInput: {
    width: 72,
    textAlign: 'center',
  },
  addSetRowStopwatch: {
    flexDirection: 'column',
    gap: 8,
  },
  addSetTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
})
