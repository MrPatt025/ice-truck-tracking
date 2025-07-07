import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [offlineSync, setOfflineSync] = React.useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    rightElement 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={24} color="#2196F3" />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color="#ccc" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* User Profile */}
      <View style={styles.section}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color="white" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileRole}>{user?.role}</Text>
          </View>
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <SettingItem
          icon="notifications-outline"
          title="Push Notifications"
          subtitle="Receive alerts and updates"
          rightElement={
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#ccc', true: '#2196F3' }}
            />
          }
        />
        
        <SettingItem
          icon="moon-outline"
          title="Dark Mode"
          subtitle="Use dark theme"
          rightElement={
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#ccc', true: '#2196F3' }}
            />
          }
        />
        
        <SettingItem
          icon="sync-outline"
          title="Offline Sync"
          subtitle="Sync data when offline"
          rightElement={
            <Switch
              value={offlineSync}
              onValueChange={setOfflineSync}
              trackColor={{ false: '#ccc', true: '#2196F3' }}
            />
          }
        />
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <SettingItem
          icon="information-circle-outline"
          title="App Version"
          subtitle="1.0.0"
        />
        
        <SettingItem
          icon="help-circle-outline"
          title="Help & Support"
          subtitle="Get help and contact support"
        />
        
        <SettingItem
          icon="document-text-outline"
          title="Privacy Policy"
          subtitle="Read our privacy policy"
        />
      </View>

      {/* Sign Out */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#F44336" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
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
  section: {
    marginTop: 16,
    backgroundColor: 'white',
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 12,
    color: '#2196F3',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '600',
  },
});