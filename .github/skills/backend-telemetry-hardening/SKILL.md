---
name: backend-telemetry-hardening
description: 'Harden backend telemetry ingestion under load. Use when handling MQTT data spikes, TimescaleDB connection-pool pressure, ingestion latency growth, validation failures, or schema-drift events in realtime telemetry pipelines.'
argument-hint: 'Describe spike shape, ingestion path, and current failure signals.'
user-invocable: true
---

# Backend Telemetry Hardening

## What This Skill Does
Defines a production-safe hardening protocol for backend telemetry ingestion, covering MQTT burst tolerance, database pool limits, and Zod validation fallback strategy.

## Triggers
- MQTT message bursts cause processing lag or dropped updates
- TimescaleDB pool saturation or elevated query wait time
- Ingestion queue growth, timeout spikes, or backpressure collapse
- Zod validation error spikes from schema drift or malformed payloads
- Inconsistent telemetry persistence under sustained load

## Steps
1. Establish incident profile.
- Quantify input rate, error rate, queue depth, and end-to-end latency.
- Identify whether failure is ingress-bound, validation-bound, or persistence-bound.

2. Protect ingestion path first.
- Apply bounded queues and explicit backpressure behavior.
- Separate fast-path parsing from slow-path persistence work.
- Avoid blocking CPU or sync I/O in message hot paths.

3. Control MQTT spike handling.
- Classify topics by criticality and apply per-topic throttling or batching policy.
- Coalesce redundant telemetry updates where business-safe.
- Ensure reconnect and redelivery behavior does not duplicate side effects.

4. Stabilize TimescaleDB pool behavior.
- Measure pool utilization, wait time, and query latency before tuning.
- Tune pool limits conservatively to prevent database thrash.
- Batch writes where safe and keep SQL parameterized with explicit columns.
- Ensure list/read paths include deterministic ordering and selective columns.

5. Enforce Zod boundary validation with fallback protocol.
- Validate all inbound payloads at boundary before service logic.
- On validation failure, route payload to a quarantine or dead-letter path with reason metadata.
- Preserve observability fields for replay and schema evolution analysis.
- Never bypass validation to keep pipeline running.

6. Add resilience controls.
- Use idempotency guards for duplicate delivery scenarios.
- Add circuit-breaking or load-shedding policy where downstream is degraded.
- Keep retry policies bounded and jittered.

7. Verify with stress and failure drills.
- Run burst tests and steady-state tests against target throughput.
- Validate pool stability, ingestion latency, and data integrity after fixes.
- Execute project checks:
  - `pnpm --filter @ice-truck/backend lint`
  - `pnpm --filter @ice-truck/backend type-check`
  - `pnpm --filter @ice-truck/backend test`

## Exit Criteria
- Ingestion remains stable under defined spike and steady-state profiles
- No uncontrolled queue growth or pool exhaustion under target load
- Validation failures are contained through fallback path without data corruption

## References
- `docs/DEFINITION_OF_DONE.md`
- `docs/API.md`
- `docs/THREAT_MODEL.md`
- `backend/src/services/`
- `backend/tests/`
- `tests/k6/`
