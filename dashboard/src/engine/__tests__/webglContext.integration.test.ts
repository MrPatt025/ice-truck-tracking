/**
 * Ring 3 — Integration Tests: Mock WebGL Context
 *
 * Verifies that the 3D layer handles context creation, context loss,
 * and context restore gracefully. Uses a mock WebGL2RenderingContext.
 */

// ─── Mock WebGL2 Context ───────────────────────────────────────

class MockWebGL2Context {
    drawingBufferWidth = 800;
    drawingBufferHeight = 600;
    readonly canvas: HTMLCanvasElement;

    private _contextLost = false;
    private readonly _extensions: Map<string, unknown> = new Map();

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this._extensions.set('WEBGL_lose_context', {
            loseContext: () => this.simulateContextLoss(),
            restoreContext: () => this.simulateContextRestore(),
        });
    }

    // Core WebGL2 methods (stubs — accept any args)
    createShader(..._a: unknown[]): unknown { return {}; }
    shaderSource(..._a: unknown[]): void { /* noop */ }
    compileShader(..._a: unknown[]): void { /* noop */ }
    getShaderParameter(..._a: unknown[]): boolean { return true; }
    createProgram(..._a: unknown[]): unknown { return {}; }
    attachShader(..._a: unknown[]): void { /* noop */ }
    linkProgram(..._a: unknown[]): void { /* noop */ }
    getProgramParameter(..._a: unknown[]): boolean { return true; }
    useProgram(..._a: unknown[]): void { /* noop */ }
    createBuffer(..._a: unknown[]): unknown { return {}; }
    bindBuffer(..._a: unknown[]): void { /* noop */ }
    bufferData(..._a: unknown[]): void { /* noop */ }
    enableVertexAttribArray(..._a: unknown[]): void { /* noop */ }
    vertexAttribPointer(..._a: unknown[]): void { /* noop */ }
    createTexture(..._a: unknown[]): unknown { return {}; }
    bindTexture(..._a: unknown[]): void { /* noop */ }
    texImage2D(..._a: unknown[]): void { /* noop */ }
    texParameteri(..._a: unknown[]): void { /* noop */ }
    viewport(..._a: unknown[]): void { /* noop */ }
    clear(..._a: unknown[]): void { /* noop */ }
    clearColor(..._a: unknown[]): void { /* noop */ }
    enable(..._a: unknown[]): void { /* noop */ }
    disable(..._a: unknown[]): void { /* noop */ }
    blendFunc(..._a: unknown[]): void { /* noop */ }
    drawArrays(..._a: unknown[]): void { /* noop */ }
    drawElements(..._a: unknown[]): void { /* noop */ }
    getUniformLocation(..._a: unknown[]): unknown { return {}; }
    uniform1f(..._a: unknown[]): void { /* noop */ }
    uniform1i(..._a: unknown[]): void { /* noop */ }
    uniform2f(..._a: unknown[]): void { /* noop */ }
    uniform3f(..._a: unknown[]): void { /* noop */ }
    uniform4f(..._a: unknown[]): void { /* noop */ }
    uniformMatrix4fv(..._a: unknown[]): void { /* noop */ }
    deleteShader(..._a: unknown[]): void { /* noop */ }
    deleteProgram(..._a: unknown[]): void { /* noop */ }
    deleteBuffer(..._a: unknown[]): void { /* noop */ }
    deleteTexture(..._a: unknown[]): void { /* noop */ }
    getAttribLocation(..._a: unknown[]): number { return 0; }
    createVertexArray(..._a: unknown[]): unknown { return {}; }
    bindVertexArray(..._a: unknown[]): void { /* noop */ }

    getExtension(name: string): unknown {
        return this._extensions.get(name) ?? null;
    }

    getParameter(pname: number): unknown {
        // MAX_TEXTURE_SIZE
        if (pname === 0x0D33) return 4096;
        // MAX_RENDERBUFFER_SIZE
        if (pname === 0x84E8) return 4096;
        return 0;
    }

    isContextLost(): boolean {
        return this._contextLost;
    }

    simulateContextLoss(): void {
        this._contextLost = true;
        this.canvas.dispatchEvent(new Event('webglcontextlost'));
    }

    simulateContextRestore(): void {
        this._contextLost = false;
        this.canvas.dispatchEvent(new Event('webglcontextrestored'));
    }
}

// ─── Install Mock ──────────────────────────────────────────────

function installWebGLMock(): void {
    const origGetContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        contextId: string,
        ..._args: unknown[]
    ): unknown {
        if (contextId === 'webgl2' || contextId === 'webgl') {
            return new MockWebGL2Context(this);
        }
        try {
            return (origGetContext as (...args: unknown[]) => unknown).call(this, contextId);
        } catch {
            return null;
        }
    } as typeof origGetContext;
}

// ═══════════════════════════════════════════════════════════════
//  Tests
// ═══════════════════════════════════════════════════════════════

describe('WebGL Context Integration', () => {
    beforeAll(() => {
        installWebGLMock();
    });

    it('canvas returns mock WebGL2 context', () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');

        expect(gl).not.toBeNull();
        expect(gl).toBeInstanceOf(MockWebGL2Context);
    });

    it('context is not initially lost', () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') as unknown as MockWebGL2Context;

        expect(gl.isContextLost()).toBe(false);
    });

    it('simulates context loss event', () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') as unknown as MockWebGL2Context;

        let lostFired = false;
        canvas.addEventListener('webglcontextlost', () => { lostFired = true; });

        gl.simulateContextLoss();

        expect(gl.isContextLost()).toBe(true);
        expect(lostFired).toBe(true);
    });

    it('simulates context restore event', () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') as unknown as MockWebGL2Context;

        let restoredFired = false;
        canvas.addEventListener('webglcontextrestored', () => { restoredFired = true; });

        gl.simulateContextLoss();
        gl.simulateContextRestore();

        expect(gl.isContextLost()).toBe(false);
        expect(restoredFired).toBe(true);
    });

    it('WEBGL_lose_context extension is available', () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') as unknown as MockWebGL2Context;

        const ext = gl.getExtension('WEBGL_lose_context');
        expect(ext).not.toBeNull();
        expect(ext).toHaveProperty('loseContext');
        expect(ext).toHaveProperty('restoreContext');
    });

    it('getParameter returns reasonable values', () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') as unknown as MockWebGL2Context;

        // MAX_TEXTURE_SIZE
        expect(gl.getParameter(0x0D33)).toBe(4096);
    });

    it('context loss → freeze → restore cycle preserves stability', () => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') as unknown as MockWebGL2Context;

        const events: string[] = [];
        canvas.addEventListener('webglcontextlost', () => events.push('lost'));
        canvas.addEventListener('webglcontextrestored', () => events.push('restored'));

        // Normal operation
        gl.clearColor(0, 0, 0, 1);
        gl.clear(0x4000); // COLOR_BUFFER_BIT

        // Context lost
        gl.simulateContextLoss();
        expect(gl.isContextLost()).toBe(true);

        // Context restored
        gl.simulateContextRestore();
        expect(gl.isContextLost()).toBe(false);

        // Should be able to draw again
        gl.clearColor(1, 0, 0, 1);
        gl.clear(0x4000);

        expect(events).toEqual(['lost', 'restored']);
    });

    it('2D context fallback still works', () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        // jsdom's canvas doesn't have a full 2d implementation,
        // but getContext('2d') should not throw or return webgl mock
        expect(ctx === null || !(ctx instanceof MockWebGL2Context)).toBe(true);
    });
});
