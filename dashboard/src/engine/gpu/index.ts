/* ================================================================
 *  GPU Rendering Engine — Public API
 * ================================================================ */

export { SceneController } from './sceneController';
export {
    createMeshGradientMaterial,
    createParticleGlowMaterial,
    createDataGlowMaterial,
    createDepthFogMaterial,
    updateShaderUniforms,
    SHADER_THEME_COLORS,
    PARTICLE_THEME_COLORS,
    FOG_THEME_COLORS,
    type MeshGradientColors,
} from './shaderMaterials';
export {
    AdaptiveDPR,
    PerformanceGuard,
    detectDeviceTier,
    type AdaptiveDPRConfig,
    type BudgetSample,
} from './adaptiveDPR';
