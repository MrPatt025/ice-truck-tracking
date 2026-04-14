'use client';
/* eslint-disable react/prop-types */

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { TransitionOrchestrator } from '@/components/transition-orchestrator';

interface LandingTransitionWrapperProps {
  children: ReactNode;
  onClickDashboard?: () => void;
}

/**
 * LandingTransitionWrapper
 * 
 * Wraps landing page content with:
 * - Framer Motion fade-out animation
 * - Coordinates with WebGL camera movement (TransitionOrchestrator)
 * - Syncs HTML opacity (1 → 0) with 3D FOV zoom
 * - Triggers navigation on completion
 */
export const LandingTransitionWrapper: React.FC<
  LandingTransitionWrapperProps
> = ({ children, onClickDashboard }) => {
  // Motion values driven by TransitionOrchestrator progress
  // Both fade and camera FOV happen over same 1200ms duration

  return (
    <>
      <TransitionOrchestrator
        isActive={false}
        duration={1200}
        onComplete={() => {
          // Wait for transition to complete, then navigate
          onClickDashboard?.();
        }}
      />

      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        style={{ pointerEvents: 'auto' }}
      >
        {children}
      </motion.div>
    </>
  );
};
