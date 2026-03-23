---
name: realtime-map-troubleshooting
description: 'Diagnose dashboard realtime map instability. Use when investigating WebGL or deck.gl frame drops, OffscreenCanvas worker desync, camera-transition jitter, websocket telemetry packet loss, or stale frame timing in dashboard rendering pipelines.'
argument-hint: 'Describe symptom, affected route, and recent rendering or socket changes.'
user-invocable: true
---

# Realtime Map Troubleshooting

## What This Skill Does
Provides a deterministic workflow to isolate and fix dashboard rendering and telemetry sync issues across WebGL, deck.gl, worker messaging, and websocket ingestion.

## Triggers
- FPS drops below 60 on dashboard map interactions
- Stutter during landing-to-dashboard transitions
- OffscreenCanvas worker and main-thread state drift
- Marker lag, jump, or freeze under telemetry load
- Packet loss, out-of-order updates, or reconnect storms from websocket streams

## Steps
1. Confirm scope and reproduction.
- Capture exact route, browser, hardware profile, and repeatable scenario.
- Record expected FPS and observed FPS floor.

2. Establish a clean baseline.
- Rebuild dashboard artifacts to avoid stale bundles before profiling.
- Reproduce with minimal background activity and fixed test data if possible.

3. Profile frame budget and render hotspots.
- Inspect frame timeline and isolate CPU vs GPU bottlenecks.
- Check for render storms from state updates in high-frequency paths.
- Verify map layers are GPU-instanced and not per-item React renders.

4. Verify OffscreenCanvas and worker synchronization.
- Inspect message channel ordering and dropped worker messages.
- Confirm camera state, transform state, and telemetry snapshots use a single authoritative timeline.
- Ensure heavy update loops stay in worker or offscreen paths.

5. Audit transition pipeline and motion coupling.
- Validate camera FOV transitions and DOM opacity transitions are clocked together.
- Remove non-essential transition effects that increase frame time variance.
- Confirm reduced-motion behavior for non-essential cinematic effects.

6. Diagnose websocket telemetry health.
- Check reconnect frequency, burst behavior, and queue growth.
- Validate sequence or timestamp handling to prevent stale overwrite.
- Confirm throttling or coalescing strategy avoids flooding UI updates.

7. Apply fixes with minimal surface area.
- Replace state-based hot-path updates with refs or transient subscriptions.
- Move expensive calculations out of render paths.
- Introduce bounded buffering and backpressure-safe update cadence.

8. Verify and regress.
- Re-run target scenario and compare FPS, jank, and packet integrity metrics.
- Execute project checks:
  - `pnpm --filter @ice-truck/dashboard lint`
  - `pnpm --filter @ice-truck/dashboard test:e2e:light`

## Exit Criteria
- Stable 60 FPS behavior in the target scenario or clearly documented hardware-bound limits
- No worker desync in target transition flow
- No telemetry packet handling regressions in visible map behavior

## References
- `docs/CLAUDE.md`
- `docs/DEFINITION_OF_DONE.md`
- `dashboard/src/workers/`
- `dashboard/e2e/`
