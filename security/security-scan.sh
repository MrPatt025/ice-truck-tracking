#!/bin/bash

echo "🔒 Security Audit - Ice Truck Tracking System"
echo "============================================="

# OWASP ZAP Baseline Scan
echo "🕷️ Running OWASP ZAP baseline scan..."
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:5000 \
  -J zap-report.json \
  -r zap-report.html

# Dependency Vulnerability Scan
echo "📦 Scanning dependencies..."
cd backend && npm audit --audit-level moderate
cd ../dashboard && npm audit --audit-level moderate

# Docker Image Security Scan
echo "🐳 Scanning Docker images..."
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image ice-truck-tracking-backend:latest

# SSL/TLS Configuration Check
echo "🔐 Checking SSL/TLS configuration..."
curl -I https://localhost:443 2>/dev/null | grep -i "strict-transport-security"

# API Security Headers Check
echo "🛡️ Checking security headers..."
curl -I http://localhost:5000/api/v1/health | grep -E "(X-Frame-Options|X-Content-Type-Options|X-XSS-Protection)"

# Database Security Check
echo "🗄️ Checking database security..."
echo "✅ SQLite file permissions:"
ls -la backend/database.sqlite

# Environment Variables Check
echo "🔑 Checking environment security..."
if grep -q "JWT_SECRET=your-secret-key" .env 2>/dev/null; then
    echo "❌ Default JWT secret detected - CHANGE IMMEDIATELY"
else
    echo "✅ JWT secret appears to be customized"
fi

echo ""
echo "🔒 Security audit completed!"
echo "Review reports: zap-report.html, npm audit output"