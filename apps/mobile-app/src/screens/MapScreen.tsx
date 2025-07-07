import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MapView, { Marker, Callout, Circle } from 'react-native-maps'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'

import { useRealTimeTracking } from '../hooks/useRealTimeTracking'
import { ConnectionStatus } from '../components/ConnectionStatus'

interface Truck {
  id: string
  latitude: number
  longitude: number
  driver_name: string
  temperature: number
  speed: number
  status: 'active' | 'inactive'
}

export function MapScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null)
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard')
  const { trucks, isConnected } = useRealTimeTracking()

  useEffect(() => {
    getCurrentLocation()
  }, [])

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        return
      }

      const currentLocation = await Location.getCurrentPositionAsync({})
      setLocation(currentLocation)
    } catch (error) {
      console.error('Location error:', error)
    }
  }

  const initialRegion = {
    latitude: location?.coords.latitude || 13.7563,
    longitude: location?.coords.longitude || 100.5018,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Tracking</Text>
        <ConnectionStatus isConnected={isConnected} />
      </View>

      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton
      >
        {trucks.map((truck: Truck) => (
          <Marker
            key={truck.id}
            coordinate={{
              latitude: truck.latitude,
              longitude: truck.longitude,
            }}
            title={truck.driver_name}
          >
            <View
              style={[
                styles.markerContainer,
                {
                  backgroundColor:
                    truck.status === 'active' ? '#4CAF50' : '#9E9E9E',
                },
              ]}
            >
              <Ionicons name='car' size={20} color='white' />
            </View>

            <Callout style={styles.callout}>
              <View style={styles.calloutContent}>
                <Text style={styles.calloutTitle}>{truck.driver_name}</Text>
                <Text style={styles.calloutText}>ID: {truck.id}</Text>
                <Text style={styles.calloutText}>
                  Speed: {truck.speed} km/h
                </Text>
                <Text style={styles.calloutText}>
                  Temp: {truck.temperature}°C
                </Text>
                <Text
                  style={[
                    styles.calloutStatus,
                    {
                      color: truck.status === 'active' ? '#4CAF50' : '#9E9E9E',
                    },
                  ]}
                >
                  {truck.status.toUpperCase()}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}

        {/* Sample geofence */}
        <Circle
          center={{ latitude: 13.7563, longitude: 100.5018 }}
          radius={1000}
          strokeColor='rgba(33, 150, 243, 0.5)'
          fillColor='rgba(33, 150, 243, 0.1)'
        />
      </MapView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() =>
            setMapType(mapType === 'standard' ? 'satellite' : 'standard')
          }
        >
          <Ionicons name='layers-outline' size={24} color='#2196F3' />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={getCurrentLocation}
        >
          <Ionicons name='locate-outline' size={24} color='#2196F3' />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
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
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  callout: {
    width: 200,
  },
  calloutContent: {
    padding: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calloutText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  calloutStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  controls: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    backgroundColor: 'white',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
})
