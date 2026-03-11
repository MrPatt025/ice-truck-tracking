#!/usr/bin/env npx ts-node
/**
 * SITL 12-Hour Immersion Test
 * ────────────────────────────
 * Long-running production-readiness soak test.
 * Validates system stability under sustained load for 12 hours.
 *
 * Usage:
 *   npx ts-node scripts/sitl-immersion-test.ts
 *   npx ts-node scripts/sitl-immersion-test.ts --hours 6 --trucks 500
 *
 * Options:
 *   --hours <n>      Duration in hours (default: 12)
 *   --trucks <n>     Number of trucks (default: 200)
 *   --interval <ms>  Tick interval (default: 1000)
 *   --report <path>  Output report file (default: sitl-immersion-report.json)
 */

import {
    SITLSimulator,
    DEFAULT_SITL_CONFIG,
    type SITLConfig,
} from '../dashboard/src/engine/__tests__/fixtures/sitl-simulator';

// ─── Config ────────────────────────────────────────────────────

interface ImmersionConfig {
    hours: number;
    trucks: number;
    intervalMs: number;
    reportPath: string;
}

interface ImmersionReport {
    startTime: string;
    endTime: string;
    durationMs: number;
    totalTicks: number;
    totalTelemetry: number;
    errors: number;
    avgTickMs: number;
    maxTickMs: number;
    p95TickMs: number;
    memoryPeakMB: number;
    memoryFinalMB: number;
    status: 'pass' | 'fail';
    failures: string[];
}

// ─── Argument Parsing ──────────────────────────────────────────

function parseArgs(argv: string[]): ImmersionConfig {
    const config: ImmersionConfig = {
        hours: 12,
        trucks: 200,
        intervalMs: 1000,
        reportPath: 'sitl-immersion-report.json',
    };

    for (let i = 2; i < argv.length; i++) {
        switch (argv[i]) {
            case '--hours':
                config.hours = Number(argv[++i]);
                break;
            case '--trucks':
                config.trucks = Number(argv[++i]);
                break;
            case '--interval':
                config.intervalMs = Number(argv[++i]);
                break;
            case '--report':
                config.reportPath = argv[++i];
                break;
        }
    }
    return config;
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
    const config = parseArgs(process.argv);
    const durationMs = config.hours * 3_600_000;
    const tickTimings: number[] = [];
    let totalTelemetry = 0;
    let errors = 0;
    const failures: string[] = [];

    console.log(`\n🔬 SITL Immersion Test — ${config.hours}h soak`);
    console.log(`   Trucks: ${config.trucks} | Interval: ${config.intervalMs}ms`);
    console.log(`   Expected ticks: ~${Math.floor(durationMs / config.intervalMs)}\n`);

    const sitlConfig: SITLConfig = {
        ...DEFAULT_SITL_CONFIG,
        truckCount: config.trucks,
        packetLossRate: 0.02,
    };

    const sim = new SITLSimulator(sitlConfig);
    const startTime = Date.now();
    let tick = 0;
    let memoryPeak = 0;
    const startMem = process.memoryUsage();

    const checkInterval = 60_000; // Report every minute
    let lastCheckpoint = startTime;

    const run = (): Promise<void> => {
        return new Promise((resolve) => {
            const timer = setInterval(() => {
                const elapsed = Date.now() - startTime;

                if (elapsed >= durationMs) {
                    clearInterval(timer);
                    resolve();
                    return;
                }

                const tickStart = performance.now();
                try {
                    const telemetry = sim.tick();
                    totalTelemetry += telemetry.length;
                    tick++;

                    // Validate telemetry
                    for (const t of telemetry) {
                        if (t.lat < -90 || t.lat > 90) {
                            errors++;
                            failures.push(`Tick ${tick}: invalid lat ${t.lat}`);
                        }
                        if (t.lng < -180 || t.lng > 180) {
                            errors++;
                            failures.push(`Tick ${tick}: invalid lng ${t.lng}`);
                        }
                    }
                } catch (err) {
                    errors++;
                    failures.push(`Tick ${tick}: ${err instanceof Error ? err.message : String(err)}`);
                }

                const tickMs = performance.now() - tickStart;
                tickTimings.push(tickMs);

                // Memory check
                const mem = process.memoryUsage();
                const heapMB = mem.heapUsed / 1024 / 1024;
                if (heapMB > memoryPeak) memoryPeak = heapMB;

                // Checkpoint logging
                if (Date.now() - lastCheckpoint > checkInterval) {
                    lastCheckpoint = Date.now();
                    const pct = ((elapsed / durationMs) * 100).toFixed(1);
                    const avgMs = tickTimings.reduce((a, b) => a + b, 0) / tickTimings.length;
                    process.stdout.write(
                        `\r  [${pct}%] tick=${tick} telemetry=${totalTelemetry} errors=${errors} avgTick=${avgMs.toFixed(1)}ms heap=${heapMB.toFixed(0)}MB`
                    );
                }
            }, config.intervalMs);
        });
    };

    await run();

    const endTime = Date.now();
    const sorted = [...tickTimings].sort((a, b) => a - b);
    const p95idx = Math.floor(sorted.length * 0.95);
    const finalMem = process.memoryUsage();

    const report: ImmersionReport = {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMs: endTime - startTime,
        totalTicks: tick,
        totalTelemetry,
        errors,
        avgTickMs: sorted.reduce((a, b) => a + b, 0) / sorted.length,
        maxTickMs: sorted[sorted.length - 1] ?? 0,
        p95TickMs: sorted[p95idx] ?? 0,
        memoryPeakMB: memoryPeak,
        memoryFinalMB: finalMem.heapUsed / 1024 / 1024,
        status: errors === 0 && memoryPeak < (startMem.heapUsed / 1024 / 1024) * 3 ? 'pass' : 'fail',
        failures: failures.slice(0, 50), // Cap failures list
    };

    // Write report
    const fs = await import('fs');
    fs.writeFileSync(config.reportPath, JSON.stringify(report, null, 2));

    console.log('\n\n📊 Immersion Test Report');
    console.log('═══════════════════════');
    console.log(`  Duration:        ${(report.durationMs / 3_600_000).toFixed(1)}h`);
    console.log(`  Ticks:           ${report.totalTicks.toLocaleString()}`);
    console.log(`  Telemetry:       ${report.totalTelemetry.toLocaleString()}`);
    console.log(`  Errors:          ${report.errors}`);
    console.log(`  Avg tick:        ${report.avgTickMs.toFixed(2)}ms`);
    console.log(`  P95 tick:        ${report.p95TickMs.toFixed(2)}ms`);
    console.log(`  Max tick:        ${report.maxTickMs.toFixed(2)}ms`);
    console.log(`  Memory peak:     ${report.memoryPeakMB.toFixed(0)}MB`);
    console.log(`  Status:          ${report.status === 'pass' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Report:          ${config.reportPath}\n`);

    process.exit(report.status === 'pass' ? 0 : 1);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(2);
});
