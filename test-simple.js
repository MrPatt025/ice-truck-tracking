const express = require('express');
const cors = require('cors');
const http = require('http');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Simple health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: '🚚❄️ Ice Truck Tracking API - Simple Test'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚚❄️ Ice Truck Tracking Platform',
    status: 'running',
    services: {
      backend: 'http://localhost:5000',
      dashboard: 'http://localhost:3000',
      prometheus: 'http://localhost:9090',
      grafana: 'http://localhost:3001'
    }
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`🚀 Simple test server running on port ${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/v1/health`);
  console.log(`🌐 Root: http://localhost:${PORT}`);
});