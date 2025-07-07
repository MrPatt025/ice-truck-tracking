import React from 'react'
import { View, Text, StyleSheet, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'

interface HistoryItem {
  id: string
  date: string
  route: string
  distance: number
  duration: string
  status: 'completed' | 'cancelled'
}

const mockHistory: HistoryItem[] = [
  {
    id: '1',
    date: '2025-07-02',
    route: 'Bangkok → Pattaya',
    distance: 147,
    duration: '2h 30m',
    status: 'completed',
  },
  {
    id: '2',
    date: '2025-07-01',
    route: 'Bangkok → Ayutthaya',
    distance: 76,
    duration: '1h 45m',
    status: 'completed',
  },
]

export function HistoryScreen() {
  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Text style={styles.route}>{item.route}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'completed' ? '#4CAF50' : '#F44336',
            },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.historyDetails}>
        <View style={styles.detailItem}>
          <Ionicons name='calendar-outline' size={16} color='#666' />
          <Text style={styles.detailText}>{item.date}</Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name='speedometer-outline' size={16} color='#666' />
          <Text style={styles.detailText}>{item.distance} km</Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name='time-outline' size={16} color='#666' />
          <Text style={styles.detailText}>{item.duration}</Text>
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trip History</Text>
      </View>

      <FlatList
        data={mockHistory}
        renderItem={renderHistoryItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  list: {
    padding: 16,
  },
  historyItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  route: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
})
