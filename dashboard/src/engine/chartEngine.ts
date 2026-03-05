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

interface ChartLayout {
    pTop: number;
    pLeft: number;
    cW: number;
    cH: number;
    yMin: number;
    yMax: number;
    yPad: number;
    yRange: number;
}

export class ImperativeChart {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly series: ChartSeries[] = [];
    private readonly gridColor: string;
    private readonly bgColor: string;
    private readonly labelColor: string;
    private readonly title: string;
    private readonly showLegend: boolean;
    private readonly yMin?: number;
    private readonly yMax?: number;
    private readonly unit: string;
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
        const paddingLeft = 50;
        const paddingRight = 15;
        const chartW = w - paddingLeft - paddingRight;
        const chartH = h - paddingTop - 30;

        // Title
        if (this.title) {
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 13px Inter, system-ui, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(this.title, paddingLeft, 18);
        }

        // Gather data and compute Y range
        const dataSets = this.collectDataSets();
        const { yMin, yMax, yPad, yRange } = this.computeYRange(dataSets);

        // Grid lines
        const layout: ChartLayout = { pTop: paddingTop, pLeft: paddingLeft, cW: chartW, cH: chartH, yMin, yMax, yPad, yRange };
        this.drawGrid(ctx, layout);

        // Series
        for (const ds of dataSets) {
            this.drawSeries(ctx, ds, layout);
        }

        // Legend
        this.drawLegend(ctx, dataSets, paddingTop, paddingLeft, chartW, chartH);
    }

    private collectDataSets(): Array<{ data: TimeSeriesPoint[]; color: string; label: string }> {
        return this.series.map(s => ({
            data: s.buffer.toArray(),
            color: s.color,
            label: s.label,
        }));
    }

    private computeYRange(dataSets: Array<{ data: TimeSeriesPoint[] }>): {
        yMin: number; yMax: number; yPad: number; yRange: number;
    } {
        let allMin = this.yMin ?? Infinity;
        let allMax = this.yMax ?? -Infinity;

        for (const ds of dataSets) {
            for (const pt of ds.data) {
                if (pt.value < allMin) allMin = pt.value;
                if (pt.value > allMax) allMax = pt.value;
            }
        }

        if (!Number.isFinite(allMin)) allMin = 0;
        if (!Number.isFinite(allMax)) allMax = 100;
        if (allMin === allMax) { allMin -= 1; allMax += 1; }

        const yRange = allMax - allMin;
        return { yMin: allMin, yMax: allMax, yPad: yRange * 0.1, yRange };
    }

    private drawGrid(
        ctx: CanvasRenderingContext2D,
        layout: ChartLayout,
    ): void {
        const { pTop, pLeft, cW, cH, yMax, yPad, yRange } = layout;
        ctx.strokeStyle = this.gridColor;
        ctx.lineWidth = 1;
        const gridLines = 5;
        const totalRange = yRange + 2 * yPad;
        for (let i = 0; i <= gridLines; i++) {
            const y = pTop + (cH / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(pLeft, y);
            ctx.lineTo(pLeft + cW, y);
            ctx.stroke();

            const val = yMax + yPad - (totalRange / gridLines) * i;
            ctx.fillStyle = this.labelColor;
            ctx.font = '11px Inter, system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${val.toFixed(1)}${this.unit}`, pLeft - 5, y + 4);
        }
    }

    private drawSeries(
        ctx: CanvasRenderingContext2D,
        ds: { data: TimeSeriesPoint[]; color: string },
        layout: ChartLayout,
    ): void {
        const { pTop, pLeft, cW, cH, yMin, yPad, yRange } = layout;
        const { data, color } = ds;
        if (data.length < 2) return;

        const n = data.length;
        const xStep = cW / (n - 1);
        const totalRange = yRange + 2 * yPad;
        const toY = (v: number) => pTop + cH - ((v - (yMin - yPad)) / totalRange) * cH;

        // Area fill
        ctx.save();
        ctx.beginPath();
        const gradient = ctx.createLinearGradient(0, pTop, 0, pTop + cH);
        gradient.addColorStop(0, color + '40');
        gradient.addColorStop(1, color + '00');
        ctx.moveTo(pLeft, pTop + cH);
        for (let i = 0; i < n; i++) {
            ctx.lineTo(pLeft + i * xStep, toY(data[i].value));
        }
        ctx.lineTo(pLeft + (n - 1) * xStep, pTop + cH);
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
            const x = pLeft + i * xStep;
            const y = toY(data[i].value);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
    }

    private drawLegend(
        ctx: CanvasRenderingContext2D,
        dataSets: Array<{ color: string; label: string }>,
        pTop: number, pLeft: number, cW: number, cH: number,
    ): void {
        if (!this.showLegend || dataSets.length <= 1) return;

        let lx = pLeft + cW - dataSets.length * 90;
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'left';
        for (const ds of dataSets) {
            ctx.fillStyle = ds.color;
            ctx.fillRect(lx, pTop + cH + 12, 12, 4);
            ctx.fillStyle = this.labelColor;
            ctx.fillText(ds.label, lx + 16, pTop + cH + 18);
            lx += 90;
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
