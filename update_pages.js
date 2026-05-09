const fs = require('fs');
const path = require('path');

const wrapperCode = `"use client";

import React, { useRef, ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useScroll, useTransform, motion } from "framer-motion";

function Scene() {
  const meshRef = useRef<any>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <mesh ref={meshRef}>
      <torusKnotGeometry args={[10, 3, 100, 16]} />
      <meshStandardMaterial color="#88aaff" wireframe />
    </mesh>
  );
}

export default function PremiumPageWrapper({ children, title }: { children: ReactNode, title?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [1, 0.8, 1]);

  return (
    <div ref={containerRef} className="relative min-h-[200vh] bg-black text-white font-sans overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <Canvas camera={{ position: [0, 0, 30] }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Scene />
        </Canvas>
      </div>

      <motion.div 
        style={{ y, opacity }}
        className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8"
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-12 rounded-3xl shadow-2xl max-w-5xl w-full">
          {title && <h1 className="text-5xl font-extrabold tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">{title}</h1>}
          <div className="prose prose-invert prose-lg max-w-none">
            {children}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
`;

const componentsDir = path.join('dashboard', 'src', 'components');
if (!fs.existsSync(componentsDir)) {
  fs.mkdirSync(componentsDir, { recursive: true });
}
fs.writeFileSync(path.join(componentsDir, 'PremiumPageWrapper.tsx'), wrapperCode);

const pages = {
  "dashboard/src/app/page.tsx": "Landing Portal",
  "dashboard/src/app/(auth)/forgot-password/page.tsx": "Account Recovery",
  "dashboard/src/app/(auth)/login/page.tsx": "Secure Login",
  "dashboard/src/app/(auth)/register/page.tsx": "Create Identity",
  "dashboard/src/app/(auth)/reset-password/page.tsx": "Password Reset",
  "dashboard/src/app/admin/page.tsx": "System Administration",
  "dashboard/src/app/alerts/page.tsx": "Critical Alerts",
  "dashboard/src/app/compliance/page.tsx": "Regulatory Compliance",
  "dashboard/src/app/dashboard/page.tsx": "Command Center",
  "dashboard/src/app/fleet/page.tsx": "Fleet Topology",
  "dashboard/src/app/operations/page.tsx": "Active Operations",
  "dashboard/src/app/reports/page.tsx": "Executive Reports",
  "dashboard/src/app/settings/page.tsx": "Platform Configuration",
  "dashboard/src/app/tracking/page.tsx": "Real-time Tracking"
};

for (const [file, title] of Object.entries(pages)) {
  const content = `"use client";

import React from "react";
import PremiumPageWrapper from "@/components/PremiumPageWrapper";

export default function Page() {
  return (
    <PremiumPageWrapper title="${title}">
      <p className="text-xl leading-relaxed text-gray-300">
        Experience the next generation of transportation logistics. 
        Our advanced architectural design provides seamless integration and operational superiority.
      </p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
          <h3 className="text-2xl font-bold mb-4 text-blue-300">Intelligent Routing</h3>
          <p className="text-gray-400">Optimized algorithms ensuring rapid and secure delivery of temperature-sensitive cargo globally.</p>
        </div>
        <div className="bg-black/40 p-6 rounded-2xl border border-white/10">
          <h3 className="text-2xl font-bold mb-4 text-emerald-300">Real-time Telemetry</h3>
          <p className="text-gray-400">Live synchronization with edge devices for immutable tracking and immediate alerting systems.</p>
        </div>
      </div>
    </PremiumPageWrapper>
  );
}
`;
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, content);
}
