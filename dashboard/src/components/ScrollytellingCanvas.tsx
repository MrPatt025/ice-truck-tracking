'use client';

import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useScroll, motion, useTransform } from 'framer-motion';

/**
 * ScrollytellingCanvas: A full-screen fixed background canvas that 
 * maps the user's scroll position to 3D camera/scene properties.
 */
export function ScrollytellingCanvas({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Example mappings: Fade out background over time or shift camera angle
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);

  return (
    <div ref={containerRef} className="relative w-full h-[200vh]">
      {/* 3D Background */}
      <motion.div 
        className="fixed top-0 left-0 w-full h-screen -z-10 pointer-events-none"
        style={{ opacity, scale }}
      >
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: false }}>
          {/* eslint-disable-next-line react/no-unknown-property */}
          <ambientLight intensity={0.5} />
          {/* eslint-disable-next-line react/no-unknown-property */}
          <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
          {/* Abstract Grid/Map representation */}
          {/* eslint-disable-next-line react/no-unknown-property */}
          <gridHelper args={[100, 100, '#4f46e5', '#334155']} position={[0, -2, 0]} />
          {/* eslint-disable-next-line react/no-unknown-property */}
          <fog attach="fog" args={['#0f172a', 10, 30]} />
        </Canvas>
      </motion.div>

      {/* Scrollytelling Foreground Content */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
}
