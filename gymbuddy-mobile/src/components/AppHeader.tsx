import React, { useState } from 'react'
import {
  Alert,
  Modal,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Text } from './AppText'
import { useAuth } from '../contexts/AuthContext'
import { useTimer } from '../contexts/TimerContext'
import { colorTokens, space, radius, shadow, typography } from '../theme/tokens'

export default function AppHeader() {
  const { logout } = useAuth()
  const { isOverlayOpen } = useTimer()
  const insets = useSafeAreaInsets()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setShowMenu(false)
          await logout()
        },
      },
    ])
  }

  return (
    <>
      <StatusBar
        barStyle={isOverlayOpen ? 'light-content' : 'dark-content'}
        backgroundColor={isOverlayOpen ? '#0a0602' : colorTokens.bg.surface}
      />
      {/* Status-bar strip: dark in timer mode so light icons stay legible */}
      <View
        style={[
          styles.statusBarStrip,
          {
            height: insets.top,
            backgroundColor: isOverlayOpen ? '#0a0602' : colorTokens.bg.surface,
          },
        ]}
      />
      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={styles.titleGym}>GYM</Text>
          <Text style={styles.titleBuddy}>BUDDY</Text>
        </Text>

        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="menu" size={26} color="#1c1917" />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuBackdrop}
          onPress={() => setShowMenu(false)}
          activeOpacity={1}
        >
          <TouchableOpacity
            style={[styles.menuCard, { top: insets.top + 60 }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setShowMenu(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={18} color={colorTokens.text.primary} />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color={colorTokens.state.error} />
              <Text style={[styles.menuItemText, { color: colorTokens.state.error }]}>Logout</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  statusBarStrip: {
    zIndex: 200,
    elevation: 200,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.md,
    backgroundColor: colorTokens.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: colorTokens.border.light,
    zIndex: 200,
    elevation: 200,
  },
  title: {
    fontSize: typography.size.hero,
    fontFamily: typography.font.display,
    letterSpacing: 0.5,
  },
  titleGym: {
    fontFamily: typography.font.display,
    color: 'rgba(146, 64, 14, 0.5)',
  },
  titleBuddy: {
    fontFamily: typography.font.display,
    color: '#92400e',
  },

  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  menuCard: {
    position: 'absolute',
    right: space.md,
    backgroundColor: colorTokens.bg.surface,
    borderRadius: radius.md,
    ...shadow.md,
    minWidth: 180,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 14,
    paddingHorizontal: space.md,
  },
  menuItemText: {
    fontSize: typography.size.lg,
    color: colorTokens.text.primary,
    fontWeight: typography.weight.medium,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colorTokens.bg.screen,
    marginHorizontal: space.md,
  },
})
