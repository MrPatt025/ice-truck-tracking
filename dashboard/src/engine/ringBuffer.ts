/* ================================================================
 *  Ice-Truck IoT Engine — Ring Buffer
 *  ───────────────────────────────────
 *  Fixed-size circular buffer for chart/time-series data.
 *  O(1) push, O(n) read.  Zero allocation after construction.
 * ================================================================ */

export class RingBuffer<T> {
    private buf: (T | undefined)[];
    private head = 0;  // next write position
    private _size = 0;
    readonly capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.buf = new Array(capacity);
    }

    push(item: T): void {
        this.buf[this.head] = item;
        this.head = (this.head + 1) % this.capacity;
        if (this._size < this.capacity) this._size++;
    }

    /** Returns items oldest → newest */
    toArray(): T[] {
        if (this._size === 0) return [];
        const out: T[] = new Array(this._size);
        const start = this._size < this.capacity ? 0 : this.head;
        for (let i = 0; i < this._size; i++) {
            out[i] = this.buf[(start + i) % this.capacity]!;
        }
        return out;
    }

    /** Get the most recent N items (newest last) */
    last(n: number): T[] {
        const count = Math.min(n, this._size);
        const out: T[] = new Array(count);
        const start = (this.head - count + this.capacity) % this.capacity;
        for (let i = 0; i < count; i++) {
            out[i] = this.buf[(start + i) % this.capacity]!;
        }
        return out;
    }

    get latest(): T | undefined {
        if (this._size === 0) return undefined;
        return this.buf[(this.head - 1 + this.capacity) % this.capacity];
    }

    get size(): number {
        return this._size;
    }

    clear(): void {
        this.head = 0;
        this._size = 0;
        this.buf.fill(undefined);
    }
}
