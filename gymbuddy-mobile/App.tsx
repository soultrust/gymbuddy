import { StatusBar } from 'expo-status-bar'
import { View, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useFonts, Oswald_500Medium } from '@expo-google-fonts/oswald'

import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import { TimerProvider } from './src/contexts/TimerContext'
import { AccentProvider } from './src/contexts/AccentContext'
import LoginScreen from './src/screens/LoginScreen'
import WorkoutsScreen from './src/screens/WorkoutsScreen'
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen'
import LoadingSpinner from './src/components/LoadingSpinner'
import TimerFAB from './src/components/TimerFAB'
import TimerOverlay from './src/components/TimerOverlay'

const Stack = createNativeStackNavigator()

function AppNavigator() {
  const { token, isLoading } = useAuth()
  const isLoggedIn = !!token

  if (isLoading) {
    return <LoadingSpinner />
  }

  return (
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
      {isLoggedIn && (
        <>
          <TimerOverlay />
          <TimerFAB />
        </>
      )}
    </NavigationContainer>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts({ Oswald_500Medium })
  if (!fontsLoaded) return null

  return (
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
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})

