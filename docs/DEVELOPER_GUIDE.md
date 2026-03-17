<!-- markdownlint-disable MD041 -->

# Developer Guide

## Welcome to Ice Truck Tracking! 🚚❄️

This guide covers development workflows, architectural patterns, and best practices for contributing to the Ice Truck Tracking platform.

**Audience:** Backend developers, frontend engineers, DevOps engineers  
**Scope:** Local development, branching strategy, code patterns, debugging  
**Last Updated:** March 17, 2026

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Git & Branching Workflow](#git--branching-workflow)
4. [Code Patterns & Best Practices](#code-patterns--best-practices)
5. [Testing](#testing)
6. [Debugging & Troubleshooting](#debugging--troubleshooting)
7. [Performance Tips](#performance-tips)
8. [Security Checklist](#security-checklist)

---

## Getting Started

### Prerequisites

```bash
# Required
node --version        # ≥ 22.0.0
pnpm --version        # ≥ 10.0.0
docker --version      # Latest stable
git --version         # Latest stable

# Optional but useful
curl                  # HTTP testing
jq                    # JSON parsing
postgresql-client     # psql command-line tool
redis-cli             # Redis command-line tool
```

### First Time Setup (5 minutes)

```bash
# 1. Clone repo
git clone https://github.com/PATTANAKORN025/ice-truck-racking.git
cd ice-truck-racking

# 2. Install dependencies
pnpm install

# 3. Setup environment files
cp backend/env.example backend/.env
cp dashboard/.env.example dashboard/.env.local

# 4. Start Docker Compose stack
pnpm docker:up

# 5. Seed database (optional)
curl http://localhost:5000/api/v1/health

# 6. Verify all services are healthy
docker-compose ps
# All should show "healthy" or "Up"
```

### First PR Checklist

- [ ] Create feature branch: `git checkout -b feat/my-feature`
- [ ] Run `pnpm install` to update `pnpm-lock.yaml`
- [ ] Make changes + add tests
- [ ] Run `pnpm test` + `pnpm lint` locally
- [ ] Push to GitHub + open PR
- [ ] Wait for CI green checkmarks
- [ ] Request review from maintainer
- [ ] Address feedback + push updates
- [ ] Merge when approved

---

## Development Environment

### Docker Compose Stack

The `docker-compose.yml` orchestrates 8 services for full-stack local development:

| Service                    | Port       | Health Check       | Use Case              |
| -------------------------- | ---------- | ------------------ | --------------------- |
| **postgres** (TimescaleDB) | 5432       | `SELECT 1`         | Database              |
| **redis**                  | 6379       | PING               | Cache + session store |
| **mosquitto** (MQTT)       | 1883, 9001 | Connect + PUBLISH  | IoT telemetry         |
| **backend**                | 5000       | GET /api/v1/health | REST API + WebSocket  |
| **dashboard**              | 3000       | GET /              | Next.js frontend      |
| **prometheus**             | 9090       | GET `/-/ready`     | Metrics scraping      |
| **grafana**                | 3001       | GET /api/health    | Dashboards            |
| **nginx**                  | 80         | GET /              | Reverse proxy         |

#### Common Commands

```bash
# Start all services
pnpm docker:up

# Stop all services
pnpm docker:down

# View logs for one service
docker-compose logs -f backend

# View logs for all services
docker-compose logs -f

# Rebuild images and restart
docker-compose up -d --build

# Kill everything and clean up volumes
docker-compose down -v
```

### Local Development Without Docker

If running services natively:

```bash
# Terminal 1: Backend (Express + WebSocket)
cd backend
pnpm install
npm run dev
# Listens on :5000

# Terminal 2: Dashboard (Next.js)
cd dashboard
pnpm install
npm run dev
# Listens on :3000

# Terminal 3: PostgreSQL (macOS with Homebrew)
brew services start postgresql@16
# Or run: psql -U postgres -d ice_tracking

# Terminal 4: Redis
redis-server

# Terminal 5: Mosquitto
mosquitto -c /path/to/mosquitto.conf
```

---

## Git & Branching Workflow

### Branch Naming Convention

```text
{type}/{scope}-{description}
```

| Type       | Example                     | Purpose                             |
| ---------- | --------------------------- | ----------------------------------- |
| `feat`     | `feat/geofence-alerts`      | New feature                         |
| `fix`      | `fix/auth-token-expiry`     | Bug fix                             |
| `chore`    | `chore/update-dependencies` | Build/config/dependencies           |
| `docs`     | `docs/api-authentication`   | Documentation only                  |
| `refactor` | `refactor/truck-service`    | Restructure without behavior change |
| `test`     | `test/alerts-coverage`      | Test improvements                   |
| `perf`     | `perf/query-optimization`   | Performance improvement             |

### Workflow

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feat/my-feature

# 2. Commit with conventional format
git add .
git commit -m "feat(trucks): add real-time location updates via MQTT"
# Uses commitlint (enforced by husky pre-commit hook)

# 3. Keep up with main (if long-lived branch)
git fetch origin
git rebase origin/main     # Prefer rebase over merge

# 4. Push and open PR
git push origin feat/my-feature
# Go to GitHub and open PR with description

# 5. Address feedback
git add .
git commit -m "fix: update test for location precision"
git push origin feat/my-feature
# GitHub auto-updates PR with new commits

# 6. Squash if needed (before merge)
git rebase -i origin/main
# Mark "pick" for first commit, "squash" for others

# 7. Merge via GitHub UI (or CLI)
git checkout main && git pull origin main
git merge --ff-only feat/my-feature
git push origin main
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

**Examples:**

```bash
# Simple feature
git commit -m "feat(api): add GET /trucks/:id endpoint"

# Bug fix with body
git commit -m "fix(auth): prevent token expiry during active session

The refresh token endpoint was not being called before expiry.
Now it automatically refreshes 5 minutes before expiry."

# Breaking change
git commit -m "refactor(database)!: rename 'trucks' table to 'vehicles'

BREAKING CHANGE: All queries using 'trucks' table must be updated to 'vehicles'"
```

---

## Code Patterns & Best Practices

### TypeScript

```typescript
// ✅ DO: Explicit types with interfaces
interface TruckLocation {
  lat: number
  lng: number
  accuracy: number
  timestamp: Date
}

async function updateTruckLocation(
  truckId: string,
  location: TruckLocation
): Promise<TruckResponse> {
  return db.updateTruck(truckId, { location })
}

// ❌ DON'T: Use `any` or implicit types
function updateLocation(id: any, loc: any): any {
  return db.updateTruck(id, loc)
}

// ❌ DON'T: Loose type unions without narrowing
function processStatus(status: string | number) {
  // Need to narrow type here
  if (typeof status === 'string') {
    return status.toUpperCase()
  }
}
```

### Error Handling

```typescript
// ✅ DO: Create custom error classes
class TruckNotFoundError extends Error {
  constructor(id: string) {
    super(`Truck ${id} not found`)
    this.name = 'TruckNotFoundError'
  }
}

try {
  const truck = await getTruck(id)
  if (!truck) throw new TruckNotFoundError(id)
} catch (err) {
  if (err instanceof TruckNotFoundError) {
    res.status(404).json({ error: err.message })
  } else {
    logger.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// ❌ DON'T: Throw raw strings or use generic Error
throw 'Truck not found' // Bad
throw new Error('Truck not found') // Generic

// ❌ DON'T: Swallow errors silently
try {
  updateDatabase()
} catch (err) {
  // Silent failure - very bad!
}
```

### SQL Queries

```sql
/* ✅ DO: Explicit columns, parameterized queries */
SELECT id, truck_code, status, location
FROM trucks
WHERE status = $1
  AND created_at > $2
ORDER BY truck_code ASC;

/* ❌ DON'T: SELECT *, implicit ordering, string interpolation */
SELECT * FROM trucks WHERE status = 'active'
SELECT * FROM trucks ORDER BY truck_code

/* ❌ NEVER: SQL injection vulnerability */
SELECT * FROM trucks WHERE id = '" + userId + "'"
```

### Database Queries in Node.js

```javascript
// ✅ DO: Use parameterized queries (prevent SQL injection)
const query = `
  SELECT id, truck_code, temperature_current
  FROM trucks
  WHERE status = $1 AND updated_at > $2
`
const result = await db.query(query, [status, cutoffTime])

// ✅ DO: Use connection pooling for performance
const pool = new Pool({ max: 20 })

// ❌ DON'T: String interpolation
const result = await db.query(`SELECT * FROM trucks WHERE id = ${id}`)

// ❌ DON'T: Store passwords in code
const hashedPassword = '$2b$12$...' // NEVER
// Instead: Generate hashes at runtime with bcrypt.hash()
```

### React Components

```tsx
// ✅ DO: Functional components with hooks
import { useEffect, useState } from 'react'

interface TruckMapProps {
  truckId: string
  onLocationChange: (loc: Location) => void
}

export default function TruckMap({ truckId, onLocationChange }: TruckMapProps) {
  const [location, setLocation] = useState<Location | null>(null)

  useEffect(() => {
    const unsubscribe = truckService.subscribe(truckId, (loc) => {
      setLocation(loc)
      onLocationChange(loc)
    })
    return () => unsubscribe()
  }, [truckId, onLocationChange])

  return location ? <MapGL center={location} /> : <Loading />
}

// ❌ DON'T: Class components or prop drilling
class TruckMap extends React.Component {
  // Verbose and harder to test
}

// ❌ DON'T: Fetch data in render
export function TruckList() {
  const trucks = fetch('/api/trucks')  // BAD: runs every render
  return trucks.map(...)
}
```

---

## Testing

### Testing Pyramid

```text
         /\
        /E2E\              ← Playwright (69 tests, critical paths)
       /──────\
      / Integration \     ← Jest Supertest (API + live services)
     /──────────────\
    /   Unit Tests   \    ← Jest fast + isolated (mocked dependencies)
   /──────────────────\
```

### Unit Test Example

```javascript
// src/services/__tests__/truckService.test.js
import { truckService } from '../truckService'
import { db } from '../../config/database'

jest.mock('../../config/database')

describe('TruckService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getTruck', () => {
    it('should fetch a truck by ID', async () => {
      db.query.mockResolvedValue({ rows: [{ id: '1', code: 'T001' }] })

      const truck = await truckService.getTruck('1')

      expect(truck).toEqual({ id: '1', code: 'T001' })
      expect(db.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [
        '1',
      ])
    })

    it('should throw TruckNotFoundError if truck does not exist', async () => {
      db.query.mockResolvedValue({ rows: [] })

      await expect(truckService.getTruck('999')).rejects.toThrow(
        'TruckNotFoundError'
      )
    })
  })
})
```

### Running Tests

```bash
# All tests (unit + integration)
pnpm test

# With coverage
pnpm test --coverage

# Watch mode (re-run on file change)
pnpm test --watch

# Single file
pnpm test truckService.test.js

# E2E tests
pnpm test:e2e

# E2E with UI
pnpm test:e2e --ui

# E2E specific browser
pnpm test:e2e --project=chromium
```

---

## Debugging & Troubleshooting

### Backend Debugging

```bash
# Option 1: VS Code debugger
node --inspect-brk=9229 backend/index.js
# Then: VS Code "Debug: Attach to Node" run config

# Option 2: console.log + structured logs
import { logger } from './config/logger'
logger.info({ truckId, location }, 'Truck location updated')

# Option 3: View logs from Docker
docker-compose logs -f backend | grep "error"

# Check database connectivity
psql -h localhost -U postgres -d ice_tracking -c "SELECT 1"
```

### Frontend Debugging

```bash
# Option 1: Next.js dev mode (built-in hot reload)
pnpm --filter @ice-truck/dashboard dev

# Option 2: Browser DevTools
open http://localhost:3000
# F12 → Console tab → network + performance analysis

# Option 3: React DevTools extension
# Monitor component re-renders, props changes

# Option 4: Network tab
# Check WebSocket connections to :5000/socket.io
```

### Common Issues

| Issue                   | Cause                | Solution                                        |
| ----------------------- | -------------------- | ----------------------------------------------- |
| `Cannot find module X`  | Missing install      | Run `pnpm install`                              |
| `ECONNREFUSED :5000`    | Backend not running  | `pnpm docker:up` or `cd backend && npm run dev` |
| `Playwright tests fail` | webServer path issue | See Playwright config `webServer.command`       |
| `Auth token invalid`    | Expired JWT          | Refresh token or re-login                       |
| `Database locked`       | Concurrent migration | Stop all services, retry                        |

---

## Performance Tips

### Dashboard Bundle Size

```bash
# Analyze bundle size
cd dashboard && pnpm run build
# Look for routes with high "First Load JS" (target <150KB each)

# Tips to reduce size:
# 1. Dynamic imports for heavy components
import dynamic from 'next/dynamic'
const Map = dynamic(() => import('@/components/Map'), { ssr: false })

# 2. Code splitting per route
# Next.js app router does this automatically

# 3. Remove unused dependencies
pnpm prune
```

### Database Query Performance

```sql
-- Always check execution plan
EXPLAIN ANALYZE SELECT id, truck_code FROM trucks WHERE status = 'active';

-- Add indexes for frequently-queried columns
CREATE INDEX idx_trucks_status ON trucks(status);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);

-- Don't do: Multiple round-trips
-- Instead: Use JOIN to fetch related data in one query
SELECT t.id, t.truck_code, d.driver_id, d.name
FROM trucks t
LEFT JOIN drivers d ON t.driver_id = d.id
WHERE t.status = 'active';
```

### API Response Caching

```javascript
// ✅ DO: Cache stable responses
app.get('/api/v1/drivers', cache('5 minutes'), async (req, res) => {
  const drivers = await db.query('SELECT * FROM drivers')
  res.json(drivers)
})

// ✅ DO: Invalidate cache on write
app.post('/api/v1/drivers', async (req, res) => {
  const driver = await db.createDriver(req.body)
  cache.delete('drivers') // Bust cache
  res.json(driver)
})
```

---

## Security Checklist

### Before Committing

- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] SQL queries use parameterized/prepared statements
- [ ] User input is validated + sanitized
- [ ] Error messages don't leak sensitive info
- [ ] No `console.log()` of sensitive data (password, token)
- [ ] HTTPS/TLS endpoints (no `http://` in production)
- [ ] Rate limiting enabled on public endpoints

### Example Security Issues to Avoid

```javascript
// ❌ NEVER: Hardcoded credentials
const dbUrl = 'postgresql://user:password@localhost/db'

// ❌ NEVER: API key in frontend code
fetch('https://api.mapbox.com/maps?key=pk_1234567890abcdef')

// ❌ NEVER: User input directly in SQL
app.get('/trucks/:status', async (req, res) => {
  const trucks = await db.query(`SELECT * FROM trucks WHERE status = '${req.params.status}'`)
})

// ❌ NEVER: Logging sensitive data
logger.info(`User ${email} logged in with password ${password}`)

// ✅ DO: Environment variables
const dbUrl = process.env.DATABASE_URL

// ✅ DO: Validate + parameterize
const trucks = await db.query(
  'SELECT * FROM trucks WHERE status = $1',
  [req.params.status]
)

// ✅ DO: Rate limit sensitive endpoints
app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), ...)
```

---

## Need Help?

- **Documentation**: Check [README.md](../README.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API Reference**: Swagger UI at <http://localhost:5000/api-docs>
- **Issues**: Open GitHub issue with reproduction steps
- **Slack**: #ice-truck-dev channel
- **Code review**: Tag maintainers in PR for feedback

---

Happy coding! 🚀
