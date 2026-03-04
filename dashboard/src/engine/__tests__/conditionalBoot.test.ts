/**
 * Unit Test — Conditional 3D Bootstrap
 *
 * Validates the E2E light-mode flag correctly disables GPU layers.
 */
import { is3DDisabled } from '../conditionalBoot';

describe('Conditional 3D Bootstrap', () => {
    const origWindow = globalThis.window;
    const origEnv = process.env.NEXT_PUBLIC_E2E_LIGHT;

    afterEach(() => {
        // Restore
        Object.defineProperty(globalThis, 'window', { value: origWindow, writable: true });
        if (origEnv === undefined) {
            delete process.env.NEXT_PUBLIC_E2E_LIGHT;
        } else {
            process.env.NEXT_PUBLIC_E2E_LIGHT = origEnv;
        }
    });

    it('returns true when window is undefined (SSR)', () => {
        Object.defineProperty(globalThis, 'window', { value: undefined, writable: true });
        expect(is3DDisabled()).toBe(true);
    });

    it('returns true when __E2E_LIGHT__ flag is set', () => {
        // jsdom provides window
        (globalThis.window as Window & { __E2E_LIGHT__?: boolean }).__E2E_LIGHT__ = true;
        expect(is3DDisabled()).toBe(true);

        // Cleanup
        delete (globalThis.window as Window & { __E2E_LIGHT__?: boolean }).__E2E_LIGHT__;
    });

    it('returns true when NEXT_PUBLIC_E2E_LIGHT env is "true"', () => {
        process.env.NEXT_PUBLIC_E2E_LIGHT = 'true';
        expect(is3DDisabled()).toBe(true);
    });

    it('returns false under normal operation', () => {
        delete process.env.NEXT_PUBLIC_E2E_LIGHT;
        delete (globalThis.window as Window & { __E2E_LIGHT__?: boolean }).__E2E_LIGHT__;
        expect(is3DDisabled()).toBe(false);
    });
});
