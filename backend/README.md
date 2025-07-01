# 🚚❄️ Ice Truck Tracking API

Professional-grade backend API for Ice Truck Tracking System built with Node.js, Express, and SQLite.

## 🚀 Features

- **🔐 Security First**: JWT authentication, rate limiting, helmet security headers
- **📊 Health Monitoring**: Comprehensive health checks (`/healthz`, `/readyz`, `/livez`)
- **📚 API Documentation**: Auto-generated Swagger/OpenAPI docs
- **🧪 Testing**: Unit & integration tests with Jest
- **🐳 Containerized**: Docker & Docker Compose ready
- **📝 Logging**: Structured JSON logging with Pino
- **⚡ Performance**: Compression, rate limiting, optimized middleware
- **🏗️ Clean Architecture**: Layered architecture with separation of concerns

## 🛠️ Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Initialize database
npm run setup

# Start development server
npm run dev
```

### 🐳 Docker Setup

```bash
# Development
docker-compose --profile dev up api-dev

# Production
docker-compose up api
```

## 📋 Available Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests with coverage
npm run test:watch # Run tests in watch mode
npm run lint       # Lint code with ESLint
npm run format     # Format code with Prettier
npm run setup      # Initialize database
```

## 🔗 API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - User registration

### Resources (Protected)
- `GET /api/v1/drivers` - List all drivers
- `GET /api/v1/trucks` - List all trucks
- `GET /api/v1/tracking` - GPS tracking data
- `POST /api/v1/tracking` - Submit GPS location
- `GET /api/v1/alerts` - System alerts
- `GET /api/v1/shops` - Shop locations

### Health Checks
- `GET /api/v1/health` - Basic health status
- `GET /api/v1/health/healthz` - Health check
- `GET /api/v1/health/readyz` - Readiness probe
- `GET /api/v1/health/livez` - Liveness probe

## 📚 API Documentation

Access interactive API documentation at:
- **Development**: http://localhost:5000/api-docs
- **Production**: https://your-domain.com/api-docs

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. Login with credentials to receive a token
2. Include token in Authorization header: `Bearer <token>`
3. Tokens expire in 1 hour

### Default Users
```
Admin:   admin / admin123
Driver:  driver1 / driver123
Owner:   owner / owner123
```

## 🏥 Health Monitoring

### Health Check Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/api/v1/health` | Basic health | Server status |
| `/api/v1/health/readyz` | Readiness probe | DB + memory checks |
| `/api/v1/health/livez` | Liveness probe | Process alive check |

### Monitoring Integration

```bash
# Check if service is ready
curl http://localhost:5000/api/v1/health/readyz

# Check if service is alive
curl http://localhost:5000/api/v1/health/livez
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

### Test Coverage
- Unit tests for controllers and middleware
- Integration tests for API endpoints
- Error handling and edge cases
- Authentication and authorization

## 🔒 Security Features

- **Helmet**: Security headers (CSP, HSTS, X-Frame-Options)
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Brute-force protection (10 req/15min for auth)
- **JWT**: Secure token-based authentication
- **Input Validation**: Joi schema validation
- **Error Handling**: No sensitive data leakage

## 📊 Performance

- **Compression**: Gzip response compression
- **Rate Limiting**: Prevents API abuse
- **Structured Logging**: JSON logs with correlation IDs
- **Health Checks**: Kubernetes-ready probes

## 🐳 Docker Deployment

### Multi-stage Build
```dockerfile
# Development
docker build --target development -t ice-truck-api:dev .

# Production
docker build --target production -t ice-truck-api:prod .
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `5000` |
| `JWT_SECRET` | JWT signing key | Required |
| `SALT_ROUNDS` | bcrypt salt rounds | `12` |
| `CLIENT_URL` | CORS origins | Required |
| `DB_URL` | Database path | `./database.sqlite` |

## 🚀 Production Deployment

### Docker Compose
```bash
# Production deployment
docker-compose up -d api

# Check logs
docker-compose logs -f api

# Scale service
docker-compose up -d --scale api=3
```

### Kubernetes
```yaml
# Health checks configured
livenessProbe:
  httpGet:
    path: /api/v1/health/livez
    port: 5000
readinessProbe:
  httpGet:
    path: /api/v1/health/readyz
    port: 5000
```

## 📈 Monitoring & Observability

### Structured Logging
```javascript
// Logs include correlation IDs and structured data
logger.info({
  method: 'POST',
  url: '/api/v1/auth/login',
  userId: 123,
  duration: 45
}, 'User login successful');
```

### Metrics & Tracing
- Ready for OpenTelemetry integration
- Correlation ID tracking
- Performance monitoring hooks

## 🔧 Development

### Code Quality
- ESLint with security rules
- Prettier code formatting
- Husky pre-commit hooks
- Jest testing framework

### Architecture
```
backend/
├── config/          # Configuration files
├── controllers/     # HTTP request handlers
├── middleware/      # Express middleware
├── routes/          # API route definitions
├── services/        # Business logic
├── tests/           # Test files
├── utils/           # Utility functions
└── docs/            # Documentation
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Commit Convention
Follow [Conventional Commits](https://conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@icetrucktracking.com
- 📚 Documentation: `/api-docs`
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions

---

**Built with ❤️ for efficient ice truck tracking operations**