# ICE-TRUCK TRACKING PLATFORM

TARGETS: 1M trucks|100k msgs/s|>=60 FPS|<100ms p95 latency

## PERFORMANCE

- Dashboard: >=60 FPS (Min 55)
- Bundle: <150KB gzipped
- 3D Load: <500ms
- API: <100ms p95
- Kafka: >100k msgs/s
- R3F: NO `useState` in `useFrame` (Transient only)|Instanced rendering|Single WebGL canvas
- Math: OffscreenCanvas/Web Workers
- VFX: Shader-based (NO CSS blur)

## SECURITY

- Validation: Strict Zod
- RateLimit: Redis token bucket
- Auth: JWT + Refresh Rotation|RBAC
- Logs: NO PII
- Secrets: .env/Vault ONLY
- CI: pnpm audit|trivy|gitleaks

## STACK

- Frontend: Next.js 15|React 19|TS 5.9 (Strict)|MapLibre GL|Deck.gl|Three.js (R3F)|Framer Motion|Tailwind v4
- Backend: Node.js|Fastify (Phase 3)|TimescaleDB|ClickHouse|Redis|EMQX (MQTT)|Redpanda (Kafka)
- Observability: Prometheus|Grafana|Loki|Tempo|OpenTelemetry

## STANDARDS

- TS: `strict: true`|NO `any`
- Code: Func <= 50 LOC|Meaningful names|NO magic numbers|NO global state
- Architecture: Clean (Controller->Service->Repo)
- Git: Conventional Commits

## WORKFLOW & DOD

- Path: Analyze->TestDesign->TypeDefs->Zod->Logic->I/O->Routes->UI->Tests->Docs->Validate
- DOD: Strict TS|Jest(>95%)|Integration|E2E(Playwright)|PerfBudgets|SecScans|Docs
