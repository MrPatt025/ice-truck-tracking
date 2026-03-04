/* ================================================================
 *  Data Visualization Engine — R-Tree Spatial Index
 *  ─────────────────────────────────────────────────
 *  Lightweight R-Tree for spatial queries on 10k-50k entities.
 *  Supports: insert, remove, search (range), kNN.
 *
 *  Uses a simplified bulk-loading approach — optimized for the
 *  pattern of "rebuild every N frames" rather than dynamic insert.
 *
 *  Zero external dependencies. ~200 lines.
 * ================================================================ */

import type { AABB, SpatialEntity } from '../types';

// ─── R-Tree Node ───────────────────────────────────────────────
interface RTreeNode {
    bbox: AABB;
    children: RTreeNode[];
    leaf: boolean;
    items: SpatialEntity[];
    height: number;
}

/** Max entries per node before split */
const MAX_ENTRIES = 16;

/**
 * SpatialIndex — R-Tree for fast spatial queries.
 *
 * Usage:
 *   const idx = new SpatialIndex();
 *   idx.bulkLoad(entities);
 *   const nearby = idx.search({ minX: 100, minY: 100, maxX: 200, maxY: 200 });
 *   const closest = idx.knn(x, y, 10);
 */
export class SpatialIndex {
    private root: RTreeNode;
    private _size = 0;

    constructor() {
        this.root = this.createNode(true);
    }

    // ─── Public API ────────────────────────────────────────────

    /** Bulk load all entities (fastest for rebuild pattern) */
    bulkLoad(entities: SpatialEntity[]): void {
        this._size = entities.length;

        if (entities.length === 0) {
            this.root = this.createNode(true);
            return;
        }

        // Sort by X (Hilbert-like approximation)
        const sorted = entities.slice().sort((a, b) => a.x - b.x);

        // Build bottom-up
        this.root = this.buildTree(sorted, 0, sorted.length - 1, 1);
    }

    /** Range search — returns all entities within the bounding box */
    search(bbox: AABB): SpatialEntity[] {
        const result: SpatialEntity[] = [];
        this.searchNode(this.root, bbox, result);
        return result;
    }

    /** Find K nearest neighbors to a point */
    knn(x: number, y: number, k: number): SpatialEntity[] {
        const candidates: Array<{ entity: SpatialEntity; dist: number }> = [];

        // Collect all leaf items with distance
        this.collectAll(this.root, (entity) => {
            const dx = entity.x - x;
            const dy = entity.y - y;
            candidates.push({ entity, dist: dx * dx + dy * dy });
        });

        // Sort by distance, take k
        candidates.sort((a, b) => a.dist - b.dist);
        return candidates.slice(0, k).map((c) => c.entity);
    }

    /** Find nearest neighbor */
    nearest(x: number, y: number): SpatialEntity | null {
        const result = this.knn(x, y, 1);
        return result[0] ?? null;
    }

    /** Radius search — all entities within radius of point */
    withinRadius(x: number, y: number, radius: number): SpatialEntity[] {
        const r2 = radius * radius;
        const bbox: AABB = {
            minX: x - radius,
            minY: y - radius,
            maxX: x + radius,
            maxY: y + radius,
        };

        // Range search then filter by actual distance
        return this.search(bbox).filter((e) => {
            const dx = e.x - x;
            const dy = e.y - y;
            return dx * dx + dy * dy <= r2;
        });
    }

    /** Get total entity count */
    get size(): number { return this._size; }

    /** Clear the index */
    clear(): void {
        this.root = this.createNode(true);
        this._size = 0;
    }

    // ─── Tree Building ─────────────────────────────────────────

    private buildTree(
        items: SpatialEntity[],
        left: number,
        right: number,
        height: number,
    ): RTreeNode {
        const count = right - left + 1;

        if (count <= MAX_ENTRIES) {
            // Leaf node
            const node = this.createNode(true);
            node.height = height;
            for (let i = left; i <= right; i++) {
                node.items.push(items[i]);
                this.extendBBox(node.bbox, items[i].x, items[i].y);
            }
            return node;
        }

        // Internal node — split into chunks
        const chunkSize = Math.ceil(count / MAX_ENTRIES);
        const node = this.createNode(false);
        node.height = height + 1;

        for (let i = left; i <= right; i += chunkSize) {
            const childRight = Math.min(i + chunkSize - 1, right);
            const child = this.buildTree(items, i, childRight, height);
            node.children.push(child);
            this.mergeBBox(node.bbox, child.bbox);
        }

        return node;
    }

    // ─── Search Implementation ─────────────────────────────────

    private searchNode(node: RTreeNode, bbox: AABB, result: SpatialEntity[]): void {
        if (!this.intersects(node.bbox, bbox)) return;

        if (node.leaf) {
            for (const item of node.items) {
                if (
                    item.x >= bbox.minX && item.x <= bbox.maxX &&
                    item.y >= bbox.minY && item.y <= bbox.maxY
                ) {
                    result.push(item);
                }
            }
        } else {
            for (const child of node.children) {
                this.searchNode(child, bbox, result);
            }
        }
    }

    private collectAll(node: RTreeNode, cb: (entity: SpatialEntity) => void): void {
        if (node.leaf) {
            for (const item of node.items) {
                cb(item);
            }
        } else {
            for (const child of node.children) {
                this.collectAll(child, cb);
            }
        }
    }

    // ─── BBox Helpers ──────────────────────────────────────────

    private createNode(leaf: boolean): RTreeNode {
        return {
            bbox: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
            children: [],
            leaf,
            items: [],
            height: 1,
        };
    }

    private extendBBox(bbox: AABB, x: number, y: number): void {
        if (x < bbox.minX) bbox.minX = x;
        if (y < bbox.minY) bbox.minY = y;
        if (x > bbox.maxX) bbox.maxX = x;
        if (y > bbox.maxY) bbox.maxY = y;
    }

    private mergeBBox(target: AABB, source: AABB): void {
        if (source.minX < target.minX) target.minX = source.minX;
        if (source.minY < target.minY) target.minY = source.minY;
        if (source.maxX > target.maxX) target.maxX = source.maxX;
        if (source.maxY > target.maxY) target.maxY = source.maxY;
    }

    private intersects(a: AABB, b: AABB): boolean {
        return a.minX <= b.maxX && a.maxX >= b.minX &&
               a.minY <= b.maxY && a.maxY >= b.minY;
    }
}

// ═════════════════════════════════════════════════════════════════
//  Entity Map — O(1) lookup by ID
//  Complement to spatial index for per-entity access.
// ═════════════════════════════════════════════════════════════════

/**
 * EntityMap — Map<string, T> wrapper with change tracking.
 * Tracks dirty IDs for delta updates.
 */
export class EntityMap<T extends { id: string }> {
    private map = new Map<string, T>();
    private dirtyIds = new Set<string>();
    private _version = 0;

    /** Upsert an entity (tracked as dirty) */
    set(id: string, entity: T): void {
        this.map.set(id, entity);
        this.dirtyIds.add(id);
        this._version++;
    }

    /** Batch upsert */
    setBatch(entities: T[]): void {
        for (const e of entities) {
            this.map.set(e.id, e);
            this.dirtyIds.add(e.id);
        }
        this._version++;
    }

    /** Get by ID — O(1) */
    get(id: string): T | undefined {
        return this.map.get(id);
    }

    /** Remove by ID */
    delete(id: string): boolean {
        this.dirtyIds.delete(id);
        return this.map.delete(id);
    }

    /** Get all dirty IDs since last flush */
    getDirtyIds(): ReadonlySet<string> {
        return this.dirtyIds;
    }

    /** Flush dirty tracking (call after consuming deltas) */
    flushDirty(): void {
        this.dirtyIds.clear();
    }

    /** Check if entity changed since last flush */
    isDirty(id: string): boolean {
        return this.dirtyIds.has(id);
    }

    /** Iteration */
    forEach(cb: (entity: T, id: string) => void): void {
        this.map.forEach(cb);
    }

    values(): IterableIterator<T> {
        return this.map.values();
    }

    get size(): number { return this.map.size; }
    get version(): number { return this._version; }

    clear(): void {
        this.map.clear();
        this.dirtyIds.clear();
        this._version++;
    }
}
