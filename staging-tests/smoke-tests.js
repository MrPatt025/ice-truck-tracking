const axios = require('axios');
const WebSocket = require('ws');

class SmokeTestRunner {
  constructor() {
    this.baseUrl = process.env.STAGING_URL || 'http://localhost:5000';
    this.results = [];
    this.failures = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Smoke Tests...');
    
    try {
      await this.testHealthEndpoint();
      await this.testWebSocketConnection();
      await this.testTruckSimulation();
      await this.testNotificationSystem();
      await this.testOfflineSync();
      
      this.generateReport();
      return this.failures.length === 0;
    } catch (error) {
      console.error('❌ Smoke tests failed:', error);
      return false;
    }
  }

  async testHealthEndpoint() {
    console.log('🏥 Testing health endpoint...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/v1/health`, { timeout: 5000 });
      
      if (response.status === 200 && response.data.status === 'healthy') {
        this.logSuccess('Health endpoint', 'API is healthy');
      } else {
        this.logFailure('Health endpoint', `Unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      this.logFailure('Health endpoint', error.message);
    }
  }

  async testWebSocketConnection() {
    console.log('🔌 Testing WebSocket connection...');
    
    return new Promise((resolve) => {
      const ws = new WebSocket(`ws://localhost:5000`);
      let connected = false;
      
      const timeout = setTimeout(() => {
        if (!connected) {
          this.logFailure('WebSocket', 'Connection timeout');
          ws.close();
          resolve();
        }
      }, 5000);

      ws.on('open', () => {
        connected = true;
        clearTimeout(timeout);
        this.logSuccess('WebSocket', 'Connection established');
        ws.close();
        resolve();
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.logFailure('WebSocket', error.message);
        resolve();
      });
    });
  }

  async testTruckSimulation() {
    console.log('🚚 Testing truck simulation...');
    
    const trucks = [
      { id: 'test-truck-001', lat: 13.7563, lng: 100.5018 },
      { id: 'test-truck-002', lat: 13.7600, lng: 100.5100 },
      { id: 'test-truck-003', lat: 13.7650, lng: 100.5200 }
    ];

    for (const truck of trucks) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/v1/tracking/location`, {
          truckId: truck.id,
          latitude: truck.lat,
          longitude: truck.lng,
          timestamp: new Date().toISOString()
        });

        if (response.status === 200) {
          this.logSuccess('Truck simulation', `Truck ${truck.id} location updated`);
        } else {
          this.logFailure('Truck simulation', `Failed to update truck ${truck.id}`);
        }
      } catch (error) {
        this.logFailure('Truck simulation', `Truck ${truck.id}: ${error.message}`);
      }
    }
  }

  async testNotificationSystem() {
    console.log('🔔 Testing notification system...');
    
    try {
      const response = await axios.post('http://localhost:3002/send', {
        type: 'alert',
        channel: 'console',
        recipient: 'test@example.com',
        template: 'default',
        data: {
          message: 'Smoke test notification',
          timestamp: new Date().toISOString()
        },
        priority: 'normal'
      });

      if (response.status === 200) {
        this.logSuccess('Notification system', 'Test notification sent');
      } else {
        this.logFailure('Notification system', 'Failed to send notification');
      }
    } catch (error) {
      this.logFailure('Notification system', error.message);
    }
  }

  async testOfflineSync() {
    console.log('📱 Testing offline sync...');
    
    try {
      // Simulate bulk location update (offline sync)
      const locations = [
        { truckId: 'test-truck-001', latitude: 13.7563, longitude: 100.5018, timestamp: new Date().toISOString() },
        { truckId: 'test-truck-002', latitude: 13.7600, longitude: 100.5100, timestamp: new Date().toISOString() }
      ];

      const response = await axios.post(`${this.baseUrl}/api/v1/tracking/bulk`, {
        data: locations
      });

      if (response.status === 200) {
        this.logSuccess('Offline sync', `Synced ${locations.length} locations`);
      } else {
        this.logFailure('Offline sync', 'Bulk sync failed');
      }
    } catch (error) {
      this.logFailure('Offline sync', error.message);
    }
  }

  logSuccess(test, message) {
    const result = { test, status: 'PASS', message, timestamp: new Date().toISOString() };
    this.results.push(result);
    console.log(`✅ ${test}: ${message}`);
  }

  logFailure(test, message) {
    const result = { test, status: 'FAIL', message, timestamp: new Date().toISOString() };
    this.results.push(result);
    this.failures.push(result);
    console.log(`❌ ${test}: ${message}`);
  }

  generateReport() {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.failures.length;
    const total = this.results.length;

    console.log('\n📊 Smoke Test Report');
    console.log('===================');
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failures:');
      this.failures.forEach(failure => {
        console.log(`  - ${failure.test}: ${failure.message}`);
      });
    }

    // Write report to file
    require('fs').writeFileSync(
      'smoke-test-report.json',
      JSON.stringify({ passed, failed, total, results: this.results }, null, 2)
    );
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new SmokeTestRunner();
  runner.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = SmokeTestRunner;