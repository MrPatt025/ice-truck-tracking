---
name: backend-telemetry-hardening
description: Harden backend telemetry ingestion under load (MQTT spikes, DB pool pressure, validation failures).
argument-hint: Describe spike shape, ingestion path, current failure signals.
user-invocable: true
---

## TRIGGERS

- MQTT bursts causing lag
- TimescaleDB pool saturation/wait times
- Ingestion queue growth/timeouts
- Zod validation error spikes
- Persistence inconsistency

## STEPS

1. **Profile**: Quantify input/error rates, queue depth, p95 latency. ID bottleneck (ingress/validation/persistence).
2. **Ingress**: Bounded queues|Explicit backpressure|Separate parse/persistence|NO blocking CPU/sync I/O in hot paths.
3. **MQTT**: Per-topic throttle/batch|Coalesce safe telemetry|Idempotent reconnects.
4. **TimescaleDB**: Measure pool util/wait|Tune limits|Batch writes|Parameterized SQL|Selective columns/deterministic order.
5. **Validation (Zod)**: Validate at boundary|Route failures to dead-letter + reason|Preserve observability|NEVER bypass validation.
6. **Resilience**: Idempotency guards|Circuit-breaking/load-shedding|Bounded/jittered retries.
7. **Verify**: Burst & steady-state tests|Check pool stability, latency, data integrity.
8. **CI Checks**:
   - `pnpm --filter @ice-truck/backend lint`
   - `pnpm --filter @ice-truck/backend type-check`
   - `pnpm --filter @ice-truck/backend test`

## EXIT CRITERIA

- Stable ingestion under load
- NO uncontrolled queue/pool exhaustion
- Validation failures quarantined, ZERO corruption

## REFS

`docs/DEFINITION_OF_DONE.md` | `docs/API.md` | `docs/THREAT_MODEL.md` | `backend/src/services/` | `backend/tests/` | `tests/k6/`
