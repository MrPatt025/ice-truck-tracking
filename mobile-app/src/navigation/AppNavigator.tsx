import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'

import { useAuth } from '../contexts/AuthContext'
import { LoginScreen } from '../screens/LoginScreen'
import { MapScreen } from '../screens/MapScreen'
import { HistoryScreen } from '../screens/HistoryScreen'
import { AlertsScreen } from '../screens/AlertsScreen'
import { SettingsScreen } from '../screens/SettingsScreen'

const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

function resolveTabIconName(
  routeName: string,
  focused: boolean
): keyof typeof Ionicons.glyphMap {
  if (routeName === 'Map') return focused ? 'map' : 'map-outline'
  if (routeName === 'History') return focused ? 'time' : 'time-outline'
  if (routeName === 'Alerts') {
    return focused ? 'notifications' : 'notifications-outline'
  }
  if (routeName === 'Settings') {
    return focused ? 'settings' : 'settings-outline'
  }
  return 'help-outline'
}

type TabIconProps = Readonly<{
  focused: boolean
  color: string
  size: number
}>

function renderMapIcon({ focused, color, size }: TabIconProps) {
  return (
    <Ionicons
      name={resolveTabIconName('Map', focused)}
      size={size}
      color={color}
    />
  )
}

function renderHistoryIcon({ focused, color, size }: TabIconProps) {
  return (
    <Ionicons
      name={resolveTabIconName('History', focused)}
      size={size}
      color={color}
    />
  )
}

function renderAlertsIcon({ focused, color, size }: TabIconProps) {
  return (
    <Ionicons
      name={resolveTabIconName('Alerts', focused)}
      size={size}
      color={color}
    />
  )
}

function renderSettingsIcon({ focused, color, size }: TabIconProps) {
  return (
    <Ionicons
      name={resolveTabIconName('Settings', focused)}
      size={size}
      color={color}
    />
  )
}

const MAIN_TAB_OPTIONS = {
  tabBarActiveTintColor: '#2196F3',
  tabBarInactiveTintColor: 'gray',
  headerShown: false,
} as const

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={MAIN_TAB_OPTIONS}>
      <Tab.Screen
        name='Map'
        component={MapScreen}
        options={{ tabBarIcon: renderMapIcon }}
      />
      <Tab.Screen
        name='History'
        component={HistoryScreen}
        options={{ tabBarIcon: renderHistoryIcon }}
      />
      <Tab.Screen
        name='Alerts'
        component={AlertsScreen}
        options={{ tabBarIcon: renderAlertsIcon }}
      />
      <Tab.Screen
        name='Settings'
        component={SettingsScreen}
        options={{ tabBarIcon: renderSettingsIcon }}
      />
    </Tab.Navigator>
  )
}

export function AppNavigator() {
  const { isAuthenticated } = useAuth()

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name='Main' component={MainTabs} />
      ) : (
        <Stack.Screen name='Login' component={LoginScreen} />
      )}
    </Stack.Navigator>
  )
}
