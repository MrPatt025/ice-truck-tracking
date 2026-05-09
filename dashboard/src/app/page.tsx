"use client";
import LandingPage from '@/components/LandingPage';
import { motion } from 'framer-motion';
import { ScrollytellingCanvas } from '@/components/ScrollytellingCanvas';
import PremiumPageWrapper from '@/components/common/PremiumPageWrapper';

export default function Home() {
  return (
    <ScrollytellingCanvas>
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="w-full">
    <PremiumPageWrapper
      mode='glass'
      denseNoise
      contentClassName='border-white/30 bg-slate-950/40 shadow-[0_44px_155px_-82px_rgba(34,211,238,0.95)]'
    >
      <LandingPage />
    </PremiumPageWrapper>
        </motion.div>
    </ScrollytellingCanvas>
  )
}
