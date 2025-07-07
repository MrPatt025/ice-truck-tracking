# 🚀 Deployment Guide

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- AWS CLI (for cloud deployment)
- Terraform 1.6+
- kubectl (for Kubernetes)

---

## 🏗️ Architecture Overview

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ Dashboard    │    │ Backend API  │    │ Notification │
│ (Next.js)    │◄──►│ (Node.js)    │◄──►│ Service      │
│ Port: 3000   │    │ Port: 5000   │    │ Port: 3002   │
└──────────────┘    └──────────────┘    └──────────────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                 ┌──────────┴──────────┐
                 │ Load Balancer/Nginx │
                 │ Port: 80/443        │
                 └─────────────────────┘
```

---

## 🚀 Local Development

```bash
# Start all services (dev)
docker-compose up --build

# Or start individually
cd apps/backend && npm install && npm run dev
cd apps/dashboard && npm install && npm run dev
cd apps/mobile-app && npm install && npx expo start
```

---

## 🌐 Production Deployment

### AWS ECS (Recommended)

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

### Kubernetes

```bash
kubectl apply -f infra/k8s/
```

### Docker Compose (Production)

```bash
docker-compose -f docker-compose.production.yml up -d
```

---

## 🔐 Security Configuration

- **SSL/TLS:** Use Nginx with valid certificates (see `nginx/ssl/`)
- **Environment Variables:** Store secrets in `.env` files (never commit to VCS)
- **Audit:** Run `npm run security:audit` before deployment

---

## 📈 Monitoring & Observability

- **Prometheus:** http://localhost:9090
- **Grafana:** http://localhost:3001 (admin/admin123)
- **Health Checks:** `/api/v1/health` (backend), `/api/health` (dashboard)

---

## 🔄 CI/CD Pipeline

- **GitHub Actions:** Automated lint, test, build, security, deploy
- **Secrets:** Configure repository secrets for AWS, Docker, notifications
- **Stages:** Lint → Test → Build → Security → Deploy → Health Check → Notify

---

## 🧪 Testing

- **Unit/Integration:** `npm run test:all`
- **E2E:** `npm run test:e2e` (Cypress, Detox)
- **Load:** `npm run load:test` (k6)

---

## 🛠️ Troubleshooting

| Issue                        | Solution                                  |
|------------------------------|-------------------------------------------|
| Docker build fails           | `docker system prune -a` and rebuild      |
| Database connection issues   | Check logs, reset DB, check .env          |
| SSL certificate issues       | Regenerate certs in `nginx/ssl/`          |
| Service not starting         | Check `docker-compose logs`               |

---

## 📈 Scaling

- **ECS:** `aws ecs update-service ... --desired-count N`
- **K8s:** `kubectl scale deployment ... --replicas=N`
- **DB:** Use read replicas, add indexes

---

**For full details, see the [root README](../README.md) and [docs/](./)**
