const { Server } = require('socket.io');
const { randomInt } = require('node:crypto');
const logger = require('../config/logger');
const { setWsConnections, recordWsMessage, recordWsError } = require('../middleware/observability');

const rand = () => randomInt(0, 1_000_000) / 1_000_000;

class WebSocketService {
  io = null;

  connectedClients = new Set();

  simulationInterval = null;

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
      setWsConnections(this.connectedClients.size);

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
        this.connectedClients.delete(socket.id);
        setWsConnections(this.connectedClients.size);
      });

      socket.on('error', (err) => {
        logger.error(`WebSocket error on ${socket.id}: ${err.message}`);
        recordWsError('socket');
      });
    });

    logger.info('WebSocket service initialized');
  }

  startSimulation() {
    // Simulate truck data every 5 seconds
    this.simulationInterval = setInterval(() => {
      const mockTruckData = {
        id: 'truck-001',
        latitude: 13.7563 + (rand() - 0.5) * 0.01,
        longitude: 100.5018 + (rand() - 0.5) * 0.01,
        temperature: -18 + rand() * 2,
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
      recordWsMessage('outbound');
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
