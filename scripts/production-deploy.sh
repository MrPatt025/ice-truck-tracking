#!/bin/bash

echo "🚚❄️ Ice Truck Tracking - Production Deployment"
echo "=============================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "⚠️  Warning: Running as root. Consider using a non-root user."
fi

# Environment check
echo "📋 Environment Check..."
echo "----------------------"

# Check required tools
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required"; exit 1; }

echo "✅ Docker: $(docker --version)"
echo "✅ Docker Compose: $(docker-compose --version)"

# Check environment file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your configuration"
    echo "   Required: MAPBOX_TOKEN, notification credentials"
fi

# Production optimizations
echo ""
echo "🔧 Production Setup..."
echo "--------------------"

# Create production docker-compose override
cat > docker-compose.prod.yml << EOF
version: '3.8'
services:
  backend:
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M

  dashboard:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  notification:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M

  redis:
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru

  prometheus:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  grafana:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M
EOF

# Deploy
echo "🚀 Deploying services..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Wait for services
echo "⏳ Waiting for services to start..."
sleep 30

# Health checks
echo "🏥 Running health checks..."
./scripts/test-system.sh

# Setup monitoring alerts
echo "📊 Setting up monitoring..."
echo "Grafana: http://localhost:3001 (admin/admin123)"
echo "Prometheus: http://localhost:9090"

# Security recommendations
echo ""
echo "🔒 Security Recommendations:"
echo "- Change default Grafana password"
echo "- Setup SSL certificates"
echo "- Configure firewall rules"
echo "- Enable log rotation"
echo "- Setup backup strategy"

echo ""
echo "🎉 Production deployment completed!"
echo "Dashboard: http://localhost:3000"
echo "API: http://localhost:5000"