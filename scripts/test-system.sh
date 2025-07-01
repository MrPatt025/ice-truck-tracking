#!/bin/bash

echo "🚚❄️ Ice Truck Tracking - System Test"
echo "===================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ PASS${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
        return 1
    fi
}

# Test JSON endpoint
test_json_endpoint() {
    local name=$1
    local url=$2
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | jq . >/dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS${NC}"
        echo "  Response: $(echo "$response" | jq -c . | head -c 100)..."
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Response: $response"
        return 1
    fi
}

echo ""
echo "🔍 Testing Core Services..."
echo "-------------------------"

# Backend API
test_json_endpoint "Backend Health" "http://localhost:5000/api/v1/health"

# Dashboard
test_endpoint "Dashboard" "http://localhost:3000"

# Monitoring
test_endpoint "Prometheus" "http://localhost:9090/-/healthy"
test_endpoint "Grafana" "http://localhost:3001/api/health"

# Infrastructure
test_endpoint "Redis" "http://localhost:6379" || echo "  Note: Redis doesn't have HTTP endpoint"
test_endpoint "Node Exporter" "http://localhost:9100/metrics"

echo ""
echo "🧪 Testing API Endpoints..."
echo "-------------------------"

# API Tests
test_json_endpoint "Health Check" "http://localhost:5000/api/v1/health"

echo ""
echo "📊 System Status Summary"
echo "======================="

# Container status
echo "Docker Containers:"
docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker Compose not available"

echo ""
echo "🎯 Access URLs:"
echo "Dashboard: http://localhost:3000"
echo "API: http://localhost:5000"
echo "Monitoring: http://localhost:3001 (admin/admin123)"
echo "Prometheus: http://localhost:9090"

echo ""
echo "🚚❄️ System test completed!"