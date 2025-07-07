import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface ConnectionStatusProps {
  isConnected: boolean
  queueCount?: number
}

export function ConnectionStatus({
  isConnected,
  queueCount = 0,
}: ConnectionStatusProps) {
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isConnected ? '#4CAF50' : '#F44336' },
      ]}
    >
      <Ionicons
        name={isConnected ? 'wifi' : 'wifi-outline'}
        size={16}
        color='white'
      />
      <Text style={styles.text}>{isConnected ? 'Online' : 'Offline'}</Text>
      {!isConnected && queueCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{queueCount}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  text: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
})
