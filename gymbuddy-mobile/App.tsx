import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import LoginScreen from './src/screens/LoginScreen'
import WorkoutsScreen from './src/screens/WorkoutsScreen'
import WorkoutDetailScreen from './src/screens/WorkoutDetailScreen'
import LoadingSpinner from './src/components/LoadingSpinner'

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
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
      <StatusBar style="dark" />
    </AuthProvider>
  )
}

