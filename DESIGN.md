# DESIGN.md - Cinematic Frontend & 3D Scrollytelling Architecture

## 1. Executive Summary

The Ice-Truck Tracking Platform's frontend is engineered to deliver a highly cinematic, immersive, and 60-FPS "mission-control" experience. Built on **Next.js 15**, **React 18**, **Three.js (@react-three/fiber)**, and **Deck.gl**, the architecture uses **Scroll-Driven 3D Animation (Scrollytelling)** to bridge HTML UI and 3D WebGL environments seamlessly. The design strictly prioritizes GPU acceleration, main-thread unblocking via Web Workers, and an advanced **Glassmorphism** visual language to achieve an unparalleled aesthetic without sacrificing performance.

## 2. Global Stacking & Rendering Architecture

To avoid WebGL context collisions and maintain maximum frame rates, the frontend splits responsibilities across strict, isolated Z-layers.

- **Z: +20 (Modals & Alerts)**: React DOM overlay for high-priority interactive floating elements.
- **Z: +10 (App Shell & UI)**: HTML UI layer containing Framer Motion scroll-driven elements.
- **Z: 0 (Glassmorphism Overlay)**: The `#ui-overlay` serving frosted glass backdrop filters (`backdrop-blur-xl`, `backdrop-brightness`).
- **Z: -5 (Deck.gl Map)**: Isolated WebGL2 context running Mapbox GL and handling GPU instancing for live fleet tracking (+10K telemetry points).
- **Z: -10 (Offscreen Worker Canvas)**: The primary 3D engine using `@react-three/offscreen`. Runs the `CinematicRig`, procedural cold fog, and ice particle systems entirely off the main thread.
- **Z: -20 (Shared Canvas Pool)**: Ambient atmospheric canvas rendering radial gradients, CRT scanlines, and base lighting using additive composition (`mix-blend-mode: screen`).

## 3. Scrollytelling (Scroll-Driven 3D Animation)

The application achieves fluid Scrollytelling by decoupling DOM scrolling from React state to prevent layout thrashing.

- **`ScrollytellingCanvas` Wrapper**: Every page is wrapped in a synchronized context linking UI layout changes to the 3D rendering loop.
- **Framer Motion Sync**: Uses `useScroll()` and `useTransform()` to map user scroll progress (0.0 to 1.0) into hardware-accelerated CSS properties.
- **Message Dispatch**: Instead of causing React re-renders, motion values dispatch `{ type: 'cinematic:scroll', payload: { progress } }` directly to the `cinematicScene.worker`.
- **Worker-Side Orchestration**: The offscreen Three.js worker receives scroll progress and dynamically interpolates camera FOV (zoom-in depth effects), fog density, and lighting angles.

## 4. 3D Graphics & Shaders Pipeline

The 3D aesthetic revolves around a "Cold-Chain" thematic visualizer.

- **Custom GLSL Shaders**:
  - _Cold Fog Shader_: Uses Perlin noise and turbulence, dynamically tinting from warm amber to cold cyan based on live telemetry payload states.
  - _Particle System_: Handles instance culling for ice crystal trails via view frustum optimization.
- **Post-Processing**: Implements Bloom (high-pass threshold for cyan glows) and Chromatic Aberration to mimic a high-tech data interface.
- **Adaptive DPR**: Uses an `AdaptiveDPR` class that constantly monitors GPU frame execution times, gracefully degrading pixel ratios to maintain 60 FPS under high pressure.

## 5. Glassmorphism & Visual Aesthetics

The HTML UI mimics frosted glass suspended over the 3D background.

- **GlassCard System**: Combines `backdrop-blur-xl`, `backdrop-saturate-150`, and a multi-layered `radial-gradient` to create deep, translucent containers.
- **Micro-interactions**: Interactive components are wrapped in a `<Tilt>` container for 3D mouse-tracking parallax.
- **Continuous GPU Animations**: Employs CSS keyframes with `will-change-transform` for Shimmer effects, Pulsing Glows, and Border Glows, strategically disabled via `group-hover` to preserve resources when not interacted with.

## 6. The Cinematic Route Transition (Landing → Dashboard)

Navigating into the app is an orchestrated choreography rather than an instant load:

- **Phase 1 (Outro)**: Zustand triggers an outro phase extending over 1.2s. `useCinematicCamera` interpolates WebGL canvas scale (+16%), applies a cinematic depth-of-field blur (0 → 1.2px), and increases color saturation.
- **Phase 2 (Route Swap)**: Next.js instantly swaps DOM routing. The WebGL contexts (Deck.gl & SharedCanvas) are persisted in the background to prevent flashing and context recreation overhead.
- **Phase 3 (Intro)**: The dashboard mounts. Dashboard UI panels slide in via staggered Framer Motion springs. The 3D camera gently reverse-interpolates to standard FOV, while Deck.gl points fade in.
- **Zero-Jank Guarantee**: The entire sequence occurs with transient state variables outside of the React render cycle.

## 7. Performance Guardrails

To ensure a true cinematic experience, the following optimizations are strictly enforced:

- **Web Workers**: All complex Three.js math and rendering occur within the `OffscreenCanvas` worker.
- **Transient State**: Live telemetry updates map coordinates directly via `useRef.current.style.transform` combined with Zustand `subscribeWithSelector`, bypassing React reconciliation entirely.
- **GPU Exclusivity**: Animations are strictly limited to `opacity` and `transform`. CSS `will-change` hints are applied explicitly to heavily animated Scrollytelling layers.
