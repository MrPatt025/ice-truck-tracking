/**
 * Frame Profiling & Performance Monitoring Utility
 *
 * Lightweight performance monitoring for WebGL/deck.gl rendering:
 * - Tracks frame times and logs drops below 60 FPS (16.6ms threshold)
 * - Provides performance markers for debug analysis
 * - Zero overhead when disabled (development/logging only)
 */

interface FrameMetrics {
  timestamp: number;
  frameTimeMs: number;
  fps: number;
  isDropped: boolean;
}

const FRAME_DROP_THRESHOLD_MS = 16.6; // 60 FPS target
const SMOOTHING_ALPHA = 0.12; // Exponential moving average
const HISTORY_MAX_SIZE = 300; // ~5 seconds at 60 FPS

class FrameProfiler {
  private frameHistory: FrameMetrics[] = [];
  private smoothedFrameTimeMs = 0;
  private droppedFrameCount = 0;
  private totalFrameCount = 0;
  private readonly enabled: boolean;

  constructor() {
    this.enabled =
      globalThis.console?.warn !== undefined &&
      // Enable profiling in development or if explicitly requested
      (process.env.NODE_ENV === 'development' ||
        (globalThis.location?.search.includes('fps=1') ?? false));
  }

  /**
   * Record a frame and check if it's dropped (slower than 60 FPS)
   * Call once per animation frame
   */
  public recordFrame(frameTimeMs: number): FrameMetrics {
    const now = performance.now();
    const isDropped = frameTimeMs > FRAME_DROP_THRESHOLD_MS;

    // Exponential moving average for smooth FPS calculation
    this.smoothedFrameTimeMs =
      this.smoothedFrameTimeMs * (1 - SMOOTHING_ALPHA) +
      frameTimeMs * SMOOTHING_ALPHA;

    const fps = 1000 / Math.max(1, this.smoothedFrameTimeMs);

    const metrics: FrameMetrics = {
      timestamp: now,
      frameTimeMs,
      fps,
      isDropped,
    };

    if (isDropped) {
      this.droppedFrameCount += 1;
    }
    this.totalFrameCount += 1;

    if (this.enabled && isDropped) {
      this.logFrameDrop(metrics);
    }

    // Maintain history for retrospective analysis
    this.frameHistory.push(metrics);
    if (this.frameHistory.length > HISTORY_MAX_SIZE) {
      this.frameHistory.shift();
    }

    return metrics;
  }

  private logFrameDrop(metrics: FrameMetrics): void {
    const droppedMs = (metrics.frameTimeMs - FRAME_DROP_THRESHOLD_MS).toFixed(2);
    const droppedPercent = (
      (this.droppedFrameCount / Math.max(1, this.totalFrameCount)) *
      100
    ).toFixed(1);

    console.warn(
      `[🎬 Frame Drop] +${droppedMs}ms | ${metrics.fps.toFixed(1)} FPS | ${droppedPercent}% drops (${this.droppedFrameCount}/${this.totalFrameCount})`
    );
  }

  /**
   * Get current frame metrics
   */
  public getMetrics() {
    return {
      currentFrameTimeMs: this.smoothedFrameTimeMs,
      currentFps: 1000 / Math.max(1, this.smoothedFrameTimeMs),
      droppedFrameCount: this.droppedFrameCount,
      totalFrameCount: this.totalFrameCount,
      dropRatePercent:
        (this.droppedFrameCount / Math.max(1, this.totalFrameCount)) * 100,
    };
  }

  /**
   * Get performance history (last N frames)
   */
  public getHistory(count: number = 60): FrameMetrics[] {
    return this.frameHistory.slice(-count);
  }

  /**
   * Calculate average frame time from history
   */
  public getAverageFrameTime(windowSize: number = 60): number {
    const recent = this.frameHistory.slice(-windowSize);
    if (recent.length === 0) return 0;
    const sum = recent.reduce((acc, m) => acc + m.frameTimeMs, 0);
    return sum / recent.length;
  }

  /**
   * Report performance summary
   */
  public reportSummary(): void {
    if (!this.enabled || this.totalFrameCount === 0) return;

    const avg = this.getAverageFrameTime();
    const metrics = this.getMetrics();

    console.info(
      `[📊 Performance Summary]\n` +
        `  Total Frames: ${this.totalFrameCount}\n` +
        `  Dropped: ${this.droppedFrameCount} (${metrics.dropRatePercent.toFixed(1)}%)\n` +
        `  Avg Frame Time: ${avg.toFixed(2)}ms\n` +
        `  Current FPS: ${metrics.currentFps.toFixed(1)}\n` +
        `  Threshold: ${FRAME_DROP_THRESHOLD_MS.toFixed(1)}ms (60 FPS target)`
    );
  }

  /**
   * Reset profiler state
   */
  public reset(): void {
    this.frameHistory = [];
    this.droppedFrameCount = 0;
    this.totalFrameCount = 0;
    this.smoothedFrameTimeMs = 0;
  }

  /**
   * Check if profiling is active
   */
  public isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const frameProfiler = new FrameProfiler();

/**
 * Helper hook for React components to integrate frame profiling
 * Usage: const metrics = useFrameProfiling(frameRef)
 */
export function createFrameProfilingMarker(label: string = 'frame') {
  const startTime = performance.now();

  return {
    end(): FrameMetrics {
      const frameTimeMs = performance.now() - startTime;
      const metrics = frameProfiler.recordFrame(frameTimeMs);

      if (frameProfiler.isEnabled() && metrics.isDropped) {
        console.debug(`[${label}] Took ${frameTimeMs.toFixed(2)}ms`);
      }

      return metrics;
    },
  };
}

/**
 * Decorator for timing async functions
 * Usage: const result = await profileAsync(myAsyncFn, 'api-call')
 */
export async function profileAsync<T>(
  fn: () => Promise<T>,
  label: string = 'async'
): Promise<T> {
  const marker = createFrameProfilingMarker(label);
  try {
    return await fn();
  } finally {
    marker.end();
  }
}
