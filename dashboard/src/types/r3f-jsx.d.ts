// R3F JSX IntrinsicElements augmentation compatible with React 19/TS 5.9
// Augment the automatic JSX runtime module where IntrinsicElements are sourced.
import '@react-three/fiber';
import type { ThreeElements } from '@react-three/fiber';

declare module 'react/jsx-runtime' {
    namespace JSX {
        interface IntrinsicElements extends ThreeElements { }
    }
}

export { };
