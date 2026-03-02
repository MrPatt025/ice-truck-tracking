import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

function MapIcon({ color, size }: { color: string; size: number }) {
  return <Ionicons name='map-outline' size={size} color={color} />
}

function HistoryIcon({ color, size }: { color: string; size: number }) {
  return <Ionicons name='time-outline' size={size} color={color} />
}

function AlertsIcon({ color, size }: { color: string; size: number }) {
  return <Ionicons name='notifications-outline' size={size} color={color} />
}

function SettingsIcon({ color, size }: { color: string; size: number }) {
  return <Ionicons name='settings-outline' size={size} color={color} />
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name='map'
        options={{
          title: 'Map',
          tabBarIcon: MapIcon,
        }}
      />
      <Tabs.Screen
        name='history'
        options={{
          title: 'History',
          tabBarIcon: HistoryIcon,
        }}
      />
      <Tabs.Screen
        name='alerts'
        options={{
          title: 'Alerts',
          tabBarIcon: AlertsIcon,
        }}
      />
      <Tabs.Screen
        name='settings'
        options={{
          title: 'Settings',
          tabBarIcon: SettingsIcon,
        }}
      />
    </Tabs>
  )
}
