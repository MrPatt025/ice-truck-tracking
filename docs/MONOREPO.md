# �� Monorepo Guide

## Structure & Workspaces

```
ice-truck-tracking/
├─ apps/
│  ├─ backend/        # Node.js/Express API server
│  ├─ dashboard/      # Next.js web dashboard
│  └─ mobile-app/     # React Native Expo mobile app
├─ packages/
│  ├─ sdk-edge/       # Edge SDK (Node.js)
│  └─ sdk-mobile/     # Mobile SDK (React Native)
├─ infra/             # Infrastructure as Code (Terraform, K8s, Docker, CI/CD)
├─ scripts/           # Automation scripts
├─ docs/              # Documentation
└─ ...
```

## TurboRepo & Workspaces

- **TurboRepo** powers fast, incremental builds and tests
- **Workspaces**: All apps and packages are managed centrally
- **Remote Caching**: Share build/test cache across team/CI
- **Centralized Scripts**: Run any command across all workspaces

## Common Commands

```bash
# Install all dependencies
npm install

# Start all services in dev mode
npm run dev

# Build all apps/packages
npm run build

# Run all tests (unit, integration, e2e)
npm run test:all

# Lint and format all code
npm run lint && npm run format
```

## Workspace-Specific Commands

```bash
# Run a command in a specific workspace
npm run test --workspace=apps/backend
npm run build --workspace=apps/dashboard

# Or use turbo directly
npx turbo run build --filter=apps/mobile-app
```

## Benefits

- ✅ **One Install**: Single `npm install` for the entire project
- ✅ **Fast Builds**: TurboRepo caching and parallelization
- ✅ **Shared Dependencies**: Hoisted node_modules
- ✅ **Type Safety**: Shared types across workspaces
- ✅ **CI Efficiency**: Cached builds in GitHub Actions

## Development Workflow

1. `npm install` - Install all dependencies
2. `npm run dev` - Start all services in parallel
3. `npm run build` - Build all workspaces
4. `npm run test:all` - Test all workspaces
5. `npm run clean` - Clean all build artifacts

---

**See also:** [Architecture](./ARCHITECTURE.md) | [Deployment](./DEPLOYMENT.md) | [API](./API.md)
