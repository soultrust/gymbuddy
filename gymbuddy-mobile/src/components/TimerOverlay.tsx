import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as DocumentPicker from 'expo-document-picker'
import { useTimer } from '../contexts/TimerContext'
import type { TimerPreset } from '../types/timer'

// ─── Circle geometry ─────────────────────────────────────────────────────────
const CIRCLE_SIZE = 260
const RADIUS = 108
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const CX = CIRCLE_SIZE / 2
const CY = CIRCLE_SIZE / 2

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Preset pill ─────────────────────────────────────────────────────────────
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
      >
        <Ionicons name="trash-outline" size={18} color="#a8a29e" />
      </TouchableOpacity>
    </TouchableOpacity>
  )
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

  const [showSettings, setShowSettings] = useState(false)
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

  const handleShutoffBlur = () => {
    const n = parseInt(shutoffInput, 10)
    if (!isNaN(n) && n > 0) setAlarmShutoffSeconds(n)
    else setShutoffInput(String(alarmShutoffSeconds))
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* White status bar icons on dark backdrop */}
      <StatusBar barStyle="light-content" />
      {/* ── Dark backdrop (blocks touches to content below) ── */}
      <View style={styles.backdrop} />

      {/* ── Timer face ── */}
      <View style={styles.timerContainer}>
        {activePreset && (
          <Text style={styles.presetLabel}>{activePreset.name}</Text>
        )}

        <View style={styles.circleWrapper}>
          <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={StyleSheet.absoluteFill}>
            {/* Track ring */}
            <Circle
              cx={CX} cy={CY} r={RADIUS}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={14}
              fill="none"
            />
            {/* Progress ring — path explicitly starts at 12 o'clock (top center) */}
            <Path
              d={[
                `M ${CX} ${CY - RADIUS}`,
                `A ${RADIUS} ${RADIUS} 0 0 1 ${CX} ${CY + RADIUS}`,
                `A ${RADIUS} ${RADIUS} 0 0 1 ${CX} ${CY - RADIUS}`,
              ].join(' ')}
              stroke="#f59e0b"
              strokeWidth={14}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="butt"
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
            size={34}
            color="#fff"
            style={isRunning ? undefined : { marginLeft: 4 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={reset}
          hitSlop={{ top: 14, bottom: 14, left: 24, right: 24 }}
        >
          <Text style={styles.resetLink}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* ── Hamburger — lower left ── */}
      <TouchableOpacity
        style={styles.hamburgerBtn}
        onPress={() => setShowSettings(true)}
        activeOpacity={0.8}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="menu" size={28} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>

      {/* ══ Settings modal ══════════════════════════════════════════════════ */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.settingsOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={() => setShowSettings(false)}
            activeOpacity={1}
          />
          <View style={styles.settingsSheet}>
            {/* drag handle */}
            <View style={styles.handle} />

            <Text style={styles.sheetTitle}>Timer Settings</Text>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* ── Presets ── */}
              <Text style={styles.sectionLabel}>Presets</Text>

              {presets.map((p) => (
                <PresetRow
                  key={p.id}
                  preset={p}
                  isActive={activePreset?.id === p.id}
                  onSelect={() => {
                    selectPreset(p)
                    setShowSettings(false)
                  }}
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

              {/* ── Alarm ── */}
              <Text style={styles.sectionLabel}>Alarm</Text>

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
                    onBlur={handleShutoffBlur}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.shutoffText}>seconds</Text>
                </View>
              )}

              {/* ── Sound ── */}
              <View style={styles.soundRow}>
                <TouchableOpacity
                  style={styles.soundPickerBtn}
                  onPress={pickSound}
                  activeOpacity={0.7}
                >
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

              <View style={{ height: 32 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══ Add Preset modal ════════════════════════════════════════════════ */}
      <Modal
        visible={showAddPreset}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddPreset(false)}
      >
        <KeyboardAvoidingView
          style={styles.addPresetOuter}
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 6, 2, 0.92)',
  },

  // ── Timer face
  timerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.2,
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
    fontSize: 58,
    fontWeight: '200',
    color: '#fff',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  playPauseBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  resetLink: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    textDecorationLine: 'underline',
  },

  // ── Hamburger
  hamburgerBtn: {
    position: 'absolute',
    bottom: 48,
    left: 28,
  },

  // ── Settings modal
  settingsOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  settingsSheet: {
    backgroundColor: '#1c1410',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    height: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 20,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },

  // ── Section
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 20,
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

  // ── Alarm
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

  // ── Sound
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

  // ── Add Preset modal
  addPresetOuter: {
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
