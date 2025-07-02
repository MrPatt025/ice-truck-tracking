# 🚨 Incident Response Runbooks

## Service Down

### Symptoms
- Health check returns 5xx
- Dashboard not loading
- API timeouts

### Actions
```bash
# 1. Check container status
docker-compose ps

# 2. Restart service
docker-compose restart backend

# 3. Check logs
docker-compose logs backend --tail 50

# 4. Verify health
curl http://localhost:5000/api/v1/health
```

## Database Issues

### Symptoms
- Connection timeouts
- Data inconsistency
- Slow queries

### Actions
```bash
# 1. Check DB connection
docker-compose exec backend node -e "console.log('DB test')"

# 2. Backup current state
cp backend/database.sqlite backend/database.backup.$(date +%s).sqlite

# 3. Restart with fresh DB if needed
docker-compose down
docker-compose up -d
```

## High Latency

### Symptoms
- Response times > 1s
- WebSocket disconnections
- User complaints

### Actions
```bash
# 1. Check system resources
docker stats

# 2. Scale services
docker-compose up -d --scale backend=3

# 3. Clear cache
docker-compose exec redis redis-cli FLUSHALL

# 4. Monitor metrics
curl http://localhost:9090/api/v1/query?query=http_request_duration_seconds
```

## Alert Escalation

### P1 (Critical)
- Service completely down
- Data loss detected
- Security breach

**Action**: Page on-call engineer immediately

### P2 (High)
- Performance degradation
- Partial service outage
- Failed deployments

**Action**: Slack notification + email

### P3 (Medium)
- Warning thresholds exceeded
- Non-critical errors

**Action**: Log to monitoring dashboard