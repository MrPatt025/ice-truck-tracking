#!/bin/bash

echo "🚚❄️ Ice Truck Tracking - Complete Deployment"
echo "=============================================="

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose is required but not installed."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }

echo "✅ Prerequisites check passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm run install:all

# Build all services
echo "🔨 Building all services..."
npm run build:all

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Health checks
echo "🏥 Running health checks..."
curl -f http://localhost:5000/api/v1/health || echo "⚠️ Backend health check failed"
curl -f http://localhost:3000 || echo "⚠️ Dashboard health check failed"
curl -f http://localhost:3002/health || echo "⚠️ Notification service health check failed"

echo ""
echo "🎉 Deployment completed!"
echo "========================"
echo "📊 Dashboard: http://localhost:3000"
echo "🔧 API: http://localhost:5000"
echo "📈 Monitoring: http://localhost:3001 (admin/admin123)"
echo "🔔 Notifications: http://localhost:3002"
echo ""
echo "🚚❄️ Ice Truck Tracking System is ready!"