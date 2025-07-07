import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Alert {
  id: string;
  type: 'geofence' | 'temperature' | 'speed' | 'offline';
  title: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  read: boolean;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'temperature',
    title: 'Temperature Alert',
    message: 'Truck ABC-123 temperature above threshold: 2.5°C',
    timestamp: '2025-07-02T10:30:00Z',
    severity: 'high',
    read: false,
  },
  {
    id: '2',
    type: 'geofence',
    title: 'Geofence Violation',
    message: 'Truck XYZ-456 exited authorized zone',
    timestamp: '2025-07-02T09:15:00Z',
    severity: 'medium',
    read: true,
  },
];

export function AlertsScreen() {
  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'temperature': return 'thermometer-outline';
      case 'geofence': return 'location-outline';
      case 'speed': return 'speedometer-outline';
      case 'offline': return 'wifi-outline';
      default: return 'alert-circle-outline';
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#FF5722';
      case 'critical': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderAlert = ({ item }: { item: Alert }) => (
    <TouchableOpacity style={[styles.alertItem, !item.read && styles.unreadAlert]}>
      <View style={styles.alertHeader}>
        <View style={styles.alertIconContainer}>
          <Ionicons
            name={getAlertIcon(item.type) as any}
            size={24}
            color={getSeverityColor(item.severity)}
          />
        </View>
        
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>{item.title}</Text>
          <Text style={styles.alertMessage}>{item.message}</Text>
          <Text style={styles.alertTimestamp}>{formatTimestamp(item.timestamp)}</Text>
        </View>
        
        <View style={[
          styles.severityBadge,
          { backgroundColor: getSeverityColor(item.severity) }
        ]}>
          <Text style={styles.severityText}>{item.severity}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alerts</Text>
        <TouchableOpacity style={styles.markAllButton}>
          <Text style={styles.markAllText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={mockAlerts}
        renderItem={renderAlert}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2196F3',
    borderRadius: 16,
  },
  markAllText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  alertItem: {
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
  unreadAlert: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  alertIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  alertTimestamp: {
    fontSize: 12,
    color: '#999',
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  severityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
