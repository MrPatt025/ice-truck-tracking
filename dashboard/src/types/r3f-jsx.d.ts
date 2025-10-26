/* eslint-disable @typescript-eslint/no-empty-object-type */
// R3F JSX IntrinsicElements augmentation compatible with React 19/TS 5.9
// Extend the global JSX namespace using @react-three/fiber's ThreeElements map.
// This works regardless of jsx runtime mode (preserve/automatic) in tsconfig.
import type { ThreeElements } from '@react-three/fiber';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

export {};
