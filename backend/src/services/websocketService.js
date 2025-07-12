const { Server } = require('socket.io');
const logger = require('../config/logger');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Set();
    this.simulationInterval = null;
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', socket => {
      logger.info(`Client connected: ${socket.id}`);
      this.connectedClients.add(socket.id);

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
      });
    });

    logger.info('WebSocket service initialized');
  }

  startSimulation() {
    // Simulate truck data every 5 seconds
    this.simulationInterval = setInterval(() => {
      const mockTruckData = {
        id: 'truck-001',
        latitude: 13.7563 + (Math.random() - 0.5) * 0.01,
        longitude: 100.5018 + (Math.random() - 0.5) * 0.01,
        temperature: -18 + Math.random() * 2,
        status: 'active',
        timestamp: new Date().toISOString(),
      };

      this.broadcast('truck-update', mockTruckData);
    }, 5000);

    logger.info('Truck simulation started');
  }

  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  getConnectedClientsCount() {
    return this.connectedClients.size;
  }

  stop() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }
    if (this.io) {
      this.io.close();
    }
  }
}

module.exports = new WebSocketService();
