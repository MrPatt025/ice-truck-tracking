/* ================================================================
 *  CRAFT LAYER — Barrel Exports
 *  ─────────────────────────────────────────────────────────────
 *  Single entry point for the entire Perceptual Craft +
 *  Emotional Narrative layer system.
 *
 *  3 Super-Layers served from one import:
 *    1. Engineering Layer ── (existing engine/)
 *    2. Perceptual Craft Layer ── visual depth & physics
 *    3. Emotional Narrative Layer ── timing & meaning
 * ================================================================ */

// ── Perceptual Craft Layer ───────────────────────────────────

export { LightDirector } from './lightSystem';
export type { LightConfig, LightNarrative } from './lightSystem';

export { TextureCompositor } from './textureSystem';
export type { TextureConfig } from './textureSystem';

export { getMotionLab, GLOBAL_SPRING, ALERT_SPRING, CRITICAL_SPRING, MICRO_SPRING } from './motionCalibration';
export type { MotionCalibrationLab } from './motionCalibration';

export { CursorPhysicsEngine } from './cursorPhysics';

export { FLIPAnimator, RouteTransitionManager, CardModalMorph } from './fluidLayout';
export type { TransitionType } from './fluidLayout';

export { CinematicScrollEngine } from './cinematicScroll';

export { ParticleMicroSystem } from './particleMicroSystem';

export { ColorIntelligenceEngine, oklchToCSS, oklchLerp, oklchGradient, parseOKLCH } from './colorIntelligence';
export type { OKLCHColor, ColorIntelligenceConfig } from './colorIntelligence';

export { MapVisualController, getSpeedColor, SPEED_COLORS } from './mapVisualMode';
export type { TruckMarkerVisuals, MapVisualConfig } from './mapVisualMode';

export { SceneGraphController } from './sceneGraph';
export type { SceneNode, CameraState, SceneWorld, SceneGraphConfig } from './sceneGraph';

// ── Emotional Narrative Layer ────────────────────────────────

export { getEmotionalEngine, TONE_SEQUENCES } from './emotionalTiming';
export type { EmotionalTone, EmotionalPhase } from './emotionalTiming';

export { MicroInteractionController } from './microInteractions';
export type { MicroInteractionConfig, InteractionType } from './microInteractions';

export { TemporalUIEngine, getTimeSegment, SEGMENT_TEMPERATURE, SEGMENT_AMBIENT } from './temporalBehavior';
export type { TimeSegment, TemporalConfig, TemporalState } from './temporalBehavior';

export { PredictiveRenderer } from './predictiveRenderer';
export type { PredictionTarget, PredictionSignal, PredictiveConfig } from './predictiveRenderer';

export { SonicEngine } from './sonicEngine';

export { LayoutDensityController, DENSITY_PRESETS } from './layoutDensity';
export type { DensityMode, DensityConfig } from './layoutDensity';

export { VisualSilenceController, SILENCE_PRESETS } from './visualSilence';
export type { SilenceLevel, VisualSilenceConfig } from './visualSilence';

export { AnimationBudgetGovernor, TIER_THRESHOLDS, DEGRADATION_LADDER } from './animationBudget';
export type { BudgetAction, BudgetState, AnimationBudgetConfig } from './animationBudget';

// ── SVG Procedural Icons (React Components) ──────────────────

export { ProceduralIcon, CraftIcon, ICON_PATHS } from './svgProceduralIcons';
export type { ProceduralIconProps, IconName, IconState, IconSize } from './svgProceduralIcons';
