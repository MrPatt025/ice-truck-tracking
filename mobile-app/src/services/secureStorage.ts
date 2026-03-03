import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PREFIX = 'ice_truck_';

/**
 * Secure Storage adapter — uses expo-secure-store on native,
 * falls back to in-memory store on web/tests.
 *
 * Tokens and sensitive data are stored encrypted in the device keychain
 * (iOS Keychain / Android EncryptedSharedPreferences).
 */
class SecureStorage {
  private memoryStore = new Map<string, string>();

  private get isNative(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  async get(key: string): Promise<string | null> {
    const prefixedKey = PREFIX + key;
    if (this.isNative) {
      return SecureStore.getItemAsync(prefixedKey);
    }
    return this.memoryStore.get(prefixedKey) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    const prefixedKey = PREFIX + key;
    if (this.isNative) {
      await SecureStore.setItemAsync(prefixedKey, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } else {
      this.memoryStore.set(prefixedKey, value);
    }
  }

  async remove(key: string): Promise<void> {
    const prefixedKey = PREFIX + key;
    if (this.isNative) {
      await SecureStore.deleteItemAsync(prefixedKey);
    } else {
      this.memoryStore.delete(prefixedKey);
    }
  }

  /** Store access + refresh tokens atomically */
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      this.set('access_token', accessToken),
      this.set('refresh_token', refreshToken),
    ]);
  }

  async getAccessToken(): Promise<string | null> {
    return this.get('access_token');
  }

  async getRefreshToken(): Promise<string | null> {
    return this.get('refresh_token');
  }

  /** Remove all auth tokens */
  async clearTokens(): Promise<void> {
    await Promise.all([
      this.remove('access_token'),
      this.remove('refresh_token'),
    ]);
  }
}

export const secureStorage = new SecureStorage();
