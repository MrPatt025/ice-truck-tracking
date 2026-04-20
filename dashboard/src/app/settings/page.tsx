'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, User, Shield, Key, Bell, Palette,
  Save, Camera, Loader2, CheckCircle, Moon, Sun, Monitor,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppSidebar from '@/components/AppSidebar';
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper';
import { useAuthStore } from '@/stores/authStore';

type SettingsTab = 'profile' | 'security' | 'api-keys' | 'notifications' | 'appearance';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [tab, setTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);

  // Profile form
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    company: user?.company || '',
  });

  // Security settings
  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: 30,
    loginAlerts: true,
  });

  // API Keys
  const [apiKeys] = useState([
    { id: '1', name: 'Production API', key: 'ict_prod_••••••••abcd', lastUsed: '2 hours ago', created: '2024-01-15' },
    { id: '2', name: 'Staging API', key: 'ict_stg_••••••••efgh', lastUsed: '5 days ago', created: '2024-02-20' },
    { id: '3', name: 'Mobile App', key: 'ict_mob_••••••••ijkl', lastUsed: '1 hour ago', created: '2024-03-10' },
  ]);

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    pushAlerts: true,
    dailyDigest: true,
    weeklyReport: true,
    criticalOnly: false,
  });

  const handleSave = useCallback(async () => {
    if (tab === 'profile') {
      await updateProfile(profile);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [tab, profile, updateProfile]);

  const tabs: { key: SettingsTab; label: string; icon: LucideIcon }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'api-keys', label: 'API Keys', icon: Key },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <AppSidebar>
      <PremiumPageWrapper
        mode='glass'
        denseNoise
        contentClassName='border-white/25 bg-slate-950/42 shadow-[0_36px_130px_-72px_rgba(99,102,241,0.95)]'
      >
        <div className='mx-auto max-w-[1200px] p-4 lg:p-6'>
          {/* Header */}
          <div className='mb-6'>
            <h1 className='flex items-center gap-2 text-2xl font-bold leading-tight'>
              <Settings className='w-7 h-7 text-primary' />
              Settings
            </h1>
            <p className='mt-1 text-sm leading-6 text-muted-foreground'>
              Manage your account preferences and configuration
            </p>
          </div>

          <div className='flex flex-col lg:flex-row gap-6'>
            {/* Sidebar Tabs */}
            <div className='lg:w-52 shrink-0'>
              <nav className='flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0'>
                {tabs.map(t => {
                  const IconComponent = t.icon
                  return (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                        tab === t.key
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <IconComponent className='w-4 h-4' />
                      {t.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Content */}
            <div className='flex-1 min-w-0'>
              {/* Profile Tab */}
              {tab === 'profile' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className='bg-card rounded-xl border border-border p-6 space-y-6'
                >
                  <h2 className='text-lg font-semibold'>Profile Information</h2>

                  {/* Avatar */}
                  <div className='flex items-center gap-4'>
                    <div className='w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold'>
                      {profile.name.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <button className='px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted flex items-center gap-1 transition-colors'>
                        <Camera className='w-4 h-4' />
                        Change photo
                      </button>
                      <p className='text-xs text-muted-foreground mt-1'>
                        JPG, PNG or SVG. Max 2MB.
                      </p>
                    </div>
                  </div>

                  {/* Form */}
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <label
                        htmlFor='settings-name'
                        className='text-sm font-medium'
                      >
                        Full name
                      </label>
                      <input
                        id='settings-name'
                        type='text'
                        value={profile.name}
                        onChange={e =>
                          setProfile(p => ({ ...p, name: e.target.value }))
                        }
                        className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-primary/50'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label
                        htmlFor='settings-email'
                        className='text-sm font-medium'
                      >
                        Email
                      </label>
                      <input
                        id='settings-email'
                        type='email'
                        value={profile.email}
                        onChange={e =>
                          setProfile(p => ({ ...p, email: e.target.value }))
                        }
                        className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-primary/50'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label
                        htmlFor='settings-phone'
                        className='text-sm font-medium'
                      >
                        Phone
                      </label>
                      <input
                        id='settings-phone'
                        type='tel'
                        value={profile.phone}
                        onChange={e =>
                          setProfile(p => ({ ...p, phone: e.target.value }))
                        }
                        placeholder='+66 xxx xxx xxxx'
                        className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-primary/50'
                      />
                    </div>
                    <div className='space-y-2'>
                      <label
                        htmlFor='settings-company'
                        className='text-sm font-medium'
                      >
                        Company
                      </label>
                      <input
                        id='settings-company'
                        type='text'
                        value={profile.company}
                        onChange={e =>
                          setProfile(p => ({ ...p, company: e.target.value }))
                        }
                        className='w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-5 focus:outline-none focus:ring-2 focus:ring-primary/50'
                      />
                    </div>
                  </div>

                  <div className='flex items-center gap-2'>
                    <p className='text-xs text-muted-foreground capitalize'>
                      Role:{' '}
                      <span className='font-medium text-foreground'>
                        {user?.role || 'viewer'}
                      </span>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Security Tab */}
              {tab === 'security' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className='bg-card rounded-xl border border-border p-6 space-y-6'
                >
                  <h2 className='text-lg font-semibold'>Security Settings</h2>

                  <div className='space-y-6'>
                    {/* 2FA */}
                    <div className='flex items-center justify-between py-3 border-b border-border'>
                      <div>
                        <p className='font-medium text-sm'>
                          Two-Factor Authentication
                        </p>
                        <p className='text-xs text-muted-foreground mt-0.5'>
                          Add an extra layer of security to your account
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setSecurity(s => ({ ...s, twoFactor: !s.twoFactor }))
                        }
                        className={cn(
                          'w-10 h-5 rounded-full relative transition-colors',
                          security.twoFactor
                            ? 'bg-green-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        )}
                        aria-label={
                          security.twoFactor
                            ? 'Disable two-factor authentication'
                            : 'Enable two-factor authentication'
                        }
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                            security.twoFactor ? 'left-5' : 'left-0.5'
                          )}
                        />
                      </button>
                    </div>

                    {/* Session Timeout */}
                    <div className='flex items-center justify-between py-3 border-b border-border'>
                      <div>
                        <p className='font-medium text-sm'>Session Timeout</p>
                        <p className='text-xs text-muted-foreground mt-0.5'>
                          Automatically log out after inactivity
                        </p>
                      </div>
                      <select
                        value={security.sessionTimeout}
                        onChange={e =>
                          setSecurity(s => ({
                            ...s,
                            sessionTimeout: Number(e.target.value),
                          }))
                        }
                        className='rounded-lg border border-input bg-background px-3 py-1.5 text-sm leading-5'
                        aria-label='Session timeout'
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={120}>2 hours</option>
                      </select>
                    </div>

                    {/* Login Alerts */}
                    <div className='flex items-center justify-between py-3 border-b border-border'>
                      <div>
                        <p className='font-medium text-sm'>Login Alerts</p>
                        <p className='text-xs text-muted-foreground mt-0.5'>
                          Get notified of new login attempts
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setSecurity(s => ({
                            ...s,
                            loginAlerts: !s.loginAlerts,
                          }))
                        }
                        className={cn(
                          'w-10 h-5 rounded-full relative transition-colors',
                          security.loginAlerts
                            ? 'bg-green-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        )}
                        aria-label={
                          security.loginAlerts
                            ? 'Disable login alerts'
                            : 'Enable login alerts'
                        }
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                            security.loginAlerts ? 'left-5' : 'left-0.5'
                          )}
                        />
                      </button>
                    </div>

                    {/* Change Password */}
                    <div>
                      <button className='px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors'>
                        Change Password
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* API Keys Tab */}
              {tab === 'api-keys' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className='bg-card rounded-xl border border-border p-6 space-y-6'
                >
                  <div className='flex items-center justify-between'>
                    <h2 className='text-lg font-semibold'>API Keys</h2>
                    <button className='px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors'>
                      Generate New Key
                    </button>
                  </div>

                  <div className='space-y-3'>
                    {apiKeys.map(key => (
                      <div
                        key={key.id}
                        className='flex items-center justify-between p-4 rounded-lg border border-border'
                      >
                        <div>
                          <p className='font-medium text-sm'>{key.name}</p>
                          <p className='font-mono text-xs text-muted-foreground mt-1'>
                            {key.key}
                          </p>
                          <p className='text-xs text-muted-foreground mt-1'>
                            Last used: {key.lastUsed} • Created: {key.created}
                          </p>
                        </div>
                        <button className='px-3 py-1.5 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors'>
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Notifications Tab */}
              {tab === 'notifications' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className='bg-card rounded-xl border border-border p-6 space-y-6'
                >
                  <h2 className='text-lg font-semibold'>
                    Notification Preferences
                  </h2>

                  {[
                    {
                      key: 'emailAlerts' as const,
                      label: 'Email Alerts',
                      desc: 'Receive alert notifications via email',
                    },
                    {
                      key: 'smsAlerts' as const,
                      label: 'SMS Alerts',
                      desc: 'Receive critical alerts via SMS',
                    },
                    {
                      key: 'pushAlerts' as const,
                      label: 'Push Notifications',
                      desc: 'Browser push notifications for real-time alerts',
                    },
                    {
                      key: 'dailyDigest' as const,
                      label: 'Daily Digest',
                      desc: 'Summary of fleet activity every morning',
                    },
                    {
                      key: 'weeklyReport' as const,
                      label: 'Weekly Report',
                      desc: 'Detailed fleet performance report every Monday',
                    },
                    {
                      key: 'criticalOnly' as const,
                      label: 'Critical Only',
                      desc: 'Only receive notifications for critical alerts',
                    },
                  ].map(item => (
                    <div
                      key={item.key}
                      className='flex items-center justify-between py-3 border-b border-border last:border-0'
                    >
                      <div>
                        <p className='font-medium text-sm'>{item.label}</p>
                        <p className='text-xs text-muted-foreground mt-0.5'>
                          {item.desc}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications(n => ({
                            ...n,
                            [item.key]: !n[item.key],
                          }))
                        }
                        className={cn(
                          'w-10 h-5 rounded-full relative transition-colors',
                          notifications[item.key]
                            ? 'bg-green-500'
                            : 'bg-gray-300 dark:bg-gray-600'
                        )}
                        aria-label={`Toggle ${item.label}`}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                            notifications[item.key] ? 'left-5' : 'left-0.5'
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* Appearance Tab */}
              {tab === 'appearance' && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className='bg-card rounded-xl border border-border p-6 space-y-6'
                >
                  <h2 className='text-lg font-semibold'>Appearance</h2>

                  <div>
                    <p className='font-medium text-sm mb-3'>Theme</p>
                    <div className='grid grid-cols-3 gap-3'>
                      {[
                        { value: 'light', icon: Sun, label: 'Light' },
                        { value: 'dark', icon: Moon, label: 'Dark' },
                        { value: 'system', icon: Monitor, label: 'System' },
                      ].map(theme => (
                        <button
                          key={theme.value}
                          className='flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors'
                        >
                          <theme.icon className='w-5 h-5' />
                          <span className='text-sm'>{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className='font-medium text-sm mb-3'>
                      Dashboard Density
                    </p>
                    <div className='flex gap-2'>
                      {['Compact', 'Comfortable', 'Spacious'].map(density => (
                        <button
                          key={density}
                          className='px-4 py-2 rounded-lg border border-border text-sm hover:border-primary/50 transition-colors'
                        >
                          {density}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Save Button */}
              <div className='mt-4 flex items-center gap-3 justify-end'>
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className='flex items-center gap-1 text-sm text-green-500'
                  >
                    <CheckCircle className='w-4 h-4' />
                    Saved
                  </motion.span>
                )}
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className='px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors'
                >
                  {isLoading ? (
                    <Loader2 className='w-4 h-4 animate-spin' />
                  ) : (
                    <Save className='w-4 h-4' />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </PremiumPageWrapper>
    </AppSidebar>
  )
}
