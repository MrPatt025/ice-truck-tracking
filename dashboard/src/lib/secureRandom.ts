const UINT32_MAX_PLUS_ONE = 4294967296;

let fallbackState = 0;

function nextFallbackUint32(): number {
    if (fallbackState === 0) {
        fallbackState = (Date.now() ^ 0x9e3779b9) >>> 0;
    }

    // Xorshift32 fallback for environments without Web Crypto.
    let x = fallbackState;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    fallbackState = x >>> 0;
    return fallbackState;
}

export function secureRandom(): number {
    if (globalThis.crypto?.getRandomValues) {
        const buffer = new Uint32Array(1);
        globalThis.crypto.getRandomValues(buffer);
        return buffer[0] / UINT32_MAX_PLUS_ONE;
    }

    return nextFallbackUint32() / UINT32_MAX_PLUS_ONE;
}

export function secureRandomRange(min: number, max: number): number {
    return min + (max - min) * secureRandom();
}

export function secureRandomInt(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(secureRandom() * maxExclusive);
}

export function secureRandomChance(probability: number): boolean {
    return secureRandom() < probability;
}
