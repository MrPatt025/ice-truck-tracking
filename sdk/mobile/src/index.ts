import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TruckLocation {
  truckId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
}

export interface MobileSDKConfig {
  apiUrl: string;
  apiKey: string;
  cacheSize: number;
  syncInterval: number;
  enableOfflineMode: boolean;
}

export class IceTruckMobileSDK {
  private config: MobileSDKConfig;
  private httpClient: AxiosInstance;
  private syncTimer: NodeJS.Timeout | null = null;
  private isOnline = true;
  private cacheKey = '@IceTruck:LocationCache';

  constructor(config: MobileSDKConfig) {
    this.config = config;
    this.init();
  }

  private init() {
    this.httpClient = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'IceTruck-MobileSDK/1.0.0',
      },
    });

    if (this.config.enableOfflineMode) {
      this.startSyncProcess();
    }

    this.checkConnectivity();
  }

  async trackLocation(location: TruckLocation): Promise<void> {
    if (this.config.enableOfflineMode) {
      await this.cacheLocation(location);
    }

    if (this.isOnline) {
      try {
        await this.httpClient.post('/api/v1/tracking/location', location);
        
        if (this.config.enableOfflineMode) {
          await this.syncCachedLocations();
        }
      } catch (error) {
        console.error('Failed to track location:', error);
        this.isOnline = false;
      }
    }
  }

  private async cacheLocation(location: TruckLocation): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.cacheKey);
      const locations: TruckLocation[] = cached ? JSON.parse(cached) : [];
      
      locations.push(location);
      
      // Keep only recent locations within cache size
      if (locations.length > this.config.cacheSize) {
        locations.splice(0, locations.length - this.config.cacheSize);
      }
      
      await AsyncStorage.setItem(this.cacheKey, JSON.stringify(locations));
    } catch (error) {
      console.error('Failed to cache location:', error);
    }
  }

  private async syncCachedLocations(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.cacheKey);
      if (!cached) return;

      const locations: TruckLocation[] = JSON.parse(cached);
      if (locations.length === 0) return;

      await this.httpClient.post('/api/v1/tracking/bulk', { locations });
      
      // Clear cache after successful sync
      await AsyncStorage.removeItem(this.cacheKey);
    } catch (error) {
      console.error('Failed to sync cached locations:', error);
      this.isOnline = false;
    }
  }

  private startSyncProcess() {
    this.syncTimer = setInterval(async () => {
      if (this.isOnline) {
        await this.syncCachedLocations();
      }
    }, this.config.syncInterval);
  }

  private checkConnectivity() {
    setInterval(async () => {
      try {
        await this.httpClient.get('/api/v1/health');
        this.isOnline = true;
      } catch (error) {
        this.isOnline = false;
      }
    }, 30000);
  }

  async getCacheStatus(): Promise<{ count: number; size: string }> {
    try {
      const cached = await AsyncStorage.getItem(this.cacheKey);
      const locations: TruckLocation[] = cached ? JSON.parse(cached) : [];
      const size = new Blob([cached || '']).size;
      
      return {
        count: locations.length,
        size: `${(size / 1024).toFixed(2)} KB`,
      };
    } catch (error) {
      return { count: 0, size: '0 KB' };
    }
  }

  async clearCache(): Promise<void> {
    await AsyncStorage.removeItem(this.cacheKey);
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }
}

// Simple initialization function
export function init(config: MobileSDKConfig): IceTruckMobileSDK {
  return new IceTruckMobileSDK(config);
}

export default IceTruckMobileSDK;