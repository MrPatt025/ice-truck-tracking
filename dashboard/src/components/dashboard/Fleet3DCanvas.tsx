'use client';

import React, { useEffect, useRef, useState, type JSX } from 'react';
// Ensure R3F JSX namespace augmentation is loaded
import '@react-three/fiber';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { AdditiveBlending, Color, Vector3 } from 'three';
import type { TelemetryPoint } from '@/shared/types/api';

function latLngToVec3(lat: number, lng: number, radius: number): Vector3 {
  // Convert degrees to radians; lat: [-90..90], lng: [-180..180]
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new Vector3(x, y, z);
}

function useThemeColors() {
  const [colors, setColors] = useState({
    ok: new Color('#22d3ee'),
    warn: new Color('#f59e0b'),
    crit: new Color('#ef4444'),
    dim: new Color('#ffffff'),
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = getComputedStyle(document.documentElement);
    const ok = new Color(
      root.getPropertyValue('--glow-ok').trim() || '#22d3ee',
    );
    const warn = new Color(
      root.getPropertyValue('--glow-warning').trim() || '#f59e0b',
    );
    const crit = new Color(
      root.getPropertyValue('--glow-critical').trim() || '#ef4444',
    );
    const dim = new Color(
      root.getPropertyValue('--glow-dim').trim() || 'rgba(255,255,255,0.1)',
    );
    setColors({ ok, warn, crit, dim });
  }, []);

  return colors;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(m.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    try {
      m.addEventListener('change', onChange);
      return () => m.removeEventListener('change', onChange);
    } catch {
      // older engines: best-effort no-op fallback
      return () => {};
    }
  }, []);
  return reduced;
}

function Scene({ points }: { points: TelemetryPoint[] }): JSX.Element {
  const groupRef = useRef<Group>(null);
  const reduced = usePrefersReducedMotion();
  const { ok, warn, crit, dim } = useThemeColors();

  // Color thresholds (simple heuristics)
  const pickColor = (p: TelemetryPoint) => {
    if (p.cargoTempC >= 8) return crit;
    if (p.cargoTempC >= 5) return warn;
    return ok;
  };

  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    if (!reduced) {
      g.rotation.y = t * 0.06; // slow orbit
      const s = 1 + Math.sin(t * 0.9) * 0.015; // subtle breathe
      g.scale.setScalar(s);
    }
  });

  const globeRadius = 1;

  return (
    <group ref={groupRef}>
      {/* Globe core */}
      <mesh>
        <icosahedronGeometry args={[globeRadius, 2]} />
        {/* Faux neon core */}
        <meshBasicMaterial
          color={dim}
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Halo */}
      <mesh scale={[1.06, 1.06, 1.06]}>
        <sphereGeometry args={[globeRadius, 16, 16]} />
        <meshBasicMaterial
          color={ok}
          transparent
          opacity={0.08}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Markers */}
      {points.map((p) => {
        const pos = latLngToVec3(p.lat, p.lng, globeRadius * 1.001);
        const c = pickColor(p);
        return (
          <mesh key={`${p.truckId}-${p.timestamp}`} position={pos.toArray()}>
            <sphereGeometry args={[0.02, 6, 6]} />
            <meshBasicMaterial
              color={c}
              transparent
              opacity={0.9}
              blending={AdditiveBlending}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function Fleet3DCanvas({
  points,
}: {
  points: TelemetryPoint[];
}): JSX.Element {
  return (
    <Canvas
      className="rounded-map"
      camera={{ position: [0, 0, 3.3], fov: 45 }}
      dpr={[1, 1.8]}
    >
      <ambientLight intensity={0.4} />
      <Scene points={points} />
    </Canvas>
  );
}
