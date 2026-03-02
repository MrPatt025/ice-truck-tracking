import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider } from '../src/contexts/AuthContext'
import { ThemeProvider } from '../src/contexts/ThemeContext'
import { NotificationProvider } from '../src/contexts/NotificationContext'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
