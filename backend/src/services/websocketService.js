const { Server } = require('socket.io');
const logger = require('../config/logger');
const { updateTruckMetrics } = require('../middleware/metrics');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map();
    this.truckData = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    logger.info('WebSocket service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, {
        connectedAt: new Date(),
        lastActivity: new Date()
      });

      // Send initial data to new client
      this.sendInitialData(socket);

      socket.on('subscribe_truck', (truckId) => {
        socket.join(`truck_${truckId}`);
        logger.info(`Client ${socket.id} subscribed to truck ${truckId}`);
      });

      socket.on('unsubscribe_truck', (truckId) => {
        socket.leave(`truck_${truckId}`);
        logger.info(`Client ${socket.id} unsubscribed from truck ${truckId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });

      socket.on('ping', () => {
        socket.emit('pong');
        if (this.connectedClients.has(socket.id)) {
          this.connectedClients.get(socket.id).lastActivity = new Date();
        }
      });
    });
  }

  async sendInitialData(socket) {
    try {
      // Send current truck data
      const trucks = Array.from(this.truckData.values());
      socket.emit('trucks_data', trucks);

      // Send recent alerts (would fetch from database)
      socket.emit('alerts_data', []);
      
    } catch (error) {
      logger.error('Failed to send initial data:', error);
    }
  }

  broadcastTruckUpdate(truckData) {
    if (!this.io) return;

    // Update internal truck data
    this.truckData.set(truckData.id, {
      ...truckData,
      last_update: new Date().toISOString()
    });

    // Broadcast to all clients
    this.io.emit('truck_update', truckData);

    // Broadcast to specific truck subscribers
    this.io.to(`truck_${truckData.id}`).emit('truck_specific_update', truckData);

    // Update metrics
    const activeTrucks = Array.from(this.truckData.values())
      .filter(truck => truck.status === 'active').length;
    updateTruckMetrics(activeTrucks);

    logger.info(`Broadcasted truck update for ${truckData.id}`);
  }

  broadcastAlert(alertData) {
    if (!this.io) return;

    this.io.emit('new_alert', {
      ...alertData,
      timestamp: new Date().toISOString()
    });

    // Send to specific truck subscribers
    if (alertData.truck_id) {
      this.io.to(`truck_${alertData.truck_id}`).emit('truck_alert', alertData);
    }

    logger.info(`Broadcasted alert: ${alertData.type}`);
  }

  broadcastSystemStatus(status) {
    if (!this.io) return;

    this.io.emit('system_status', {
      ...status,
      timestamp: new Date().toISOString(),
      connected_clients: this.connectedClients.size
    });
  }

  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  getTruckData(truckId) {
    return this.truckData.get(truckId);
  }

  getAllTruckData() {
    return Array.from(this.truckData.values());
  }

  // Simulate real-time data for demo
  startSimulation() {
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        this.simulateTruckMovement();
      }, 5000); // Update every 5 seconds

      logger.info('Started truck movement simulation');
    }
  }

  simulateTruckMovement() {
    const sampleTrucks = [
      { id: '1', plate_number: 'กข-1234', driver_name: 'สมชาย ใจดี' },
      { id: '2', plate_number: 'กข-5678', driver_name: 'สมหญิง รักงาน' },
      { id: '3', plate_number: 'กข-9012', driver_name: 'วิชัย ขยัน' }
    ];

    sampleTrucks.forEach(truck => {
      // Bangkok area coordinates with small random movement
      const baseLat = 13.7563 + (Math.random() - 0.5) * 0.1;
      const baseLon = 100.5018 + (Math.random() - 0.5) * 0.1;

      const truckData = {
        ...truck,
        latitude: baseLat,
        longitude: baseLon,
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        speed: Math.random() * 60,
        temperature: -5 + Math.random() * 3, // -5 to -2°C
        fuel_level: 20 + Math.random() * 80
      };

      this.broadcastTruckUpdate(truckData);
    });

    // Occasionally send alerts
    if (Math.random() < 0.1) {
      const randomTruck = sampleTrucks[Math.floor(Math.random() * sampleTrucks.length)];
      this.broadcastAlert({
        truck_id: randomTruck.id,
        type: 'info',
        message: `${randomTruck.plate_number} completed delivery`,
        severity: 'low'
      });
    }
  }
}

module.exports = new WebSocketService();