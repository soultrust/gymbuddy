import React from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { colors } from '../theme/colors'

export default function LoadingSpinner() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="large" color={colors.amber600} />
    </View>
  )
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
