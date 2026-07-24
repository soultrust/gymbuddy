import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as DocumentPicker from 'expo-document-picker'
import { useTimer } from '../contexts/TimerContext'
import type { TimerPreset } from '../types/timer'

// ─── Circle geometry ─────────────────────────────────────────────────────────
const CIRCLE_SIZE = 240
const RADIUS = 98
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CX = CIRCLE_SIZE / 2
const CY = CIRCLE_SIZE / 2

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Preset row ───────────────────────────────────────────────────────────────
function PresetRow({
  preset,
  isActive,
  onSelect,
  onDelete,
}: {
  preset: TimerPreset
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.presetItem, isActive && styles.presetItemActive]}
      onPress={onSelect}
      activeOpacity={0.75}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.presetName, isActive && styles.presetNameActive]}>
          {preset.name}
        </Text>
        <Text style={styles.presetDuration}>{formatTime(preset.duration)}</Text>
      </View>
      <TouchableOpacity
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.presetDeleteBtn}
      >
        <Ionicons name="trash-outline" size={18} color="#a8a29e" />
      </TouchableOpacity>
    </TouchableOpacity>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>
}

// ─── Main overlay ─────────────────────────────────────────────────────────────
export default function TimerOverlay() {
  const {
    isOverlayOpen,
    isRunning,
    timeLeft,
    totalTime,
    activePreset,
    presets,
    customSoundUri,
    alarmAutoShutoff,
    alarmShutoffSeconds,
    play,
    pause,
    reset,
    selectPreset,
    addPreset,
    deletePreset,
    setCustomSoundUri,
    setAlarmAutoShutoff,
    setAlarmShutoffSeconds,
  } = useTimer()

  const [showAddPreset, setShowAddPreset] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMinutes, setNewMinutes] = useState('1')
  const [newSeconds, setNewSeconds] = useState('0')
  const [shutoffInput, setShutoffInput] = useState(() => String(alarmShutoffSeconds))

  if (!isOverlayOpen) return null

  const progress = totalTime > 0 ? timeLeft / totalTime : 1
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress)

  const handleSavePreset = async () => {
    const name = newName.trim()
    if (!name) return
    const mins = parseInt(newMinutes || '0', 10)
    const secs = parseInt(newSeconds || '0', 10)
    const duration = mins * 60 + secs
    if (duration <= 0) return
    await addPreset(name, duration)
    setNewName('')
    setNewMinutes('1')
    setNewSeconds('0')
    setShowAddPreset(false)
  }

  const pickSound = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      })
      if (!result.canceled && result.assets?.[0]?.uri) {
        await setCustomSoundUri(result.assets[0].uri)
      }
    } catch {}
  }

  const handleShutoffSecondsBlur = () => {
    const n = parseInt(shutoffInput, 10)
    if (!isNaN(n) && n > 0) {
      setAlarmShutoffSeconds(n)
    } else {
      setShutoffInput(String(alarmShutoffSeconds))
    }
  }

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Dark backdrop */}
      <View style={styles.backdrop} />

      <View style={styles.sheet}>
        {/* ── Title ── */}
        <Text style={styles.sheetTitle}>Timer Settings</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Timer face ── */}
          <View style={styles.timerFace}>
            {activePreset && (
              <Text style={styles.presetLabel}>{activePreset.name}</Text>
            )}

            <View style={styles.circleWrapper}>
              <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={StyleSheet.absoluteFill}>
                <Circle
                  cx={CX} cy={CY} r={RADIUS}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={13}
                  fill="none"
                />
                <Circle
                  cx={CX} cy={CY} r={RADIUS}
                  stroke="#f59e0b"
                  strokeWidth={13}
                  fill="none"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="square"
                  transform={`rotate(-90, ${CX}, ${CY})`}
                />
              </Svg>
              <View style={styles.timerTextWrapper}>
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.playPauseBtn}
              onPress={isRunning ? pause : play}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isRunning ? 'pause' : 'play'}
                size={32}
                color="#fff"
                style={isRunning ? undefined : { marginLeft: 4 }}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetLink} onPress={reset}>
              <Text style={styles.resetLinkText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* ── Presets section ── */}
          <SectionLabel label="Presets" />

          {presets.map((p) => (
            <PresetRow
              key={p.id}
              preset={p}
              isActive={activePreset?.id === p.id}
              onSelect={() => selectPreset(p)}
              onDelete={() => deletePreset(p.id)}
            />
          ))}

          <TouchableOpacity
            style={styles.addPresetTrigger}
            onPress={() => setShowAddPreset(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#f59e0b" />
            <Text style={styles.addPresetTriggerText}>Add Preset</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* ── Alarm settings section ── */}
          <SectionLabel label="Alarm" />

          {/* Auto-shutoff checkbox */}
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAlarmAutoShutoff(!alarmAutoShutoff)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={alarmAutoShutoff ? 'checkbox' : 'square-outline'}
              size={22}
              color={alarmAutoShutoff ? '#f59e0b' : 'rgba(255,255,255,0.3)'}
            />
            <Text style={styles.checkboxLabel}>Timer alarm auto-shutoff</Text>
          </TouchableOpacity>

          {alarmAutoShutoff && (
            <View style={styles.shutoffRow}>
              <Text style={styles.shutoffText}>Shut off after</Text>
              <TextInput
                style={styles.shutoffInput}
                value={shutoffInput}
                onChangeText={setShutoffInput}
                onBlur={handleShutoffSecondsBlur}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <Text style={styles.shutoffText}>seconds</Text>
            </View>
          )}

          {/* Sound picker */}
          <View style={styles.soundRow}>
            <TouchableOpacity style={styles.soundPickerBtn} onPress={pickSound} activeOpacity={0.7}>
              <Ionicons name="musical-note-outline" size={18} color="rgba(255,255,255,0.55)" />
              <Text style={styles.soundPickerText}>
                {customSoundUri ? 'Custom sound' : 'Default beep'}
              </Text>
              <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
            {customSoundUri && (
              <TouchableOpacity
                onPress={() => setCustomSoundUri(null)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginLeft: 8 }}
              >
                <Ionicons name="close-circle-outline" size={20} color="rgba(255,255,255,0.35)" />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom padding so last item clears keyboard/home indicator */}
          <View style={{ height: 24 }} />
        </ScrollView>
      </View>

      {/* ── Add Preset Modal ── */}
      <Modal
        visible={showAddPreset}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddPreset(false)}
      >
        <KeyboardAvoidingView
          style={styles.addPresetModalOuter}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowAddPreset(false)}
            activeOpacity={1}
          />
          <View style={styles.addPresetCard}>
            <Text style={styles.addPresetTitle}>New Preset</Text>

            <Text style={styles.addPresetFieldLabel}>Name</Text>
            <TextInput
              style={styles.addPresetInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Between Sets"
              placeholderTextColor="#a8a29e"
              autoFocus
            />

            <View style={styles.addPresetDurationRow}>
              <View style={styles.addPresetDurationField}>
                <Text style={styles.addPresetFieldLabel}>Minutes</Text>
                <TextInput
                  style={styles.addPresetInput}
                  value={newMinutes}
                  onChangeText={(t) => setNewMinutes(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#a8a29e"
                />
              </View>
              <View style={styles.addPresetDurationField}>
                <Text style={styles.addPresetFieldLabel}>Seconds</Text>
                <TextInput
                  style={styles.addPresetInput}
                  value={newSeconds}
                  onChangeText={(t) => setNewSeconds(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#a8a29e"
                />
              </View>
            </View>

            <View style={styles.addPresetActions}>
              <TouchableOpacity
                style={styles.addPresetCancelBtn}
                onPress={() => setShowAddPreset(false)}
              >
                <Text style={styles.addPresetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addPresetSaveBtn,
                  !newName.trim() && styles.addPresetSaveBtnDisabled,
                ]}
                onPress={handleSavePreset}
                disabled={!newName.trim()}
              >
                <Text style={styles.addPresetSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 6, 2, 0.88)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#1c1410',
    paddingTop: 24,
    height: '88%',
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },

  // ── Timer face
  timerFace: {
    alignItems: 'center',
    gap: 20,
    paddingBottom: 8,
  },
  presetLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  circleWrapper: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerTextWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 52,
    fontWeight: '200',
    color: '#fff',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  playPauseBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  resetLink: { paddingVertical: 4 },
  resetLinkText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    textDecorationLine: 'underline',
  },

  // ── Section divider + label
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 12,
  },

  // ── Presets
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  presetItemActive: {
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  presetName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  presetNameActive: { color: '#f59e0b' },
  presetDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontVariant: ['tabular-nums'],
  },
  presetDeleteBtn: { padding: 4 },
  addPresetTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  addPresetTriggerText: {
    fontSize: 14,
    color: '#f59e0b',
    fontWeight: '600',
  },

  // ── Alarm settings
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  checkboxLabel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  shutoffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
    paddingLeft: 32,
  },
  shutoffText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
  },
  shutoffInput: {
    width: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  // ── Sound picker
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soundPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  soundPickerText: {
    flex: 1,
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
  },

  // ── Add Preset Modal
  addPresetModalOuter: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  addPresetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  addPresetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 20,
  },
  addPresetFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  addPresetInput: {
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff4e6',
    color: '#1c1917',
    marginBottom: 16,
  },
  addPresetDurationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addPresetDurationField: { flex: 1 },
  addPresetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  addPresetCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    alignItems: 'center',
  },
  addPresetCancelText: {
    fontSize: 15,
    color: '#78716c',
    fontWeight: '500',
  },
  addPresetSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
  },
  addPresetSaveBtnDisabled: { opacity: 0.4 },
  addPresetSaveText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
})
