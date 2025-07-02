import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, Alert, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';

// Import our SDK
const IceTruckMobileSDK = require('../sdk/mobile/src/index.ts').IceTruckMobileSDK;

export default function App() {
  const [location, setLocation] = useState(null);
  const [sdk, setSdk] = useState(null);
  const [status, setStatus] = useState('Initializing...');
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  useEffect(() => {
    initializeSDK();
    requestLocationPermission();
  }, []);

  const initializeSDK = () => {
    try {
      const sdkInstance = new IceTruckMobileSDK({
        apiUrl: 'http://localhost:5000',
        apiKey: 'demo-key',
        cacheSize: 100,
        syncInterval: 30000,
        enableOfflineMode: true
      });
      
      setSdk(sdkInstance);
      setStatus('SDK Initialized');
      addLog('✅ SDK initialized successfully');
    } catch (error) {
      setStatus('SDK Error');
      addLog(`❌ SDK Error: ${error.message}`);
    }
  };

  const requestLocationPermission = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required');
        addLog('❌ Location permission denied');
        return;
      }
      addLog('✅ Location permission granted');
      getCurrentLocation();
    } catch (error) {
      addLog(`❌ Permission error: ${error.message}`);
    }
  };

  const getCurrentLocation = async () => {
    try {
      addLog('📍 Getting current location...');
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      addLog(`✅ Location: ${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`);
    } catch (error) {
      addLog(`❌ Location error: ${error.message}`);
    }
  };

  const trackLocation = async () => {
    if (!sdk || !location) {
      Alert.alert('Error', 'SDK or location not available');
      return;
    }

    try {
      addLog('🚚 Tracking location...');
      await sdk.trackLocation({
        truckId: 'test-truck-001',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        timestamp: new Date().toISOString(),
        accuracy: location.coords.accuracy
      });
      addLog('✅ Location tracked successfully');
      setStatus('Location Tracked');
    } catch (error) {
      addLog(`❌ Tracking error: ${error.message}`);
      setStatus('Tracking Error');
    }
  };

  const checkCacheStatus = async () => {
    if (!sdk) return;
    
    try {
      const cacheStatus = await sdk.getCacheStatus();
      addLog(`📦 Cache: ${cacheStatus.count} items, ${cacheStatus.size}`);
    } catch (error) {
      addLog(`❌ Cache error: ${error.message}`);
    }
  };

  const clearCache = async () => {
    if (!sdk) return;
    
    try {
      await sdk.clearCache();
      addLog('🗑️ Cache cleared');
    } catch (error) {
      addLog(`❌ Clear cache error: ${error.message}`);
    }
  };

  const testConnection = () => {
    if (!sdk) return;
    
    const isConnected = sdk.isConnected();
    addLog(`🌐 Connection: ${isConnected ? 'Online' : 'Offline'}`);
    setStatus(isConnected ? 'Online' : 'Offline');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      <Text style={styles.title}>🚚❄️ Ice Truck Mobile Test</Text>
      <Text style={styles.status}>Status: {status}</Text>
      
      {location && (
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            📍 Lat: {location.coords.latitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            📍 Lng: {location.coords.longitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            🎯 Accuracy: {location.coords.accuracy?.toFixed(1)}m
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <Button title="📍 Get Location" onPress={getCurrentLocation} />
        <Button title="🚚 Track Location" onPress={trackLocation} />
        <Button title="📦 Check Cache" onPress={checkCacheStatus} />
        <Button title="🗑️ Clear Cache" onPress={clearCache} />
        <Button title="🌐 Test Connection" onPress={testConnection} />
      </View>

      <Text style={styles.logsTitle}>📋 Activity Logs:</Text>
      <ScrollView style={styles.logsContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2196F3',
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  locationInfo: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 10,
    borderRadius: 8,
  },
  logText: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});