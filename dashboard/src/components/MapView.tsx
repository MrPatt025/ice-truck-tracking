'use client';
import dynamic from 'next/dynamic';
import type { JSX } from 'react';
const LeafletMap = dynamic(() => import('./MapInner'), { ssr: false });
export default function Map(): JSX.Element {
  return <LeafletMap />;
}
