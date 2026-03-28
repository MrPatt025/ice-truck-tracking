/**
 * Ring 2 — Unit Tests: Ring Buffer
 *
 * Circular buffer for time-series data.
 * Push, toArray, last, latest, clear.
 */
import { RingBuffer } from '../ringBuffer';

describe('RingBuffer', () => {
    it('starts empty', () => {
        const buf = new RingBuffer<number>(10);
        expect(buf.size).toBe(0);
        expect(buf.capacity).toBe(10);
        expect(buf.latest).toBeUndefined();
        expect(buf.toArray()).toEqual([]);
    });

    it('push adds items', () => {
        const buf = new RingBuffer<number>(5);
        // NOSONAR - Use a typed iterable to avoid Sonar's consecutive-push false positive while preserving push(value) typing.
        for (const value of [1, 2, 3]) buf.push(value);

        expect(buf.size).toBe(3);
        expect(buf.toArray()).toEqual([1, 2, 3]);
    });

    it('wraps around when capacity is exceeded', () => {
        const buf = new RingBuffer<number>(3);
        for (const value of [1, 2, 3, 4]) buf.push(value); // overwrites 1

        expect(buf.size).toBe(3);
        expect(buf.toArray()).toEqual([2, 3, 4]);
    });

    it('latest returns most recent item', () => {
        const buf = new RingBuffer<string>(5);
        for (const value of ['a', 'b', 'c']) buf.push(value);

        expect(buf.latest).toBe('c');
    });

    it('latest works after wrap-around', () => {
        const buf = new RingBuffer<number>(2);
        for (const value of [10, 20, 30]) buf.push(value); // overwrites 10

        expect(buf.latest).toBe(30);
    });

    it('last(n) returns most recent N items', () => {
        const buf = new RingBuffer<number>(10);
        for (let i = 1; i <= 7; i++) buf.push(i);

        expect(buf.last(3)).toEqual([5, 6, 7]);
        expect(buf.last(1)).toEqual([7]);
    });

    it('last(n) clamps to available size', () => {
        const buf = new RingBuffer<number>(10);
        for (const value of [1, 2]) buf.push(value);

        expect(buf.last(100)).toEqual([1, 2]);
    });

    it('last(n) works after wrap-around', () => {
        const buf = new RingBuffer<number>(3);
        for (const value of [1, 2, 3, 4, 5]) buf.push(value);

        expect(buf.last(2)).toEqual([4, 5]);
        expect(buf.last(3)).toEqual([3, 4, 5]);
    });

    it('clear resets the buffer', () => {
        const buf = new RingBuffer<number>(5);
        for (const value of [1, 2, 3]) buf.push(value);
        buf.clear();

        expect(buf.size).toBe(0);
        expect(buf.latest).toBeUndefined();
        expect(buf.toArray()).toEqual([]);
    });

    it('handles capacity of 1', () => {
        const buf = new RingBuffer<number>(1);
        for (const value of [1, 2]) {
            buf.push(value);
            expect(buf.size).toBe(1);
            expect(buf.latest).toBe(value);
        }
        expect(buf.toArray()).toEqual([2]);
    });

    it('maintains order for exactly-full buffer', () => {
        const buf = new RingBuffer<number>(5);
        for (let i = 1; i <= 5; i++) buf.push(i);

        expect(buf.size).toBe(5);
        expect(buf.toArray()).toEqual([1, 2, 3, 4, 5]);
    });

    it('handles large throughput (100k pushes)', () => {
        const buf = new RingBuffer<number>(1000);
        for (let i = 0; i < 100_000; i++) {
            buf.push(i);
        }

        expect(buf.size).toBe(1000);
        expect(buf.latest).toBe(99_999);
        // Oldest should be 99_000
        const arr = buf.toArray();
        expect(arr[0]).toBe(99_000);
        expect(arr.at(-1)).toBe(99_999);
    });
});
