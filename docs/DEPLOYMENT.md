# Ice Truck Tracking - Complete Deployment Guide

## 🚀 One-Command Deployment

```bash
# Clone and deploy everything
git clone <repository-url>
cd ice-truck-tracking
chmod +x scripts/deploy-all.sh
./scripts/deploy-all.sh
```

## 📋 Prerequisites

- Docker & Docker Compose
- Node.js 18+
- AWS CLI configured
- Terraform 1.6+
- kubectl (for Kubernetes)

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Dashboard     │    │    Backend      │    │  Notification   │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│    Service      │
│   Port: 3000    │    │   Port: 5000    │    │   Port: 3002    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Load Balancer │
                    │   (Nginx/ALB)   │
                    │   Port: 80/443  │
                    └─────────────────┘
```

## 🔧 Environment Setup

### 1. Local Development

```bash
# Start all services
docker-compose up -d

# Install dependencies
npm run install:all

# Start development servers
npm run dev:all
```

### 2. Production Deployment

#### AWS ECS Deployment

```bash
# Set environment variables
export AWS_REGION=us-west-2
export DOCKER_USERNAME=your-docker-username
export DOCKER_PASSWORD=your-docker-password

# Deploy infrastructure
cd infra/terraform
terraform init
terraform plan -var="docker_image_backend=$DOCKER_USERNAME/ice-truck-backend:latest"
terraform apply -auto-approve

# Deploy applications
docker-compose -f docker-compose.prod.yml up -d
```

#### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f infra/k8s/

# Check deployment status
kubectl get pods -n ice-truck
kubectl get services -n ice-truck
```

## 🔐 Security Configuration

### SSL/TLS Setup

```bash
# Generate certificates
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/ice-truck.key \
  -out nginx/ssl/ice-truck.crt

# Update nginx configuration
cp nginx/nginx.prod.conf nginx/nginx.conf
```

### Environment Variables

Create `.env` files for each service:

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

**Notification Service (.env)**

```env
PORT=3002
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
SLACK_WEBHOOK=your-slack-webhook
LINE_TOKEN=your-line-token
```

## 📊 Monitoring & Observability

### Prometheus & Grafana

```bash
# Access monitoring dashboards
echo "Prometheus: http://localhost:9090"
echo "Grafana: http://localhost:3001 (admin/admin123)"
```

### Health Checks

```bash
# Backend health
curl http://localhost:5000/api/v1/health

# Dashboard health
curl http://localhost:3000/api/health

# Notification service health
curl http://localhost:3002/health
```

## 🔄 CI/CD Pipeline

### GitHub Actions Setup

1. Add repository secrets:
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `SLACK_WEBHOOK`
   - `LINE_TOKEN`

2. Pipeline stages:
   - **Lint & Format**: ESLint, Prettier
   - **Test**: Unit, Integration, E2E
   - **Build**: Docker images
   - **Deploy**: Terraform + ECS
   - **Health Check**: Post-deployment validation
   - **Notify**: Slack/LINE notifications

### Manual Deployment Commands

```bash
# Build and push Docker images
docker build -t $DOCKER_USERNAME/ice-truck-backend:latest ./backend
docker build -t $DOCKER_USERNAME/ice-truck-dashboard:latest ./dashboard
docker push $DOCKER_USERNAME/ice-truck-backend:latest
docker push $DOCKER_USERNAME/ice-truck-dashboard:latest

# Deploy to ECS
aws ecs update-service --cluster ice-truck-cluster --service ice-truck-backend --force-new-deployment
aws ecs update-service --cluster ice-truck-cluster --service ice-truck-dashboard --force-new-deployment
```

## 🧪 Testing

### Unit Tests

```bash
# Backend tests
cd backend && npm test

# Dashboard tests
cd dashboard && npm test

# Coverage reports
npm run test:coverage
```

### E2E Tests

```bash
# Start services
docker-compose up -d

# Run Cypress tests
cd dashboard && npm run cypress:run
```

### Load Testing

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Ubuntu

# Run load tests
k6 run tests/load/api-load-test.js
```

## 📱 SDK Usage

### Edge SDK (Node.js)

```javascript
const { IceTruckEdgeSDK } = require('@ice-truck/edge-sdk')

const sdk = new IceTruckEdgeSDK({
  apiUrl: 'https://api.yourdomain.com',
  clientCert: './certs/client.crt',
  clientKey: './certs/client.key',
  caCert: './certs/ca.crt',
  bufferSize: 1000,
  syncInterval: 30000,
  retryAttempts: 3,
})

await sdk.trackTruck({
  truckId: 'TRUCK001',
  latitude: 13.7563,
  longitude: 100.5018,
  temperature: -2.5,
  speed: 45,
  timestamp: new Date().toISOString(),
})
```

### Mobile SDK (React Native)

```javascript
import { init } from '@ice-truck/mobile-sdk'

const sdk = init({
  apiUrl: 'https://api.yourdomain.com',
  apiKey: 'your-api-key',
  cacheSize: 500,
  syncInterval: 60000,
  enableOfflineMode: true,
})

await sdk.trackLocation({
  truckId: 'TRUCK001',
  latitude: 13.7563,
  longitude: 100.5018,
  timestamp: new Date().toISOString(),
})
```

## 🔧 Troubleshooting

### Common Issues

1. **Docker build fails**

   ```bash
   # Clear Docker cache
   docker system prune -a
   docker-compose build --no-cache
   ```

2. **Database connection issues**

   ```bash
   # Check database logs
   docker-compose logs postgres

   # Reset database
   docker-compose down -v
   docker-compose up -d postgres
   ```

3. **SSL certificate issues**
   ```bash
   # Regenerate certificates
   rm nginx/ssl/*
   ./scripts/generate-certs.sh
   ```

### Performance Optimization

1. **Enable Redis caching**

   ```bash
   # Check Redis connection
   docker-compose exec redis redis-cli ping
   ```

2. **Database optimization**

   ```sql
   -- Add indexes for better performance
   CREATE INDEX idx_truck_locations_timestamp ON truck_locations(timestamp);
   CREATE INDEX idx_alerts_created_at ON alerts(created_at);
   ```

3. **CDN setup**
   ```bash
   # Configure CloudFront for static assets
   aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
   ```

## 📈 Scaling

### Horizontal Scaling

```bash
# Scale ECS services
aws ecs update-service --cluster ice-truck-cluster --service ice-truck-backend --desired-count 5

# Scale Kubernetes deployments
kubectl scale deployment backend --replicas=5 -n ice-truck
```

### Database Scaling

```bash
# Enable read replicas
aws rds create-db-instance-read-replica \
  --db-instance-identifier ice-truck-read-replica \
  --source-db-instance-identifier ice-truck-primary
```

## 🔒 Security Checklist

- [ ] SSL/TLS certificates configured
- [ ] Environment variables secured
- [ ] Database credentials rotated
- [ ] API rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers implemented
- [ ] Audit logging enabled
- [ ] Backup strategy implemented

## 📞 Support

- **Documentation**: `/docs/`
- **API Reference**: `http://localhost:5000/api-docs`
- **Monitoring**: `http://localhost:3001`
- **Logs**: `docker-compose logs -f [service]`

## 🎯 Quick Commands Reference

```bash
# Development
npm run dev:all              # Start all services in dev mode
npm run test:all             # Run all tests
npm run lint:all             # Lint all code
npm run build:all            # Build all services

# Production
docker-compose up -d         # Start production services
./scripts/deploy.sh          # Full deployment
./scripts/backup.sh          # Backup data
./scripts/restore.sh         # Restore from backup

# Monitoring
docker-compose logs -f       # View all logs
kubectl get pods -A          # Check Kubernetes status
terraform plan               # Preview infrastructure changes
```

---

**🚚❄️ Ice Truck Tracking System - Ready for Production!**
