/* ================================================================
 *  Ice-Truck IoT Engine — Performance Monitor Overlay
 *  ──────────────────────────────────────────────────
 *  Renders a non-React FPS/memory overlay in a corner.
 *  Uses Canvas 2D — zero DOM overhead.
 *
 *  Metrics:
 *    • FPS (with 1-second rolling average)
 *    • Frame time (ms)
 *    • JS Heap (MB)
 *    • DOM node count
 *    • WebSocket events/sec
 *
 *  Automatically paints a mini FPS graph.
 * ================================================================ */

import type { PerfSnapshot } from './types';
import { RingBuffer } from './ringBuffer';

const HISTORY_SIZE = 120; // 2 seconds of history at 60fps

export class PerformanceOverlay {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private history = new RingBuffer<PerfSnapshot>(HISTORY_SIZE);
    private _destroyed = false;
    private _visible = true;

    // Timing
    private frames = 0;
    private lastFpsTime = performance.now();
    private currentFps = 60;
    private lastFrameTime = 0;

    // Event counter
    private eventsPerSec = 0;
    private _eventCount = 0;
    private lastEventCountTime = performance.now();

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 200;
        this.canvas.height = 120;
        this.canvas.style.cssText = `
      position: fixed;
      bottom: 12px;
      right: 12px;
      z-index: 99999;
      pointer-events: none;
      border-radius: 8px;
      opacity: 0.85;
    `;
        this.ctx = this.canvas.getContext('2d')!;
        document.body.appendChild(this.canvas);
    }

    /** Call this from frame scheduler. Measures + draws. */
    update(_dt: number): void {
        if (this._destroyed) return;
        this.canvas.style.display = this._visible ? 'block' : 'none';
        if (!this._visible) return;

        const now = performance.now();
        this.frames++;

        // FPS calculation (1-second window)
        if (now - this.lastFpsTime >= 1000) {
            this.currentFps = Math.round((this.frames * 1000) / (now - this.lastFpsTime));
            this.frames = 0;
            this.lastFpsTime = now;
        }

        // Events/sec
        if (now - this.lastEventCountTime >= 1000) {
            this.eventsPerSec = this._eventCount;
            this._eventCount = 0;
            this.lastEventCountTime = now;
        }

        const frameTime = this.lastFrameTime > 0 ? now - this.lastFrameTime : 16.67;
        this.lastFrameTime = now;

        // Memory (Chrome only)
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
        const heapUsed = mem ? mem.usedJSHeapSize / 1048576 : 0;
        const heapTotal = mem ? mem.totalJSHeapSize / 1048576 : 0;

        const snapshot: PerfSnapshot = {
            fps: this.currentFps,
            frameTime,
            heapUsed,
            heapTotal,
            domNodes: document.querySelectorAll('*').length,
            timestamp: now,
        };
        this.history.push(snapshot);

        this.draw(snapshot);
    }

    /** Increment external event counter (call from worker message handler) */
    recordEvent(): void {
        this._eventCount++;
    }

    /** Toggle visibility */
    toggle(): void {
        this._visible = !this._visible;
    }

    get visible(): boolean {
        return this._visible;
    }

    set visible(v: boolean) {
        this._visible = v;
    }

    private draw(snap: PerfSnapshot): void {
        const { ctx } = this;
        const w = 200;
        const h = 120;

        // Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 8);
        ctx.fill();

        // FPS bar graph
        const data = this.history.toArray();
        const graphX = 10;
        const graphY = 10;
        const graphW = w - 20;
        const graphH = 36;

        for (let i = 0; i < data.length; i++) {
            const fps = data[i].fps;
            const barH = Math.min((fps / 72) * graphH, graphH);
            const x = graphX + (i / HISTORY_SIZE) * graphW;
            const barW = Math.max(graphW / HISTORY_SIZE, 1);

            // Color based on FPS
            ctx.fillStyle =
                fps >= 55
                    ? '#10b981'
                    : fps >= 30
                        ? '#f59e0b'
                        : '#ef4444';

            ctx.fillRect(x, graphY + graphH - barH, barW, barH);
        }

        // Grid lines on graph
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 0.5;
        for (const y of [graphY, graphY + graphH / 2, graphY + graphH]) {
            ctx.beginPath();
            ctx.moveTo(graphX, y);
            ctx.lineTo(graphX + graphW, y);
            ctx.stroke();
        }

        // Text info
        const fpsColor =
            snap.fps >= 55 ? '#10b981' : snap.fps >= 30 ? '#f59e0b' : '#ef4444';

        ctx.font = 'bold 13px "SF Mono", Menlo, monospace';
        ctx.fillStyle = fpsColor;
        ctx.textAlign = 'left';
        ctx.fillText(`${snap.fps} FPS`, graphX, graphY + graphH + 16);

        ctx.font = '11px "SF Mono", Menlo, monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${snap.frameTime.toFixed(1)}ms`, graphX + 70, graphY + graphH + 16);

        // Memory
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(
            `Heap: ${snap.heapUsed.toFixed(0)}MB / ${snap.heapTotal.toFixed(0)}MB`,
            graphX,
            graphY + graphH + 32,
        );

        // DOM nodes + events/sec
        ctx.fillText(
            `DOM: ${snap.domNodes}  Events: ${this.eventsPerSec}/s`,
            graphX,
            graphY + graphH + 46,
        );

        // Target line at 60fps
        const target60Y = graphY + graphH - (60 / 72) * graphH;
        ctx.strokeStyle = 'rgba(16,185,129,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(graphX, target60Y);
        ctx.lineTo(graphX + graphW, target60Y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.font = '9px "SF Mono", Menlo, monospace';
        ctx.fillStyle = '#10b98180';
        ctx.fillText('60', graphX + graphW + 2, target60Y + 3);
    }

    destroy(): void {
        this._destroyed = true;
        if (this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
    }
}
