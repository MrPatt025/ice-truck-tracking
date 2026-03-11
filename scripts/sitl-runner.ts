#!/usr/bin/env npx ts-node
/**
 * SITL Simulator — Standalone CLI Runner
 * ───────────────────────────────────────
 * Runs the Software-in-the-Loop simulator as a standalone process.
 * Outputs telemetry as NDJSON to stdout (pipe to files, MQTT, etc).
 *
 * Usage:
 *   npx ts-node scripts/sitl-runner.ts
 *   npx ts-node scripts/sitl-runner.ts --trucks 1000 --ticks 50
 *   npx ts-node scripts/sitl-runner.ts --mode stream --interval 200
 *
 * Options:
 *   --trucks <n>      Number of trucks (default: 100)
 *   --ticks <n>       Number of ticks in batch mode (default: 10)
 *   --mode <mode>     "batch" (default) or "stream"
 *   --interval <ms>   Tick interval in ms for stream mode (default: 500)
 *   --loss <rate>     Packet loss rate 0.0–1.0 (default: 0.02)
 *   --burst           Trigger burst traffic at tick 5
 *   --summary         Print summary stats at end
 *   --json-array      Output as JSON array instead of NDJSON
 */

import {
    SITLSimulator,
    DEFAULT_SITL_CONFIG,
    type SITLConfig,
} from '../dashboard/src/engine/__tests__/fixtures/sitl-simulator';

// ─── Argument Parsing ──────────────────────────────────────────

function parseArgs(argv: string[]): {
    trucks: number;
    ticks: number;
    mode: 'batch' | 'stream';
    interval: number;
    loss: number;
    burst: boolean;
    summary: boolean;
    jsonArray: boolean;
} {
    const args = argv.slice(2);
    const opts = {
        trucks: 100,
        ticks: 10,
        mode: 'batch' as 'batch' | 'stream',
        interval: 500,
        loss: 0.02,
        burst: false,
        summary: false,
        jsonArray: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--trucks':
                opts.trucks = Number.parseInt(args[++i], 10);
                break;
            case '--ticks':
                opts.ticks = Number.parseInt(args[++i], 10);
                break;
            case '--mode':
                opts.mode = args[++i] as 'batch' | 'stream';
                break;
            case '--interval':
                opts.interval = Number.parseInt(args[++i], 10);
                break;
            case '--loss':
                opts.loss = Number.parseFloat(args[++i]);
                break;
            case '--burst':
                opts.burst = true;
                break;
            case '--summary':
                opts.summary = true;
                break;
            case '--json-array':
                opts.jsonArray = true;
                break;
            case '--help':
            case '-h':
                console.log(`
SITL Simulator — Standalone CLI Runner

Usage:
  npx ts-node scripts/sitl-runner.ts [options]

Options:
  --trucks <n>      Number of simulated trucks (default: 100)
  --ticks <n>       Number of ticks in batch mode (default: 10)
  --mode <mode>     "batch" or "stream" (default: batch)
  --interval <ms>   Tick interval in stream mode (default: 500)
  --loss <rate>     Packet loss rate 0.0–1.0 (default: 0.02)
  --burst           Trigger burst traffic at tick 5
  --summary         Print summary statistics at end
  --json-array      Output as JSON array instead of NDJSON
  --help, -h        Show this help message
`);
                process.exit(0);
        }
    }
    return opts;
}

// ─── Main ──────────────────────────────────────────────────────

function main(): void {
    const opts = parseArgs(process.argv);

    const config: Partial<SITLConfig> = {
        truckCount: opts.trucks,
        tickIntervalMs: opts.interval,
        packetLossRate: opts.loss,
    };

    const sim = new SITLSimulator(config);

    process.stderr.write(
        `[SITL] Starting simulator: ${opts.trucks} trucks, mode=${opts.mode}, ` +
        `interval=${opts.interval}ms, loss=${(opts.loss * 100).toFixed(1)}%\n`,
    );

    if (opts.mode === 'batch') {
        // ── Batch mode: run N ticks and output all telemetry ────
        const allBatches: unknown[] = [];

        for (let t = 0; t < opts.ticks; t++) {
            if (opts.burst && t === 5) {
                sim.triggerBurst();
                process.stderr.write('[SITL] Burst triggered at tick 5\n');
            }

            const batch = sim.tick();
            if (opts.jsonArray) {
                allBatches.push(...batch);
            } else {
                for (const telemetry of batch) {
                    process.stdout.write(JSON.stringify(telemetry) + '\n');
                }
            }
        }

        if (opts.jsonArray) {
            process.stdout.write(JSON.stringify(allBatches, null, 2) + '\n');
        }

        if (opts.summary) {
            process.stderr.write(`\n[SITL] Summary:\n${JSON.stringify(sim.stats, null, 2)}\n`);
        }
    } else {
        // ── Stream mode: continuous output ─────────────────────
        let tickCount = 0;

        sim.start((batch) => {
            tickCount++;
            for (const telemetry of batch) {
                process.stdout.write(JSON.stringify(telemetry) + '\n');
            }

            if (opts.burst && tickCount === 5) {
                sim.triggerBurst();
                process.stderr.write('[SITL] Burst triggered at tick 5\n');
            }
        });

        // Graceful shutdown
        const shutdown = () => {
            sim.stop();
            if (opts.summary) {
                process.stderr.write(`\n[SITL] Summary:\n${JSON.stringify(sim.stats, null, 2)}\n`);
            }
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        process.stderr.write('[SITL] Streaming... Press Ctrl+C to stop.\n');
    }
}

main();
