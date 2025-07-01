# 🚚❄️ Ice Truck Tracking System

**Complete end-to-end solution for real-time ice truck monitoring with geofencing, temperature alerts, and multi-channel notifications.**

[![CI/CD Pipeline](https://github.com/your-org/ice-truck-tracking/workflows/Complete%20CI/CD%20Pipeline/badge.svg)](https://github.com/your-org/ice-truck-tracking/actions)
[![Coverage](https://codecov.io/gh/your-org/ice-truck-tracking/branch/main/graph/badge.svg)](https://codecov.io/gh/your-org/ice-truck-tracking)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 One-Command Setup

```bash
git clone https://github.com/your-org/ice-truck-tracking.git
cd ice-truck-tracking
npm run install:all && npm run docker:up
```

**🎉 That's it! Your system is running at:**
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:5000
- **Monitoring**: http://localhost:3001 (admin/admin123)

## ✨ Features

### 🎯 Core Features
- **Real-time Tracking**: Live GPS tracking with WebSocket updates
- **Geofencing**: Custom zones with entry/exit alerts
- **Temperature Monitoring**: Cold chain compliance with alerts
- **Multi-channel Notifications**: Slack, LINE, SMS, Email
- **Responsive Dashboard**: Dark mode, mobile-friendly UI
- **Offline Support**: Edge SDK with local buffering

### 🔧 Technical Features
- **Microservices Architecture**: Scalable, maintainable design
- **Multi-region Deployment**: AWS ECS with auto-scaling
- **Feature Flags**: LaunchDarkly integration
- **Comprehensive Testing**: Unit, Integration, E2E tests
- **Plugin System**: Extensible architecture
- **Internationalization**: English/Thai support
- **PDPA/GDPR Compliance**: Audit logging and data protection

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer (ALB)                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼────┐    ┌──────▼──────┐    ┌─────▼─────┐
│Dashboard│    │   Backend   │    │Notification│
│Next.js  │    │  Node.js    │    │  Service   │
│Port:3000│    │  Port:5000  │    │ Port:3002  │
└─────────┘    └─────────────┘    └───────────┘
                      │
              ┌───────┼───────┐
              │       │       │
         ┌────▼──┐ ┌──▼───┐ ┌▼────┐
         │Postgres│ │Redis │ │Prom │
         │  DB    │ │Cache │ │ +   │
         └────────┘ └──────┘ │Graf │
                             └─────┘
```

## 📦 Components

| Component | Technology | Port | Description |
|-----------|------------|------|-------------|
| **Dashboard** | Next.js 14, TypeScript, Tailwind | 3000 | Real-time monitoring UI |
| **Backend** | Node.js, Express, Socket.io | 5000 | REST API + WebSocket |
| **Notification** | Node.js, Twilio, Handlebars | 3002 | Multi-channel alerts |
| **Edge SDK** | Node.js, SQLite, mTLS | - | Offline-first tracking |
| **Mobile SDK** | TypeScript, React Native | - | Mobile app integration |
| **Database** | PostgreSQL, Redis | 5432/6379 | Data persistence |
| **Monitoring** | Prometheus, Grafana | 9090/3001 | Metrics & dashboards |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Git

### Development Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/ice-truck-tracking.git
cd ice-truck-tracking

# 2. Install all dependencies
npm run install:all

# 3. Start development environment
npm run dev:all

# 4. Run tests
npm run test:all

# 5. Build for production
npm run build:all
```

### Production Deployment

```bash
# 1. Configure environment
cp .env.example .env
# Edit .env with your settings

# 2. Deploy with Docker
npm run deploy:prod

# 3. Or deploy to AWS
npm run infra:apply
```

## 📱 SDK Usage

### Edge SDK (IoT Devices)
```javascript
const { IceTruckEdgeSDK } = require('@ice-truck/edge-sdk');

const sdk = new IceTruckEdgeSDK({
  apiUrl: 'https://api.yourdomain.com',
  clientCert: './certs/client.crt',
  clientKey: './certs/client.key',
  caCert: './certs/ca.crt',
  bufferSize: 1000,
  syncInterval: 30000,
});

// Track truck location with offline support
await sdk.trackTruck({
  truckId: 'TRUCK001',
  latitude: 13.7563,
  longitude: 100.5018,
  temperature: -2.5,
  speed: 45,
  timestamp: new Date().toISOString(),
});
```

### Mobile SDK (React Native)
```javascript
import { init } from '@ice-truck/mobile-sdk';

const sdk = init({
  apiUrl: 'https://api.yourdomain.com',
  apiKey: 'your-api-key',
  enableOfflineMode: true,
});

// Simple location tracking
await sdk.trackLocation({
  truckId: 'TRUCK001',
  latitude: 13.7563,
  longitude: 100.5018,
  timestamp: new Date().toISOString(),
});
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key
DB_URL=postgresql://user:pass@host:5432/icetruckdb
REDIS_URL=redis://redis:6379
```

**Dashboard (.env.local)**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token
```

### Feature Flags

```javascript
// Use feature flags in components
import { useFeatureFlag } from '@/components/FeatureFlags';

function MyComponent() {
  const isNewFeatureEnabled = useFeatureFlag('new-geofence-ui');
  
  return (
    <div>
      {isNewFeatureEnabled ? <NewUI /> : <OldUI />}
    </div>
  );
}
```

## 🧪 Testing

```bash
# Unit tests
npm run test:all

# E2E tests
npm run test:e2e

# Load testing
npm run load:test

# Security scan
npm run security:scan
```

## 📊 Monitoring

### Health Checks
```bash
# Check all services
npm run health:check

# Individual service health
curl http://localhost:5000/api/v1/health
curl http://localhost:3000/api/health
curl http://localhost:3002/health
```

### Metrics & Dashboards
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Application Logs**: `docker-compose logs -f`

## 🔌 Plugin Development

```javascript
// Create custom plugin
const { IceTruckPlugin } = require('./plugins/sample-integration');

const plugin = new IceTruckPlugin({
  name: 'my-custom-plugin',
  version: '1.0.0',
  apiKey: 'plugin-api-key',
});

// Register plugin hooks
plugin.onTruckLocationUpdate(async (data) => {
  // Custom logic for location updates
  if (data.speed > 80) {
    await plugin.createSpeedAlert(data);
  }
});

await plugin.register();
```

## 🌍 Internationalization

```javascript
// Add new language
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <h1>{t('dashboard.title')}</h1>
  );
}
```

## 🚀 Deployment Options

### Docker Compose (Recommended for development)
```bash
docker-compose up -d
```

### AWS ECS (Production)
```bash
cd infra/terraform
terraform apply
```

### Kubernetes
```bash
kubectl apply -f infra/k8s/
```

## 📈 Performance

- **Response Time**: < 200ms API responses
- **Throughput**: 10,000+ requests/minute
- **Scalability**: Auto-scaling from 2-10 instances
- **Uptime**: 99.9% availability target
- **Real-time**: < 1s WebSocket latency

## 🔒 Security

- ✅ mTLS authentication for edge devices
- ✅ JWT tokens for API access
- ✅ Rate limiting and DDoS protection
- ✅ HTTPS/WSS encryption
- ✅ PDPA/GDPR compliance
- ✅ Audit logging
- ✅ Security headers (CORS, CSP, etc.)

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Architecture Guide](./docs/architecture.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Contributing Guide](./docs/CONTRIBUTING.md)
- [Plugin Development](./plugins/README.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/ice-truck-tracking/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/ice-truck-tracking/discussions)
- **Email**: support@icetrucktracking.com
- **Slack**: [Join our Slack](https://slack.icetrucktracking.com)

## 🎯 Roadmap

- [ ] **Q1 2025**: Mobile app (iOS/Android)
- [ ] **Q2 2025**: AI-powered route optimization
- [ ] **Q3 2025**: Blockchain integration for supply chain
- [ ] **Q4 2025**: IoT sensor integration (humidity, door status)

---

**Made with ❤️ by the Ice Truck Tracking Team**

[![Deploy to AWS](https://img.shields.io/badge/Deploy%20to-AWS-orange?logo=amazon-aws)](./docs/DEPLOYMENT.md#aws-ecs-deployment)
[![Run on Docker](https://img.shields.io/badge/Run%20on-Docker-blue?logo=docker)](./docs/DEPLOYMENT.md#local-development)
[![API Docs](https://img.shields.io/badge/API-Documentation-green?logo=swagger)](http://localhost:5000/api-docs)