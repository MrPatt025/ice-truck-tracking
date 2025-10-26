'use client';
import dynamic from 'next/dynamic';
const LeafletMap = dynamic(() => import('./MapInner'), { ssr: false });
export default function Map() {
  return <LeafletMap />;
}
