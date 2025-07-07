# Ice Truck Tracking System 🚚❄️

**Professional Enterprise-Grade Monorepo for Real-Time Ice Truck Tracking**

[![CI/CD Pipeline](https://github.com/ice-truck-tracking/ice-truck-tracking/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/ice-truck-tracking/ice-truck-tracking/actions)
[![Security Audit](https://img.shields.io/badge/security-audit-passing-brightgreen)](https://github.com/ice-truck-tracking/ice-truck-tracking/security)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 One-Command Setup

```bash
# Clone the repository
git clone https://github.com/ice-truck-tracking/ice-truck-tracking.git
cd ice-truck-tracking

# Install dependencies (hoisted to root)
npm install

# Build all packages
npm run build

# Deploy to staging
npm run deploy
```

## 📁 Monorepo Structure

```
ice-truck-tracking/
├── backend/           # Node.js/Express API server
├── dashboard/         # Next.js web dashboard
├── mobile-app/        # React Native Expo mobile app
├── sdk/              # Shared SDKs and services
│   ├── shared/       # Common utilities and types
│   ├── types/        # TypeScript type definitions
│   ├── notification/ # Notification service
│   └── route-optimizer/ # Route optimization service
├── infra/            # Infrastructure and deployment
│   ├── docker-base/  # Shared Docker templates
│   ├── k8s/          # Kubernetes manifests
│   └── terraform/    # Infrastructure as Code
├── docs/             # Documentation
└── scripts/          # Build and deployment scripts
```

## 🛠️ Available Scripts

### Development
```bash
npm run dev          # Start all services in development mode
npm run build        # Build all packages
npm run test         # Run all tests
npm run lint         # Lint all code
npm run lint:fix     # Fix linting issues
npm run type-check   # Type check all TypeScript code
```

### Quality Assurance
```bash
npm run security:audit      # Run comprehensive security audit
npm run test:comprehensive  # Run full test suite
npm run load:test          # Run performance and load tests
```

### Deployment
```bash
npm run docker:build       # Build all Docker images
npm run docker:up          # Start all services with Docker Compose
npm run docker:down        # Stop all services
npm run deploy             # Deploy to production
```

## 🏗️ Architecture

### Backend Services
- **API Server**: Express.js with TypeScript, JWT authentication, rate limiting
- **WebSocket Service**: Real-time tracking updates
- **Notification Service**: Push notifications and alerts
- **Route Optimizer**: Genetic algorithm for route optimization

### Frontend Applications
- **Dashboard**: Next.js with TypeScript, real-time maps, analytics
- **Mobile App**: React Native with Expo, offline support, push notifications

### Infrastructure
- **Containerization**: Multi-stage Docker builds with shared base images
- **Orchestration**: Kubernetes with Helm charts
- **CI/CD**: GitHub Actions with parallel builds and caching
- **Monitoring**: Prometheus, Grafana, and custom dashboards

## 🔧 Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis for session and real-time data
- **Message Queue**: RabbitMQ for async processing

### Frontend
- **Web**: Next.js 14, React 19, TypeScript
- **Mobile**: React Native 0.79, Expo SDK 53
- **Styling**: Tailwind CSS, styled-components
- **State Management**: Zustand, React Query

### DevOps
- **Build Tool**: Turborepo for monorepo management
- **Package Manager**: npm 9+ with workspaces
- **Containerization**: Docker with multi-stage builds
- **CI/CD**: GitHub Actions with parallel execution
- **Infrastructure**: Terraform, Kubernetes

## 📊 Performance & Quality

- **Build Time**: < 2 minutes for full monorepo
- **Test Coverage**: > 90% across all packages
- **Bundle Size**: Optimized with tree-shaking and code splitting
- **Security**: Automated vulnerability scanning and audit
- **Performance**: Lighthouse score > 95 for web dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Docker Desktop
- Git

### Development Setup
1. **Clone and Install**
   ```bash
   git clone https://github.com/ice-truck-tracking/ice-truck-tracking.git
   cd ice-truck-tracking
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Access Applications**
   - Dashboard: http://localhost:3000
   - API: http://localhost:3001
   - Mobile App: Scan QR code with Expo Go

### Production Deployment
```bash
# Build and deploy all services
npm run build
npm run docker:build
npm run docker:up

# Or use the one-command deployment
npm run deploy
```

## 📚 Documentation

- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Contributing Guidelines](./docs/CONTRIBUTING.md)
- [Architecture Overview](./docs/MONOREPO.md)
- [Development Roadmap](./docs/ROADMAP.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./docs/CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and run tests: `npm run test`
4. Commit with conventional commits: `git commit -m "feat: add amazing feature"`
5. Push to your fork: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/ice-truck-tracking/ice-truck-tracking/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ice-truck-tracking/ice-truck-tracking/discussions)
- **Documentation**: [Project Wiki](https://github.com/ice-truck-tracking/ice-truck-tracking/wiki)

---

**Built with ❤️ by the Ice Truck Tracking Team**
