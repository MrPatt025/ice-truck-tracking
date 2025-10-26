'use client';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(
  () => import('react-leaflet').then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((m) => m.TileLayer),
  { ssr: false },
);
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), {
  ssr: false,
});

export default function LiveFleetMapCard() {
  return (
    <div className="h-96 w-full">
      <MapContainer
        center={[13.7563, 100.5018]}
        zoom={6}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {/* Marker/Cluster ตามข้อมูลจริง */}
      </MapContainer>
    </div>
  );
}
