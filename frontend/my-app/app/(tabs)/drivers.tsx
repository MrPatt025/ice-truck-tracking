import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, StyleSheet } from 'react-native';
import { driversAPI } from '../../utils/api';

interface Driver {
  id: number;
  full_name: string;
  license_number: string;
  phone: string;
}

export default function DriversScreen() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await driversAPI.getAll();
      setDrivers(res.data);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading drivers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList 
        data={drivers} 
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.driverItem}>
            <Text style={styles.driverName}>{item.full_name}</Text>
            <Text style={styles.driverInfo}>License: {item.license_number}</Text>
            <Text style={styles.driverInfo}>Phone: {item.phone}</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  driverItem: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  driverInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
});
