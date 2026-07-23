import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

import { apiRequest } from '../api/client'
import type {
  Workout,
  PerformedExercise,
  TemplateExercise,
  TemplateSource,
} from '../types/workout'
import { formatSessionDate } from '../utils/format'

type Props = {
  visible: boolean
  onClose: () => void
  onCreated: (workoutId: number) => void
  token: string | null
  workouts: Workout[]
}

export default function CreateSessionModal({
  visible,
  onClose,
  onCreated,
  token,
  workouts,
}: Props) {
  const [template, setTemplate] = useState<TemplateExercise[]>([])
  const [createDate, setCreateDate] = useState(() => new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createNotes, setCreateNotes] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [templateSource, setTemplateSource] = useState<TemplateSource>('previous')
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null)
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false)

  const fetchTemplate = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiRequest<TemplateExercise[]>('/workouts/template/', { token })
      setTemplate(Array.isArray(data) ? data : [])
    } catch {
      setTemplate([])
    }
  }, [token])

  useEffect(() => {
    if (visible) {
      fetchTemplate()
      const today = new Date()
      setCreateDate(today)
      setCreateTitle(
        today.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      )
      setCreateNotes('')
      setCreateError(null)
      setTemplateSource('previous')
      setSelectedSessionId(null)
      setSessionDropdownOpen(false)
    }
  }, [visible, fetchTemplate])

  const close = () => {
    if (!createSubmitting) {
      setShowDatePicker(false)
      setSessionDropdownOpen(false)
      onClose()
    }
  }

  const handleCreateSubmit = async () => {
    if (!token) return
    setCreateError(null)
    setCreateSubmitting(true)
    try {
      const dateISO = createDate.toISOString().slice(0, 10)
      const body: { date: string; name: string; notes: string; template_session_id?: number } = {
        date: `${dateISO}T12:00:00.000Z`,
        name: createTitle.trim(),
        notes: createNotes.trim() || '',
      }
      if (templateSource === 'another' && selectedSessionId != null) {
        body.template_session_id = selectedSessionId
      }
      const workout = await apiRequest<Workout>('/workouts/', {
        method: 'POST',
        token,
        body,
      })
      if (templateSource === 'previous' && template.length > 0) {
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
                weight: s.weight != null && s.weight !== '' ? Number(s.weight) : null,
                notes: s.notes ?? '',
              },
            })
          }
        }
      }
      onCreated(workout.id)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create workout')
    } finally {
      setCreateSubmitting(false)
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={close}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={styles.modalContent}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>New Session</Text>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.radioGroupLabel}>Template</Text>

            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => !createSubmitting && setTemplateSource('previous')}
              disabled={createSubmitting}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radioOuter,
                  templateSource === 'previous' && styles.radioOuterSelected,
                ]}
              >
                {templateSource === 'previous' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Use previous session as starting template</Text>
            </TouchableOpacity>

            {templateSource === 'previous' && template.length > 0 && (
              <Text style={styles.modalTemplate}>
                {template.map((t) => t.exercise.name).join(', ')}
              </Text>
            )}

            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => {
                if (!createSubmitting) {
                  setTemplateSource('another')
                  setSessionDropdownOpen(false)
                }
              }}
              disabled={createSubmitting}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radioOuter,
                  templateSource === 'another' && styles.radioOuterSelected,
                ]}
              >
                {templateSource === 'another' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Use another session as a starting template</Text>
            </TouchableOpacity>

            {templateSource === 'another' && (
              <>
                <View style={styles.sessionDropdownWrapper}>
                  <TouchableOpacity
                    style={[styles.modalInput, styles.sessionDropdownInput]}
                    onPress={() =>
                      !createSubmitting && setSessionDropdownOpen((open) => !open)
                    }
                    disabled={createSubmitting}
                  >
                    <Text style={styles.dateButtonText}>
                      {selectedSessionId != null
                        ? formatSessionDate(
                            workouts.find((w) => w.id === selectedSessionId)?.date ?? '',
                          )
                        : 'Select a session...'}
                    </Text>
                  </TouchableOpacity>
                  {sessionDropdownOpen && workouts.length > 0 && (
                    <View style={styles.sessionDropdownList}>
                      {[...workouts]
                        .sort(
                          (a, b) =>
                            new Date(b.date).getTime() - new Date(a.date).getTime(),
                        )
                        .map((w) => (
                          <TouchableOpacity
                            key={w.id}
                            style={[
                              styles.sessionDropdownItem,
                              selectedSessionId === w.id &&
                                styles.sessionDropdownItemSelected,
                            ]}
                            onPress={() => {
                              setSelectedSessionId(w.id)
                              setSessionDropdownOpen(false)
                            }}
                          >
                            <Text style={styles.sessionDropdownItemText}>
                              {formatSessionDate(w.date)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  )}
                </View>
                {selectedSessionId != null &&
                  (() => {
                    const w = workouts.find((wo) => wo.id === selectedSessionId)
                    const exercises =
                      w?.exercises
                        ?.map(
                          (pe) => pe.user_preferred_name || pe.exercise?.name || '',
                        )
                        .filter(Boolean) ?? []
                    if (exercises.length === 0) return null
                    return (
                      <Text style={styles.sessionExercisesPreview}>
                        {exercises.join(', ')}
                      </Text>
                    )
                  })()}
              </>
            )}

            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => {
                if (!createSubmitting) {
                  setTemplateSource('none')
                  setSelectedSessionId(null)
                  setSessionDropdownOpen(false)
                }
              }}
              disabled={createSubmitting}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.radioOuter,
                  templateSource === 'none' && styles.radioOuterSelected,
                ]}
              >
                {templateSource === 'none' && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>Start without a template</Text>
            </TouchableOpacity>

            <View style={styles.templateSectionSpacer} />

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              value={createTitle}
              onChangeText={setCreateTitle}
              placeholder="e.g. Jul 23, 2026"
              placeholderTextColor="#a8a29e"
              editable={!createSubmitting}
              returnKeyType="done"
            />

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
                    if (Platform.OS === 'android') setShowDatePicker(false)
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

            {createError && <Text style={styles.modalError}>{createError}</Text>}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={close}
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
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffdfb8',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#5A4A2F',
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalBody: {
    padding: 24,
  },
  radioGroupLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#44403c',
    marginBottom: 10,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  templateSectionSpacer: {
    height: 16,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#5A4A2F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#5A4A2F',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5A4A2F',
  },
  radioLabel: {
    flex: 1,
    fontSize: 15,
    color: '#44403c',
  },
  modalTemplate: {
    fontSize: 14,
    color: '#57534e',
    marginBottom: 16,
    marginLeft: 34,
  },
  sessionExercisesPreview: {
    fontSize: 14,
    color: '#57534e',
    marginTop: 2,
    marginBottom: 16,
    marginLeft: 34,
  },
  sessionDropdownWrapper: {
    marginLeft: 34,
    alignSelf: 'flex-start',
    minWidth: 200,
  },
  sessionDropdownInput: {
    marginBottom: 6,
  },
  sessionDropdownList: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  sessionDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e7e5e4',
    backgroundColor: '#fff',
  },
  sessionDropdownItemSelected: {
    backgroundColor: '#ffedd2',
  },
  sessionDropdownItemText: {
    fontSize: 16,
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
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
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
})
