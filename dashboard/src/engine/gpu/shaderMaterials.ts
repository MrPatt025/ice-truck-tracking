/* ================================================================
 *  GPU Rendering Engine — Custom GLSL Shader Materials
 *  ────────────────────────────────────────────────────
 *  All shader programs live here. Each creates a Three.js material:
 *    1. MeshGradient — Dynamic animated gradient background
 *    2. ParticleGlow — Additive blending particle shader
 *    3. DataGlow     — Data-driven glow intensity shader
 *    4. InstancedTruck — Optimized instanced truck shader
 *    5. FogDepth     — Volumetric depth fog
 *
 *  All shaders use uniform-based animation (no texture lookups
 *  per frame) to stay within the 6ms GPU budget.
 * ================================================================ */

import * as THREE from 'three';

// ═════════════════════════════════════════════════════════════════
//  1. MESH GRADIENT BACKGROUND SHADER
//     Animated fluid gradient — replaces static CSS gradients.
//     Uses simplex noise in fragment shader for organic motion.
// ═════════════════════════════════════════════════════════════════

const meshGradientVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const meshGradientFragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uColor3;
  uniform vec3 uColor4;
  uniform float uSpeed;
  uniform float uNoiseScale;

  varying vec2 vUv;

  // Simplex-like noise (gpu friendly)
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289((x * 34.0 + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    float t = uTime * uSpeed;
    vec2 st = vUv * uNoiseScale;

    // 4-corner gradient blend with noise distortion
    float n1 = snoise(st + vec2(t * 0.3, t * 0.2)) * 0.5 + 0.5;
    float n2 = snoise(st + vec2(-t * 0.2, t * 0.4)) * 0.5 + 0.5;

    // Bilinear blend of 4 colors
    vec3 top    = mix(uColor1, uColor2, vUv.x + n1 * 0.3);
    vec3 bottom = mix(uColor3, uColor4, vUv.x + n2 * 0.3);
    vec3 color  = mix(bottom, top, vUv.y + n1 * 0.2);

    // Subtle vignette
    float vignette = 1.0 - distance(vUv, vec2(0.5)) * 0.6;
    color *= vignette;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface MeshGradientColors {
    color1: [number, number, number];
    color2: [number, number, number];
    color3: [number, number, number];
    color4: [number, number, number];
}

/** Create an animated mesh gradient material */
export function createMeshGradientMaterial(
    colors: MeshGradientColors,
    speed = 0.08,
    noiseScale = 2.5,
): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor1: { value: new THREE.Color(...colors.color1) },
            uColor2: { value: new THREE.Color(...colors.color2) },
            uColor3: { value: new THREE.Color(...colors.color3) },
            uColor4: { value: new THREE.Color(...colors.color4) },
            uSpeed: { value: speed },
            uNoiseScale: { value: noiseScale },
        },
        vertexShader: meshGradientVertex,
        fragmentShader: meshGradientFragment,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
}

// ═════════════════════════════════════════════════════════════════
//  2. PARTICLE GLOW SHADER
//     Additive blending particles with size attenuation.
//     Each particle has: position, size, opacity, color.
// ═════════════════════════════════════════════════════════════════

const particleGlowVertex = /* glsl */ `
  attribute float aSize;
  attribute float aOpacity;
  attribute vec3 aColor;

  varying float vOpacity;
  varying vec3 vColor;

  uniform float uTime;
  uniform float uPixelRatio;

  void main() {
    vOpacity = aOpacity;
    vColor = aColor;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Size attenuation (billboard particles)
    gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleGlowFragment = /* glsl */ `
  precision highp float;

  varying float vOpacity;
  varying vec3 vColor;

  void main() {
    // Circular soft particle
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    // Soft falloff
    float alpha = smoothstep(0.5, 0.1, d) * vOpacity;

    gl_FragColor = vec4(vColor, alpha);
  }
`;

/** Create a particle glow material (additive blending) */
export function createParticleGlowMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: Math.min(globalThis.window?.devicePixelRatio ?? 1, 2) },
        },
        vertexShader: particleGlowVertex,
        fragmentShader: particleGlowFragment,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
}

// ═════════════════════════════════════════════════════════════════
//  3. DATA-DRIVEN GLOW SHADER
//     Glow intensity mapped to a data metric (speed, temp, etc).
//     Used on truck instances for visual emphasis.
// ═════════════════════════════════════════════════════════════════

const dataGlowVertex = /* glsl */ `
  attribute float aGlowIntensity;
  attribute vec3 aGlowColor;

  varying float vGlow;
  varying vec3 vGlowColor;

  void main() {
    vGlow = aGlowIntensity;
    vGlowColor = aGlowColor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const dataGlowFragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uPulseSpeed;

  varying float vGlow;
  varying vec3 vGlowColor;

  void main() {
    // Pulsing glow based on data intensity
    float pulse = sin(uTime * uPulseSpeed) * 0.15 + 0.85;
    float intensity = vGlow * pulse;

    // Emission-style output
    vec3 color = vGlowColor * intensity;
    float alpha = clamp(intensity, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
  }
`;

/** Create a data-driven glow material */
export function createDataGlowMaterial(pulseSpeed = 2): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPulseSpeed: { value: pulseSpeed },
        },
        vertexShader: dataGlowVertex,
        fragmentShader: dataGlowFragment,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });
}

// ═════════════════════════════════════════════════════════════════
//  4. DEPTH FOG SHADER (post-pass overlay)
//     Adds volumetric depth-based fog for layering effect.
// ═════════════════════════════════════════════════════════════════

const fogVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fogFragment = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uFogColor;
  uniform float uDensity;
  uniform float uOffset;

  varying vec2 vUv;

  void main() {
    // Vertical fog gradient (thicker at bottom)
    float fog = smoothstep(uOffset, 1.0, 1.0 - vUv.y) * uDensity;

    // Subtle time-based movement
    float drift = sin(vUv.x * 6.0 + uTime * 0.5) * 0.02;
    fog += drift;
    fog = clamp(fog, 0.0, 0.6);

    gl_FragColor = vec4(uFogColor, fog);
  }
`;

/** Create a depth fog material */
export function createDepthFogMaterial(
    fogColor: THREE.Color = new THREE.Color(0x0a0a1a),
    density = 0.3,
): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uFogColor: { value: fogColor },
            uDensity: { value: density },
            uOffset: { value: 0.3 },
        },
        vertexShader: fogVertex,
        fragmentShader: fogFragment,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
}

// ═════════════════════════════════════════════════════════════════
//  5. THEME COLOR PRESETS FOR SHADERS
// ═════════════════════════════════════════════════════════════════

import type { Theme } from '../types';

/** Gradient colors per theme */
export const SHADER_THEME_COLORS: Record<Theme, MeshGradientColors> = {
    dark: {
        color1: [0.03, 0.03, 0.08],
        color2: [0.05, 0.02, 0.12],
        color3: [0.02, 0.06, 0.1],
        color4: [0.04, 0.03, 0.06],
    },
    neon: {
        color1: [0.05, 0, 0.15],
        color2: [0, 0.1, 0.2],
        color3: [0.15, 0, 0.1],
        color4: [0, 0.05, 0.15],
    },
    ocean: {
        color1: [0, 0.05, 0.15],
        color2: [0, 0.08, 0.2],
        color3: [0, 0.03, 0.1],
        color4: [0.02, 0.06, 0.18],
    },
    forest: {
        color1: [0.02, 0.08, 0.03],
        color2: [0.01, 0.06, 0.04],
        color3: [0.03, 0.1, 0.02],
        color4: [0.02, 0.05, 0.03],
    },
};

/** Particle base colors per theme */
export const PARTICLE_THEME_COLORS: Record<Theme, THREE.Color> = {
    dark: new THREE.Color(0.3, 0.5, 1),
    neon: new THREE.Color(0, 1, 0.8),
    ocean: new THREE.Color(0.2, 0.6, 1),
    forest: new THREE.Color(0.3, 0.9, 0.4),
};

/** Fog colors per theme */
export const FOG_THEME_COLORS: Record<Theme, THREE.Color> = {
    dark:   new THREE.Color(0x0a0a1a),
    neon:   new THREE.Color(0x0a001a),
    ocean:  new THREE.Color(0x001020),
    forest: new THREE.Color(0x0a1a0a),
};

// ═════════════════════════════════════════════════════════════════
//  6. SHADER UNIFORM UPDATER HELPER
//     Call once per frame to animate all shader materials.
// ═════════════════════════════════════════════════════════════════

/**
 * Update time uniforms on all managed shader materials.
 * Designed for the frame scheduler — lightweight, no allocations.
 */
export function updateShaderUniforms(
    materials: THREE.ShaderMaterial[],
    elapsed: number,
): void {
    for (const m of materials) {
        if (m.uniforms.uTime) {
            m.uniforms.uTime.value = elapsed;
        }
    }
}
