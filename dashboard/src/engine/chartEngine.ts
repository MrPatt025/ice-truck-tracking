/* ================================================================
 *  Ice-Truck IoT Engine — GPU-Optimized Chart Manager
 *  ───────────────────────────────────────────────────
 *  • Uses Canvas 2D for chart rendering (no React / no Recharts)
 *  • Ring buffer for each series — fixed memory, no GC pressure
 *  • Draws at most once per frame via rAF integration
 *  • Aggregation: only 1 point per 250-1000ms reaches the chart
 *  • Supports multiple series per chart canvas
 * ================================================================ */

import { RingBuffer } from './ringBuffer';
import type { TimeSeriesPoint } from './types';

export interface ChartSeries {
    id: string;
    label: string;
    color: string;
    buffer: RingBuffer<TimeSeriesPoint>;
}

export interface ChartConfig {
    canvas: HTMLCanvasElement;
    series: Array<{ id: string; label: string; color: string }>;
    maxPoints?: number;           // ring buffer capacity (default 360)
    gridColor?: string;
    backgroundColor?: string;
    labelColor?: string;
    title?: string;
    showLegend?: boolean;
    yMin?: number;
    yMax?: number;
    unit?: string;
}

export class ImperativeChart {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private series: ChartSeries[] = [];
    private gridColor: string;
    private bgColor: string;
    private labelColor: string;
    private title: string;
    private showLegend: boolean;
    private yMin?: number;
    private yMax?: number;
    private unit: string;
    private _dirty = true;
    private _destroyed = false;

    constructor(config: ChartConfig) {
        this.canvas = config.canvas;
        this.ctx = config.canvas.getContext('2d')!;
        this.gridColor = config.gridColor ?? 'rgba(100,116,139,0.2)';
        this.bgColor = config.backgroundColor ?? 'transparent';
        this.labelColor = config.labelColor ?? '#94a3b8';
        this.title = config.title ?? '';
        this.showLegend = config.showLegend ?? true;
        this.yMin = config.yMin;
        this.yMax = config.yMax;
        this.unit = config.unit ?? '';

        const maxPts = config.maxPoints ?? 360;
        this.series = config.series.map((s) => ({
            ...s,
            buffer: new RingBuffer<TimeSeriesPoint>(maxPts),
        }));
    }

    /** Push a data point into a series. Mark dirty. */
    push(seriesId: string, point: TimeSeriesPoint): void {
        const s = this.series.find((x) => x.id === seriesId);
        if (s) {
            s.buffer.push(point);
            this._dirty = true;
        }
    }

    /** Called by frame scheduler. Only redraws if dirty. */
    update(_dt: number): void {
        if (this._destroyed || !this._dirty) return;
        this._dirty = false;
        this.draw();
    }

    private draw(): void {
        const { canvas, ctx } = this;
        const dpr = Math.min(window.devicePixelRatio, 2);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;

        // Handle HiDPI
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        // Background
        ctx.clearRect(0, 0, w, h);
        if (this.bgColor !== 'transparent') {
            ctx.fillStyle = this.bgColor;
            ctx.fillRect(0, 0, w, h);
        }

        // Layout
        const paddingTop = this.title ? 30 : 10;
        const paddingBottom = 30;
        const paddingLeft = 50;
        const paddingRight = 15;
        const chartW = w - paddingLeft - paddingRight;
        const chartH = h - paddingTop - paddingBottom;

        // Title
        if (this.title) {
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 13px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(this.title, paddingLeft, 18);
        }

        // Gather all points for y-axis range
        let allMin = this.yMin ?? Infinity;
        let allMax = this.yMax ?? -Infinity;
        const dataSets: Array<{ data: TimeSeriesPoint[]; color: string; label: string }> = [];

        for (const s of this.series) {
            const data = s.buffer.toArray();
            dataSets.push({ data, color: s.color, label: s.label });
            for (const pt of data) {
                if (pt.value < allMin) allMin = pt.value;
                if (pt.value > allMax) allMax = pt.value;
            }
        }

        if (!isFinite(allMin)) allMin = 0;
        if (!isFinite(allMax)) allMax = 100;
        if (allMin === allMax) { allMin -= 1; allMax += 1; }

        const yRange = allMax - allMin;
        const yPad = yRange * 0.1;

        // Grid lines (horizontal)
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = paddingTop + (chartH / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(paddingLeft, y);
            ctx.lineTo(paddingLeft + chartW, y);
            ctx.stroke();

            // Y labels
            const val = allMax + yPad - ((allMax + yPad - (allMin - yPad)) / gridLines) * i;
            ctx.fillStyle = this.labelColor;
            ctx.font = '11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${val.toFixed(1)}${this.unit}`, paddingLeft - 5, y + 4);
        }

        // Draw each series
        for (const ds of dataSets) {
            const { data, color } = ds;
            if (data.length < 2) continue;

            const n = data.length;
            const xStep = chartW / (n - 1);

            // Area fill (gradient)
            ctx.save();
            ctx.beginPath();
            const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + chartH);
            gradient.addColorStop(0, color + '40');
            gradient.addColorStop(1, color + '00');

            ctx.moveTo(paddingLeft, paddingTop + chartH);
            for (let i = 0; i < n; i++) {
                const x = paddingLeft + i * xStep;
                const y = paddingTop + chartH - ((data[i].value - (allMin - yPad)) / (yRange + 2 * yPad)) * chartH;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(paddingLeft + (n - 1) * xStep, paddingTop + chartH);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();

            // Line
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
                const x = paddingLeft + i * xStep;
                const y = paddingTop + chartH - ((data[i].value - (allMin - yPad)) / (yRange + 2 * yPad)) * chartH;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Legend
        if (this.showLegend && dataSets.length > 1) {
            let lx = paddingLeft + chartW - dataSets.length * 90;
            ctx.font = '11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            for (const ds of dataSets) {
                ctx.fillStyle = ds.color;
                ctx.fillRect(lx, paddingTop + chartH + 12, 12, 4);
                ctx.fillStyle = this.labelColor;
                ctx.fillText(ds.label, lx + 16, paddingTop + chartH + 18);
                lx += 90;
            }
        }
    }

    /** Force redraw next frame */
    markDirty(): void {
        this._dirty = true;
    }

    destroy(): void {
        this._destroyed = true;
    }
}
