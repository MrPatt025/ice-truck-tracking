#!/bin/bash

echo "🏥 Ice Truck System Health Check"
echo "================================"

# Backend health
echo -n "Backend API: "
if curl -f -s http://localhost:5000/api/v1/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Dashboard health
echo -n "Dashboard: "
if curl -f -s http://localhost:3000 > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Notification service health
echo -n "Notification Service: "
if curl -f -s http://localhost:3002/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Redis health
echo -n "Redis: "
if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Prometheus health
echo -n "Prometheus: "
if curl -f -s http://localhost:9090/-/healthy > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

# Grafana health
echo -n "Grafana: "
if curl -f -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ Healthy"
else
    echo "❌ Unhealthy"
fi

echo ""
echo "Health check completed!"