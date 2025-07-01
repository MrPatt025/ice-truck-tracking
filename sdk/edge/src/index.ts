import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import axios, { AxiosInstance } from 'axios';

export interface TruckData {
  truckId: string;
  latitude: number;
  longitude: number;
  temperature: number;
  speed: number;
  timestamp: string;
  batteryLevel?: number;
  fuelLevel?: number;
}

export interface EdgeSDKConfig {
  apiUrl: string;
  clientCert: string;
  clientKey: string;
  caCert: string;
  bufferSize: number;
  syncInterval: number;
  retryAttempts: number;
}

export class IceTruckEdgeSDK {
  private config: EdgeSDKConfig;
  private db: sqlite3.Database;
  private httpClient: AxiosInstance;
  private syncTimer: NodeJS.Timeout | null = null;
  private isOnline = false;

  constructor(config: EdgeSDKConfig) {
    this.config = config;
    this.initDatabase();
    this.initHttpClient();
    this.startSyncProcess();
    this.checkConnectivity();
  }

  private initDatabase() {
    const dbPath = path.join(__dirname, '../data/buffer.db');
    this.db = new sqlite3.Database(dbPath);
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS truck_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        truck_id TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        temperature REAL NOT NULL,
        speed REAL NOT NULL,
        timestamp TEXT NOT NULL,
        battery_level REAL,
        fuel_level REAL,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private initHttpClient() {
    const httpsAgent = new https.Agent({
      cert: fs.readFileSync(this.config.clientCert),
      key: fs.readFileSync(this.config.clientKey),
      ca: fs.readFileSync(this.config.caCert),
      rejectUnauthorized: true,
    });

    this.httpClient = axios.create({
      baseURL: this.config.apiUrl,
      httpsAgent,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'IceTruck-EdgeSDK/1.0.0',
      },
    });
  }

  async trackTruck(data: TruckData): Promise<void> {
    await this.bufferData(data);
    if (this.isOnline) {
      await this.syncBufferedData();
    }
  }

  private async bufferData(data: TruckData): Promise<void> {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO truck_data 
        (truck_id, latitude, longitude, temperature, speed, timestamp, battery_level, fuel_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run([
        data.truckId,
        data.latitude,
        data.longitude,
        data.temperature,
        data.speed,
        data.timestamp,
        data.batteryLevel || null,
        data.fuelLevel || null,
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });

      stmt.finalize();
    });
  }

  private async syncBufferedData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM truck_data WHERE synced = 0 ORDER BY created_at ASC LIMIT ?',
        [this.config.bufferSize],
        async (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          if (rows.length === 0) {
            resolve();
            return;
          }

          try {
            const payload = rows.map(row => ({
              truckId: row.truck_id,
              latitude: row.latitude,
              longitude: row.longitude,
              temperature: row.temperature,
              speed: row.speed,
              timestamp: row.timestamp,
              batteryLevel: row.battery_level,
              fuelLevel: row.fuel_level,
            }));

            await this.httpClient.post('/api/v1/tracking/bulk', { data: payload });

            const ids = rows.map(row => row.id);
            const placeholders = ids.map(() => '?').join(',');
            
            this.db.run(
              `UPDATE truck_data SET synced = 1 WHERE id IN (${placeholders})`,
              ids,
              (updateErr) => {
                if (updateErr) reject(updateErr);
                else resolve();
              }
            );
          } catch (syncError) {
            console.error('Sync failed:', syncError);
            this.isOnline = false;
            reject(syncError);
          }
        }
      );
    });
  }

  private startSyncProcess() {
    this.syncTimer = setInterval(async () => {
      if (this.isOnline) {
        try {
          await this.syncBufferedData();
        } catch (error) {
          console.error('Periodic sync failed:', error);
        }
      }
    }, this.config.syncInterval);
  }

  private async checkConnectivity() {
    setInterval(async () => {
      try {
        await this.httpClient.get('/api/v1/health');
        this.isOnline = true;
      } catch (error) {
        this.isOnline = false;
      }
    }, 30000);
  }

  async getBufferStatus(): Promise<{ total: number; pending: number; synced: number }> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as total, SUM(CASE WHEN synced = 0 THEN 1 ELSE 0 END) as pending, SUM(CASE WHEN synced = 1 THEN 1 ELSE 0 END) as synced FROM truck_data',
        (err, row) => {
          if (err) reject(err);
          else resolve(row as any);
        }
      );
    });
  }

  destroy() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.db.close();
  }
}

export default IceTruckEdgeSDK;