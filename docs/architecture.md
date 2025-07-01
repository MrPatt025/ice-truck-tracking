# 🏗️ System Architecture

## Overview

The Ice Truck Tracking System follows a clean, layered architecture with clear separation of concerns, designed for scalability, maintainability, and testability.

## 🎯 Architecture Principles

- **Clean Architecture**: Separation of business logic from infrastructure
- **SOLID Principles**: Single responsibility, open/closed, dependency inversion
- **RESTful API Design**: Consistent, predictable endpoints
- **Security First**: Authentication, authorization, input validation
- **Observability**: Logging, monitoring, health checks

## 🏛️ System Layers

```
┌─────────────────────────────────────────┐
│              Presentation               │
│         (HTTP/REST API)                 │
├─────────────────────────────────────────┤
│              Controllers                │
│         (Request/Response)              │
├─────────────────────────────────────────┤
│               Services                  │
│          (Business Logic)               │
├─────────────────────────────────────────┤
│             Repositories                │
│           (Data Access)                 │
├─────────────────────────────────────────┤
│              Database                   │
│            (SQLite)                     │
└─────────────────────────────────────────┘
```

## 📁 Directory Structure

```
src/
├─ controllers/     # HTTP request handlers
│  ├─ authController.js
│  └─ healthController.js
├─ routes/          # API route definitions
│  └─ v1/
│     ├─ authRoutes.js
│     └─ healthRoutes.js
├─ services/        # Business logic layer
│  └─ trackingService.js
├─ repositories/    # Data access layer
├─ middleware/      # Express middleware
│  ├─ auth.js
│  ├─ errorHandler.js
│  ├─ rateLimiter.js
│  └─ validation.js
├─ config/          # Configuration
│  ├─ database.js
│  ├─ env.js
│  └─ logger.js
└─ index.js         # Application entry point
```

## 🔄 Request Flow

```
Client Request
     ↓
Rate Limiter
     ↓
CORS & Security Headers
     ↓
Request Validation
     ↓
Authentication/Authorization
     ↓
Route Handler
     ↓
Controller
     ↓
Service (Business Logic)
     ↓
Repository (Data Access)
     ↓
Database
     ↓
Response
```

## 🛡️ Security Architecture

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **Role-based Access**: Admin, Driver, Owner roles
- **Token Expiration**: 1-hour expiry for security

### Security Middleware
- **Helmet**: Security headers (CSP, HSTS, etc.)
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Brute-force protection
- **Input Validation**: Joi schema validation

### Data Protection
- **Password Hashing**: bcrypt with salt rounds
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization

## 📊 Data Architecture

### Database Schema
```sql
Users
├─ id (PK)
├─ username (UNIQUE)
├─ password (HASHED)
└─ role

Drivers
├─ id (PK)
├─ driver_code (UNIQUE)
├─ full_name
├─ national_id
├─ license_number
└─ username (FK)

Trucks
├─ id (PK)
├─ truck_code (UNIQUE)
├─ plate_number
├─ model
└─ gps_code

Tracking
├─ id (PK)
├─ latitude
├─ longitude
├─ truck_id (FK)
├─ driver_id (FK)
└─ timestamp

Alerts
├─ id (PK)
├─ truck_id (FK)
├─ driver_id (FK)
├─ message
├─ alert_type
└─ alert_time
```

## 🔧 Configuration Management

### Environment-based Config
```javascript
// config/env.js
module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  DB_URL: process.env.DB_URL || './database.sqlite'
};
```

### Feature Flags
- Development vs Production behavior
- Logging levels
- Rate limiting thresholds

## 📈 Scalability Considerations

### Horizontal Scaling
- Stateless application design
- Database connection pooling
- Load balancer ready

### Performance Optimization
- Response compression
- Database indexing
- Query optimization
- Caching strategies

### Monitoring & Observability
- Structured logging (JSON)
- Health check endpoints
- Performance metrics
- Error tracking

## 🧪 Testing Architecture

### Test Pyramid
```
    /\
   /  \    E2E Tests (Few)
  /____\
 /      \   Integration Tests (Some)
/__________\ Unit Tests (Many)
```

### Test Structure
- **Unit Tests**: Individual functions/methods
- **Integration Tests**: API endpoints
- **Contract Tests**: API specifications
- **Load Tests**: Performance validation

## 🚀 Deployment Architecture

### Containerization
```dockerfile
# Multi-stage build
FROM node:18-alpine AS base
# ... build stages
FROM node:18-alpine AS production
# ... production setup
```

### Orchestration
- Docker Compose for development
- Kubernetes for production
- Health checks for container orchestration

### CI/CD Pipeline
```
Code Push → Lint → Test → Build → Deploy
```

## 🔍 Monitoring & Logging

### Structured Logging
```javascript
logger.info({
  method: 'POST',
  url: '/api/v1/auth/login',
  userId: 123,
  duration: 45
}, 'User login successful');
```

### Health Checks
- **Liveness**: `/api/v1/health/livez`
- **Readiness**: `/api/v1/health/readyz`
- **Health**: `/api/v1/health`

### Metrics Collection
- Request/response times
- Error rates
- Database connection status
- Memory/CPU usage

## 🔮 Future Enhancements

### Microservices Migration
- Service decomposition
- API Gateway
- Service mesh

### Advanced Features
- Real-time notifications (WebSocket)
- Geofencing alerts
- Advanced analytics
- Mobile app integration

### Infrastructure
- Redis caching
- Message queues
- Event sourcing
- CQRS pattern

---

This architecture provides a solid foundation for the Ice Truck Tracking System while maintaining flexibility for future growth and enhancements.