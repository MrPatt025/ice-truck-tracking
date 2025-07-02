#!/bin/bash

echo "🚚❄️ Ice Truck Tracking System - Quick Start"
echo "=========================================="

echo "🐳 Starting Docker containers..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 15

echo "🏥 Checking system health..."
curl -s http://localhost:5000/api/v1/health | jq .

echo ""
echo "✅ System started successfully!"
echo ""
echo "📊 Access URLs:"
echo "  Dashboard: http://localhost:3000"
echo "  API: http://localhost:5000"
echo "  Monitoring: http://localhost:3001 (admin/admin123)"
echo "  Mobile Test: mobile-test-app/web-test.html"
echo ""
echo "🧪 Run tests:"
echo "  cd staging-tests"
echo "  npm install"
echo "  npm test"
echo ""