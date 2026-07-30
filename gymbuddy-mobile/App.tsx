import { StatusBar } from 'expo-status-bar'
import { View, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import { Oswald_500Medium } from '@expo-google-fonts/oswald'
import { Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato'

import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { TimerProvider, useTimer } from './src/contexts/TimerContext'
import { AccentProvider } from './src/contexts/AccentContext'
import LoginScreen from './src/screens/LoginScreen'
import WorkoutsScreen from './src/screens/WorkoutsScreen'
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen'
import LoadingSpinner from './src/components/LoadingSpinner'
import TimerFAB from './src/components/TimerFAB'
import TimerOverlay from './src/components/TimerOverlay'
import AppHeader from './src/components/AppHeader'

const Stack = createNativeStackNavigator()

function AppNavigator() {
  const { token, isLoading } = useAuth()
  const { isOverlayOpen } = useTimer()
  const isLoggedIn = !!token

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
    <>
      {/* Hide white header in timer mode so status bar isn't washed out */}
      {isLoggedIn && !isOverlayOpen && <AppHeader />}

      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isLoggedIn ? (
            <>
              <Stack.Screen name="Workouts" component={WorkoutsScreen} />
              <Stack.Screen
                name="WorkoutDetail"
                component={WorkoutDetailScreen}
              />
            </>
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* Full-window overlays — above nav + status bar area */}
      {isLoggedIn && (
        <>
          <TimerOverlay />
          <TimerFAB />
        </>
      )}
    </>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Oswald_500Medium,
    Lato_400Regular,
    Lato_700Bold,
  })
  if (!fontsLoaded) return null

  return (
    <SafeAreaProvider>
      <AccentProvider>
        <AuthProvider>
          <TimerProvider>
            <View style={styles.root}>
              <AppNavigator />
              <StatusBar style="dark" />
            </View>
          </TimerProvider>
        </AuthProvider>
      </AccentProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})

