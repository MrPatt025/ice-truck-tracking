// R3F JSX IntrinsicElements augmentation compatible with React 19/TS 5.9
// Extend the global JSX namespace using @react-three/fiber's ThreeElements map.
// This works regardless of jsx runtime mode (preserve/automatic) in tsconfig.
import type { ThreeElements } from '@react-three/fiber';

declare module 'react' {
  namespace JSX {
    // Extend with R3F's generated ThreeElements map
    interface IntrinsicElements extends ThreeElements {
      // Ensure commonly used nodes exist even if the above map fails to load
      group?: any;
      mesh?: any;
      sphereGeometry?: any;
      icosahedronGeometry?: any;
      meshBasicMaterial?: any;
      ambientLight?: any;
    }
  }
}

export {};
