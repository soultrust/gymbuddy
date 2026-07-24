import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useTimer } from '../contexts/TimerContext'

export default function TimerFAB() {
  const { toggleOverlay, isOverlayOpen, isRunning } = useTimer()

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.fab, isRunning && styles.fabRunning]}
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
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    // Juicy shadow
    shadowColor: '#d97706',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.75,
    shadowRadius: 14,
    elevation: 16,
    // Slightly warm border glow
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  fabRunning: {
    backgroundColor: '#d97706',
    borderColor: '#f59e0b',
  },
})
