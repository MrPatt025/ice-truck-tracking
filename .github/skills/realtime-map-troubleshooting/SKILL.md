---
name: realtime-map-troubleshooting
description: Diagnose realtime map instability (WebGL/deck.gl drops, worker desync, socket loss).
argument-hint: Describe symptom, affected route, recent render/socket changes.
user-invocable: true
---

## TRIGGERS

- Map FPS < 60
- Landing/Dashboard transition stutter
- OffscreenCanvas/Worker state drift
- Marker lag/freeze under load
- Websocket packet loss/reconnect storms

## STEPS

1. **Scope**: Capture route, browser, hardware, expected/observed FPS.
2. **Baseline**: Rebuild artifacts|Minimal background noise|Fixed test data.
3. **Profile**: Timeline CPU vs GPU|Check render storms|Verify GPU-instanced layers (NO per-item React renders).
4. **Workers**: Inspect message channel ordering/drops|Unify camera/transform/telemetry timeline|Heavy loops -> worker/offscreen.
5. **Transitions**: Couple FOV & DOM opacity|Remove high-variance effects|Enforce reduced-motion.
6. **Websockets**: Check reconnect frequency, burst, queue|Validate timestamps (prevent stale overwrites)|Throttle/coalesce UI updates.
7. **Fix**: Replace state hot-paths with refs/transient subscriptions|Move calc out of render|Bounded buffers + backpressure.
8. **Verify**: Re-run target scenario. Compare FPS/jank/packet metrics.
9. **CI Checks**:
   - `pnpm --filter @ice-truck/dashboard lint`
   - `pnpm --filter @ice-truck/dashboard test:e2e:light`

## EXIT CRITERIA

- Stable 60 FPS (or documented hardware limit)
- ZERO worker desync in transitions
- ZERO telemetry packet regressions

## REFS

`docs/CLAUDE.md` | `docs/DEFINITION_OF_DONE.md` | `dashboard/src/workers/` | `dashboard/e2e/`
