# 🚀 Monorepo Guide

## One-Install Setup

```bash
# Single command installs everything
npm install

# Start development (all services)
npm run dev

# Build everything
npm run build

# Test everything
npm run test
```

## Workspace Commands

```bash
# Work with specific workspace
npm run dev --workspace @ice-truck/api
npm run build --workspace @ice-truck/web
npm run test --workspace @ice-truck/mobile

# Or use turbo directly
npx turbo run dev --filter=@ice-truck/api
npx turbo run build --filter=@ice-truck/web
```

## Turborepo Features

- **Parallel Execution**: All tasks run in parallel when possible
- **Incremental Builds**: Only rebuilds what changed
- **Remote Caching**: Share build cache across team/CI
- **Task Dependencies**: Automatic dependency resolution

## Project Structure

```
ice-truck-tracking/
├── api/                 # @ice-truck/api
├── web/                 # @ice-truck/web  
├── mobile/              # @ice-truck/mobile
├── packages/
│   ├── shared/          # @ice-truck/shared
│   └── types/           # @ice-truck/types
├── package.json         # Root workspace config
├── turbo.json           # Task pipeline config
└── Dockerfile           # Multi-stage build
```

## Benefits

- ✅ **One Install**: Single `npm install` for entire project
- ✅ **Fast Builds**: Turborepo caching and parallelization  
- ✅ **Shared Dependencies**: Hoisted node_modules
- ✅ **Type Safety**: Shared types across workspaces
- ✅ **CI Efficiency**: Cached builds in GitHub Actions

## Development Workflow

1. `npm install` - Install all dependencies
2. `npm run dev` - Start all services in parallel
3. `npm run build` - Build all workspaces
4. `npm run test` - Test all workspaces
5. `npm run clean` - Clean all build artifacts