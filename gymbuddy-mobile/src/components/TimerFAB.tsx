import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useTimer } from '../contexts/TimerContext'
import { useAccent } from '../contexts/AccentContext'

export default function TimerFAB() {
  const { toggleOverlay, isOverlayOpen, isRunning } = useTimer()
  const { accent, accentDark } = useAccent()

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: isRunning ? accentDark : accent,
            shadowColor: accentDark,
            borderColor: isRunning ? accent : accent + 'aa',
          },
        ]}
        onPress={toggleOverlay}
        activeOpacity={0.82}
      >
        <Ionicons
          name={isOverlayOpen ? 'close' : 'timer-outline'}
          size={30}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 36,
    right: 24,
    zIndex: 999,
    elevation: 999,
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.75,
    shadowRadius: 14,
    elevation: 16,
    borderWidth: 2,
  },
})
