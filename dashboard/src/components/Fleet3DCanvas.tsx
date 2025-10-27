// dashboard/src/components/Fleet3DCanvas.tsx
'use client';

import type { JSX } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const m = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(!!m.matches);
    const onChange = () => setReduced(!!m.matches);
    m.addEventListener?.('change', onChange);
    return () => m.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}

function isWebGLAvailable(): boolean {
  try {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    return !!gl;
  } catch {
    return false;
  }
}

type InstancedPointsProps = {
  count?: number;
  animate?: boolean;
  throttleMs?: number;
};

function InstancedPoints({
  count = 500,
  animate = true,
  throttleMs = 33,
}: InstancedPointsProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const timeRef = useRef(0);
  const lastRef = useRef(0);
  const reduced = usePrefersReducedMotion();
  const { invalidate } = useThree();

  // stable, deterministic positions
  const seeds = useMemo(() => {
    const rng = (s: number) => () =>
      (s = Math.imul(48271, (s ^ (s >>> 15)) + 0x9e3779b9) >>> 0) / 0xffffffff;
    const r = rng(1337);
    const arr: Array<[number, number, number, number]> = [];
    for (let i = 0; i < count; i++) {
      const x = (r() - 0.5) * 10;
      const y = (r() - 0.5) * 2.5;
      const z = (r() - 0.5) * 10;
      const phase = r() * Math.PI * 2;
      arr.push([x, y, z, phase]);
    }
    return arr;
  }, [count]);

  // initial placement
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i]!;
      const x = s[0];
      const y = s[1];
      const z = s[2];
      dummy.position.set(x, y, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    // render once for frameloop='demand'
    invalidate();
  }, [dummy, seeds, invalidate]);

  useFrame((state) => {
    if (document.hidden) return; // pause in background
    if (reduced) return; // respect reduced motion
    if (!animate) return;

    const now = state.clock.getElapsedTime() * 1000;
    if (now - lastRef.current < throttleMs) return; // throttle
    lastRef.current = now;
    timeRef.current += (throttleMs / 1000) * 0.5; // slow tempo

    const mesh = meshRef.current;
    if (!mesh) return;
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i]!;
      const x = s[0];
      const y = s[1];
      const z = s[2];
      const phase = s[3];
      const dy = Math.sin(timeRef.current + phase) * 0.05;
      dummy.position.set(x, y + dy, z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  const geometry = useMemo(() => new THREE.SphereGeometry(0.04, 8, 8), []);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#38bdf8' }),
    [],
  );

  return <instancedMesh ref={meshRef} args={[geometry, material, count]} />;
}

export default function Fleet3DCanvas(): JSX.Element | null {
  const [supported, setSupported] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (
      (typeof navigator !== 'undefined' && (navigator as any).webdriver) ||
      process.env.NEXT_PUBLIC_E2E === '1' ||
      process.env.NEXT_PUBLIC_DISABLE_3D === '1'
    ) {
      setSupported(false);
      return;
    }
    setSupported(isWebGLAvailable());
  }, []);

  if (!supported) {
    return (
      <div
        className="relative h-64 w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ring-1 ring-white/10"
        role="status"
        aria-live="polite"
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(800px 400px at 10% -10%, rgba(56,189,248,.35), transparent 55%), radial-gradient(800px 400px at 100% 10%, rgba(99,102,241,.3), transparent 55%)',
          }}
        />
        <div className="relative h-full w-full flex items-center justify-center">
          <div className="text-center space-y-2">
            <span className="block text-sm text-slate-400">
              3D preview unavailable
            </span>
            <span className="block text-xs text-slate-500">
              WebGL not supported or disabled
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Prefer demand when reduced motion is requested; otherwise animate smoothly
  const frameloop = reduced ? 'demand' : 'always';

  return (
    <div className="relative h-64 w-full rounded-2xl overflow-hidden ring-1 ring-white/10">
      <Canvas
        dpr={[1, 2]}
        frameloop={frameloop as any}
        camera={{ position: [0, 2.2, 4.5], fov: 55 }}
      >
        {/* lights */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 4, 2]} intensity={0.6} />
        {/* ground */}
        <mesh rotation-x={-Math.PI / 2} position={[0, -1, 0]}>
          <planeGeometry args={[50, 50, 1, 1]} />
          <meshBasicMaterial color="#0b1220" />
        </mesh>
        {/* points */}
        <group position={[0, 0, 0]}>
          <InstancedPoints count={600} animate={!reduced} throttleMs={33} />
        </group>
      </Canvas>
    </div>
  );
}
