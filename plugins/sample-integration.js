// Sample Plugin Integration for Ice Truck Tracking
const axios = require('axios');

class IceTruckPlugin {
  constructor(config) {
    this.name = config.name;
    this.version = config.version;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://localhost:5000/api/v1';
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-Plugin-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  // Register plugin with the system
  async register() {
    try {
      const response = await this.httpClient.post('/plugins/register', {
        name: this.name,
        version: this.version,
        description: 'Sample plugin for demonstration',
        endpoints: [
          {
            path: '/custom-alerts',
            method: 'GET',
            handler: `${this.baseUrl}/plugins/${this.name}/alerts`,
          },
        ],
        hooks: ['truck.location.update', 'geofence.violation'],
        permissions: ['read:trucks', 'write:alerts'],
      });

      console.log('Plugin registered:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to register plugin:', error.message);
      throw error;
    }
  }

  // Handle truck location updates
  async onTruckLocationUpdate(data) {
    console.log(`Truck ${data.truckId} location updated:`, data);
    
    // Custom logic: Check if truck is moving too fast
    if (data.speed > 80) {
      await this.createSpeedAlert(data);
    }

    // Custom logic: Check temperature anomalies
    if (data.temperature > 10 || data.temperature < -5) {
      await this.createTemperatureAlert(data);
    }
  }

  // Handle geofence violations
  async onGeofenceViolation(data) {
    console.log('Geofence violation detected:', data);
    
    // Send custom notification
    await this.sendCustomNotification({
      type: 'geofence_violation',
      truckId: data.truckId,
      location: data.location,
      timestamp: data.timestamp,
    });
  }

  // Create speed alert
  async createSpeedAlert(data) {
    try {
      await this.httpClient.post('/alerts', {
        type: 'speed_violation',
        truckId: data.truckId,
        severity: 'high',
        message: `Truck ${data.truckId} exceeding speed limit: ${data.speed} km/h`,
        data: {
          speed: data.speed,
          location: { lat: data.latitude, lng: data.longitude },
          timestamp: data.timestamp,
        },
      });
    } catch (error) {
      console.error('Failed to create speed alert:', error.message);
    }
  }

  // Create temperature alert
  async createTemperatureAlert(data) {
    try {
      await this.httpClient.post('/alerts', {
        type: 'temperature_anomaly',
        truckId: data.truckId,
        severity: data.temperature > 10 ? 'critical' : 'medium',
        message: `Temperature anomaly detected: ${data.temperature}°C`,
        data: {
          temperature: data.temperature,
          location: { lat: data.latitude, lng: data.longitude },
          timestamp: data.timestamp,
        },
      });
    } catch (error) {
      console.error('Failed to create temperature alert:', error.message);
    }
  }

  // Send custom notification
  async sendCustomNotification(data) {
    try {
      // Integration with external service (e.g., Slack, Teams, etc.)
      await axios.post('https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK', {
        text: `🚨 Ice Truck Alert: ${data.type}`,
        attachments: [
          {
            color: 'danger',
            fields: [
              { title: 'Truck ID', value: data.truckId, short: true },
              { title: 'Time', value: data.timestamp, short: true },
              { title: 'Location', value: `${data.location.lat}, ${data.location.lng}`, short: false },
            ],
          },
        ],
      });
    } catch (error) {
      console.error('Failed to send custom notification:', error.message);
    }
  }

  // Get truck data
  async getTruckData() {
    try {
      const response = await this.httpClient.get('/plugins/data/trucks');
      return response.data;
    } catch (error) {
      console.error('Failed to get truck data:', error.message);
      throw error;
    }
  }

  // Custom endpoint handler
  async handleCustomAlerts(req, res) {
    try {
      const trucks = await this.getTruckData();
      const customAlerts = trucks
        .filter(truck => truck.speed > 60 || truck.temperature > 5)
        .map(truck => ({
          truckId: truck.id,
          type: truck.speed > 60 ? 'speed_warning' : 'temperature_warning',
          value: truck.speed > 60 ? truck.speed : truck.temperature,
          timestamp: new Date().toISOString(),
        }));

      res.json({ alerts: customAlerts });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

// Usage example
const plugin = new IceTruckPlugin({
  name: 'sample-plugin',
  version: '1.0.0',
  apiKey: 'your-plugin-api-key',
  baseUrl: 'http://localhost:5000/api/v1',
});

// Initialize plugin
async function initializePlugin() {
  try {
    await plugin.register();
    console.log('Plugin initialized successfully');
  } catch (error) {
    console.error('Plugin initialization failed:', error.message);
  }
}

// Export for use in other modules
module.exports = { IceTruckPlugin, initializePlugin };

// Auto-initialize if run directly
if (require.main === module) {
  initializePlugin();
}