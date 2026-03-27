/**
 * Frost Truck Shader
 * 
 * Implements a custom fragment shader for ice truck visuals with:
 * - Subtle frosted glass effect (Fresnel-based)
 * - Cool cyan/blue iridescence
 * - Specular highlights simulating ice crystalline structure
 * - Performance optimized for 60 FPS (no branching, minimal math)
 */

export const FROST_TRUCK_VERTEX_SHADER = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-mvPosition.xyz);
    vPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const FROST_TRUCK_FRAGMENT_SHADER = `
  uniform vec3 uFrostColor;
  uniform float uFrostIntensity;
  uniform float uTime;
  
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vPosition;
  
  void main() {
    // Fresnel effect (view-dependent transparency at edges)
    float fresnel = pow(1.0 - clamp(dot(vNormal, vViewDir), 0.0, 1.0), 2.2);
    
    // Specular highlight with crystalline shimmer
    vec3 halfDir = normalize(vViewDir + vec3(0.8, 1.0, 0.4));
    float specular = pow(max(dot(vNormal, halfDir), 0.0), 32.0);
    
    // Subtle animated iridescence (mimics ice surface)
    float iridescence = sin(vPosition.x * 2.0 + uTime * 0.3) * 0.1 + 0.2;
    
    // Base frost color with iridescent tint
    vec3 baseColor = mix(uFrostColor, vec3(0.4, 0.9, 1.0), iridescence);
    
    // Combine: base + specular shimmer + fresnel glow
    vec3 finalColor = baseColor + vec3(1.0) * specular * 0.6 + vec3(0.3, 0.8, 1.0) * fresnel * 0.4;
    
    // Alpha: opaque interior, translucent frosted edges
    float alpha = 0.85 + fresnel * 0.15;
    
    gl_FragColor = vec4(finalColor * uFrostIntensity, alpha);
  }
`;

export interface FrostShaderUniforms {
  uFrostColor: { value: Float32Array };
  uFrostIntensity: { value: number };
  uTime: { value: number };
}

export function createFrostShaderUniforms(
  frostColor: [number, number, number] = [0.4, 0.88, 0.98]
): FrostShaderUniforms {
  return {
    uFrostColor: { value: new Float32Array(frostColor) },
    uFrostIntensity: { value: 1.0 },
    uTime: { value: 0.0 },
  };
}
