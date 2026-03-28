/* eslint-disable react/no-unknown-property */

import React from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  PCFSoftShadowMap,
  PMREMGenerator,
  Group,
  InstancedMesh,
  Object3D,
  Material,
  MeshBasicMaterial,
  Points,
  ShaderMaterial,
  Vector3,
  PerspectiveCamera,
  RingGeometry,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import {
  Bloom,
  DepthOfField,
  EffectComposer,
} from '@react-three/postprocessing'
import { runtimeState } from './cinematicRuntimeState'
import { useCameraSelectionStore } from '../stores/cameraSelectionStore'
import {
  FROST_TRUCK_FRAGMENT_SHADER,
  FROST_TRUCK_VERTEX_SHADER,
  createFrostShaderUniforms,
} from '../engine/shaders/frostTruckShader'

const tmpCameraPos = new Vector3()

function isPerspectiveCamera(camera: unknown): camera is PerspectiveCamera {
  if (!camera || typeof camera !== 'object') return false
  const candidate = camera as { isPerspectiveCamera?: unknown }
  return candidate.isPerspectiveCamera === true
}

type TraversableNode = Object3D & {
  geometry?: { dispose?: () => void }
  material?: Material | Material[]
}

function disposeMaterial(material: Material | Material[] | undefined): void {
  if (!material) return
  if (Array.isArray(material)) {
    for (const item of material) {
      item.dispose?.()
    }
    return
  }
  material.dispose?.()
}

function disposeObjectTree(node: Object3D | null): void {
  if (!node) return
  const current = node as TraversableNode
  current.geometry?.dispose?.()
  disposeMaterial(current.material)
  for (const child of node.children) {
    disposeObjectTree(child)
  }
}

function isLowEndOrMobileRuntime(): boolean {
  if (globalThis.navigator === undefined) return false

  const userAgent = globalThis.navigator.userAgent.toLowerCase()
  const isMobile = /android|iphone|ipad|ipod|mobile/.test(userAgent)

  const navWithHints = globalThis.navigator as Navigator & {
    deviceMemory?: number
    hardwareConcurrency?: number
  }

  const deviceMemory = navWithHints.deviceMemory ?? 8
  const hardwareConcurrency = navWithHints.hardwareConcurrency ?? 8

  return isMobile || deviceMemory <= 4 || hardwareConcurrency <= 4
}

function AdaptiveLightingEnvironment({
  enabled,
}: Readonly<{ enabled: boolean }>) {
  const { gl, scene } = useThree()

  useFrame(() => {
    if (!enabled) return
    const frostBias = Math.max(0, Math.min(1, runtimeState.telemetry.fogTint))
    const thermalBias = Math.max(
      0,
      Math.min(1, (-runtimeState.telemetry.temperatureC + 6) / 18)
    )
    const targetEnvIntensity = 0.82 + frostBias * 0.2 + thermalBias * 0.12
    scene.environmentIntensity +=
      (targetEnvIntensity - scene.environmentIntensity) * 0.08
  })

  React.useEffect(() => {
    const rendererWithLighting = gl as typeof gl & {
      physicallyCorrectLights?: boolean
    }
    const previousEnvironment = scene.environment
    const previousEnvIntensity = scene.environmentIntensity
    const previousPhysicallyCorrect =
      rendererWithLighting.physicallyCorrectLights
    const previousShadowEnabled = gl.shadowMap.enabled
    const previousShadowType = gl.shadowMap.type

    rendererWithLighting.physicallyCorrectLights = true

    if (!enabled) {
      scene.environment = null
      scene.environmentIntensity = 0.65
      gl.shadowMap.enabled = false
      return () => {
        scene.environment = previousEnvironment
        scene.environmentIntensity = previousEnvIntensity
        rendererWithLighting.physicallyCorrectLights = previousPhysicallyCorrect
        gl.shadowMap.enabled = previousShadowEnabled
        gl.shadowMap.type = previousShadowType
      }
    }

    const pmremGenerator = new PMREMGenerator(gl)
    pmremGenerator.compileEquirectangularShader()

    const roomEnvironment = new RoomEnvironment()
    const environmentRenderTarget = pmremGenerator.fromScene(roomEnvironment, 0.03)

    scene.environment = environmentRenderTarget.texture
    scene.environmentIntensity = 0.92
    gl.shadowMap.enabled = true
    gl.shadowMap.type = PCFSoftShadowMap

    return () => {
      scene.environment = previousEnvironment
      scene.environmentIntensity = previousEnvIntensity
      rendererWithLighting.physicallyCorrectLights = previousPhysicallyCorrect
      gl.shadowMap.enabled = previousShadowEnabled
      gl.shadowMap.type = previousShadowType
      environmentRenderTarget.texture.dispose()
      environmentRenderTarget.dispose()
      roomEnvironment.dispose()
      pmremGenerator.dispose()
    }
  }, [enabled, gl, scene])

  return null
}

function TruckModel({
  enableSoftShadows,
}: Readonly<{ enableSoftShadows: boolean }>) {
  const root = React.useRef<Group>(null)
  const sensorGroup = React.useRef<Group>(null)
  const frostHullPanels = React.useRef<InstancedMesh>(null)
  const frontWheels = React.useRef<InstancedMesh>(null)
  const rearWheels = React.useRef<InstancedMesh>(null)
  const frostDummy = React.useRef(new Object3D())

  const frostShaderMaterial = React.useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: FROST_TRUCK_VERTEX_SHADER,
        fragmentShader: FROST_TRUCK_FRAGMENT_SHADER,
        uniforms: createFrostShaderUniforms(),
        transparent: true,
      }),
    []
  )

  React.useEffect(() => {
    return () => {
      frostShaderMaterial.dispose()
    }
  }, [frostShaderMaterial])

  React.useEffect(() => {
    const front = frontWheels.current
    const rear = rearWheels.current
    const frostPanels = frostHullPanels.current
    if (!front || !rear) return

    const dummy = new Object3D()
    const wheelX = [-1.05, 1.05] as const

    wheelX.forEach((x, index) => {
      dummy.position.set(x, -0.1, 0.64)
      dummy.rotation.set(Math.PI / 2, 0, 0)
      dummy.updateMatrix()
      front.setMatrixAt(index, dummy.matrix)
    })
    front.instanceMatrix.needsUpdate = true

    wheelX.forEach((x, index) => {
      dummy.position.set(x, -0.1, -0.64)
      dummy.rotation.set(Math.PI / 2, 0, 0)
      dummy.updateMatrix()
      rear.setMatrixAt(index, dummy.matrix)
    })
    rear.instanceMatrix.needsUpdate = true

    if (frostPanels) {
      const panelOffsets = [-0.72, 0.72] as const
      panelOffsets.forEach((x, index) => {
        dummy.position.set(x, 0.6, 0)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        frostPanels.setMatrixAt(index, dummy.matrix)
      })
      frostPanels.instanceMatrix.needsUpdate = true
    }
  }, [])

  /**
   * Geometry and material disposal on unmount.
   * Prevents GPU memory leaks during long sessions where components
   * are mounted/unmounted (e.g., page navigation).
   */
  React.useEffect(() => {
    const rootNode = root.current
    const frontWheelsNode = frontWheels.current
    const rearWheelsNode = rearWheels.current
    const frostHullPanelsNode = frostHullPanels.current

    return () => {
      disposeObjectTree(rootNode)

      // Explicitly dispose instanced meshes
      if (frontWheelsNode?.geometry) {
        frontWheelsNode.geometry.dispose()
      }
      if (frontWheelsNode?.material) {
        disposeMaterial(frontWheelsNode.material)
      }

      if (rearWheelsNode?.geometry) {
        rearWheelsNode.geometry.dispose()
      }
      if (rearWheelsNode?.material) {
        disposeMaterial(rearWheelsNode.material)
      }

      if (frostHullPanelsNode?.geometry) {
        frostHullPanelsNode.geometry.dispose()
      }
      if (frostHullPanelsNode?.material) {
        disposeMaterial(frostHullPanelsNode.material)
      }
    }
  }, [])

  useFrame(({ clock, camera }, delta) => {
    const p = runtimeState.scroll
    const exploded = 1 - p
    const glide = Math.max(0, p - 0.58)
    const targetFov = runtimeState.cameraFov
    const frostPanels = frostHullPanels.current

    const openDistance = exploded * 1.5
    if (frostPanels) {
      const panelOffsets = [-0.72 - openDistance, 0.72 + openDistance] as const
      panelOffsets.forEach((x, index) => {
        const dummy = frostDummy.current
        dummy.position.set(x, 0.6, 0)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        frostPanels.setMatrixAt(index, dummy.matrix)
      })
      frostPanels.instanceMatrix.needsUpdate = true
    }

    frostShaderMaterial.uniforms.uTime.value = clock.elapsedTime
    const thermalBias = Math.max(
      0,
      Math.min(1, (-runtimeState.telemetry.temperatureC + 4) / 18)
    )
    const frostTint = runtimeState.telemetry.fogTint
    frostShaderMaterial.uniforms.uFrostIntensity.value =
      0.9 + thermalBias * 0.35
    frostShaderMaterial.uniforms.uFrostColor.value.setRGB(
      0.32 + frostTint * 0.16,
      0.84 + frostTint * 0.08,
      0.95
    )

    if (sensorGroup.current) {
      sensorGroup.current.rotation.y += delta * (0.4 + exploded * 0.7)
      sensorGroup.current.position.y =
        0.45 + Math.sin(clock.elapsedTime * 2.2) * 0.03
      sensorGroup.current.scale.setScalar(0.8 + exploded * 0.36)
    }

    if (root.current) {
      root.current.position.x = glide * 8.4
      root.current.position.z = glide * -1.4
      root.current.rotation.y = -0.5 + p * 0.58
      root.current.rotation.z = Math.sin(clock.elapsedTime * 1.4) * 0.015
    }

    tmpCameraPos.set(0.8 + p * 2.8, 1.65 - p * 0.66, 7.4 - p * 3.55)
    camera.position.lerp(tmpCameraPos, 0.08)
    if (
      isPerspectiveCamera(camera) &&
      Math.abs(camera.fov - targetFov) > 0.01
    ) {
      camera.fov += (targetFov - camera.fov) * 0.14
      camera.updateProjectionMatrix()
    }
    camera.lookAt(0.8 + p * 4.5, 0.5, -0.6)
  })

  return (
    <group ref={root} position={[0, 0, 0]}>
      <mesh position={[0, 0.2, 0]} castShadow={enableSoftShadows}>
        <boxGeometry args={[2.8, 0.24, 1.45]} />
        <meshStandardMaterial
          color='#1d4ed8'
          roughness={0.35}
          metalness={0.5}
          envMapIntensity={0.9}
        />
      </mesh>

      <instancedMesh
        ref={frostHullPanels}
        args={[undefined, undefined, 2]}
        castShadow={enableSoftShadows}
      >
        <boxGeometry args={[1.25, 0.7, 1.35]} />
        <primitive attach='material' object={frostShaderMaterial} />
      </instancedMesh>

      <group ref={sensorGroup} position={[0, 0.45, 0]}>
        <mesh position={[0, 0, 0]} castShadow={enableSoftShadows}>
          <sphereGeometry args={[0.2, 24, 24]} />
          <meshStandardMaterial
            color='#22d3ee'
            emissive='#22d3ee'
            emissiveIntensity={1.6}
            roughness={0.12}
            metalness={0.4}
            envMapIntensity={1.1}
          />
        </mesh>
        <mesh position={[-0.34, 0.08, 0.38]} castShadow={enableSoftShadows}>
          <boxGeometry args={[0.16, 0.16, 0.16]} />
          <meshStandardMaterial
            color='#67e8f9'
            emissive='#67e8f9'
            emissiveIntensity={1.25}
            envMapIntensity={0.95}
          />
        </mesh>
        <mesh position={[0.38, -0.04, -0.31]} castShadow={enableSoftShadows}>
          <boxGeometry args={[0.14, 0.14, 0.14]} />
          <meshStandardMaterial
            color='#7dd3fc'
            emissive='#7dd3fc'
            emissiveIntensity={1.15}
            envMapIntensity={0.95}
          />
        </mesh>
      </group>

      <instancedMesh
        ref={frontWheels}
        args={[undefined, undefined, 2]}
        castShadow={enableSoftShadows}
      >
        <cylinderGeometry args={[0.22, 0.22, 0.2, 20]} />
        <meshStandardMaterial color='#0f172a' roughness={0.8} metalness={0.1} />
      </instancedMesh>

      <instancedMesh
        ref={rearWheels}
        args={[undefined, undefined, 2]}
        castShadow={enableSoftShadows}
      >
        <cylinderGeometry args={[0.22, 0.22, 0.2, 20]} />
        <meshStandardMaterial color='#0f172a' roughness={0.8} metalness={0.1} />
      </instancedMesh>
    </group>
  )
}

function RouteAndGround({
  enableSoftShadows,
}: Readonly<{ enableSoftShadows: boolean }>) {
  return (
    <>
      <mesh
        position={[0, -0.34, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={enableSoftShadows}
      >
        <planeGeometry args={[42, 20]} />
        <meshStandardMaterial
          color='#030712'
          roughness={0.88}
          metalness={0.05}
          envMapIntensity={0.35}
        />
      </mesh>

      <mesh position={[2.8, -0.33, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 1.3]} />
        <meshStandardMaterial
          color='#0e7490'
          emissive='#06b6d4'
          emissiveIntensity={0.62}
          roughness={0.26}
          metalness={0.55}
        />
      </mesh>
    </>
  )
}

function ColdFogParticles() {
  const pointsRef = React.useRef<Points>(null)
  const shaderRef = React.useRef<ShaderMaterial | null>(null)
  const tintRef = React.useRef(new Color('#67e8f9'))
  const geometryRef = React.useRef<BufferGeometry | null>(null)

  const geometry = React.useMemo(() => {
    const g = new BufferGeometry()
    const count = 420
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)

    for (let i = 0; i < count; i += 1) {
      const i3 = i * 3
      const radius = 0.8 + Math.random() * 2.4
      const angle = Math.random() * Math.PI * 2
      positions[i3] = Math.cos(angle) * radius
      positions[i3 + 1] = -0.18 + Math.random() * 1.9
      positions[i3 + 2] = Math.sin(angle) * (0.55 + Math.random() * 1.9)
      seeds[i] = Math.random()
    }

    g.setAttribute('position', new BufferAttribute(positions, 3))
    g.setAttribute('aSeed', new BufferAttribute(seeds, 1))
    return g
  }, [])

  const ColdFogShaderMaterial = React.useMemo(() => {
    const material = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uDensity: { value: 0.42 },
        uTint: { value: new Color('#67e8f9') },
        uTemp: { value: -14 },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uDensity;
        attribute float aSeed;
        varying float vAlpha;
        varying float vSeed;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.65 + aSeed * 11.0) * (0.13 + uDensity * 0.2);
          p.z += cos(uTime * 0.52 + aSeed * 13.0) * (0.15 + uDensity * 0.24);
          p.y += sin(uTime * 0.72 + aSeed * 7.0) * 0.08;

          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (12.0 + aSeed * 15.0) * (1.15 + uDensity * 0.65) / max(0.45, -mv.z * 0.3);
          gl_Position = projectionMatrix * mv;

          vSeed = aSeed;
          vAlpha = 0.18 + uDensity * 0.55;
        }
      `,
      fragmentShader: `
        uniform vec3 uTint;
        uniform float uTemp;
        varying float vAlpha;
        varying float vSeed;
        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float dist = length(uv);
          if (dist > 0.5) discard;

          float cloud = smoothstep(0.5, 0.0, dist);
          float heatShift = clamp((uTemp + 24.0) / 22.0, 0.0, 1.0);
          vec3 cold = mix(vec3(0.12, 0.58, 0.86), vec3(0.66, 0.91, 1.0), heatShift);
          vec3 color = mix(cold, uTint, 0.6 + vSeed * 0.2);
          gl_FragColor = vec4(color, cloud * vAlpha);
        }
      `,
    })

    return material
  }, [])

  React.useEffect(() => {
    geometryRef.current = geometry
    shaderRef.current = ColdFogShaderMaterial
    return () => {
      // Dispose geometry on unmount
      geometry.dispose()
      ColdFogShaderMaterial.dispose()
    }
  }, [geometry, ColdFogShaderMaterial])

  useFrame(({ clock }, delta) => {
    if (!pointsRef.current || !shaderRef.current) return

    pointsRef.current.rotation.y += delta * 0.08
    const { telemetry } = runtimeState
    shaderRef.current.uniforms.uTime.value = clock.elapsedTime
    shaderRef.current.uniforms.uDensity.value = telemetry.fogDensity
    shaderRef.current.uniforms.uTemp.value = telemetry.temperatureC

    const hueMix = Math.min(1, Math.max(0, telemetry.fogTint))
    tintRef.current.setHSL(0.54 + (1 - hueMix) * 0.08, 0.88, 0.65)
    shaderRef.current.uniforms.uTint.value.copy(tintRef.current)
  })

  return (
    <points ref={pointsRef} geometry={geometry} position={[0.2, 0.4, 0]}>
      <primitive attach='material' object={ColdFogShaderMaterial} />
    </points>
  )
}

function SelectionPulseHalo() {
  const isTruckSelected = useCameraSelectionStore(
    state => state.selectedTruckId !== null
  )
  const haloMaterialRef = React.useRef<ShaderMaterial | null>(null)
  const haloGeometryRef = React.useRef<RingGeometry | null>(null)

  const haloMaterial = React.useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uColor: { value: new Color('#38bdf8') },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uIntensity;
          uniform vec3 uColor;
          varying vec2 vUv;

          void main() {
            vec2 centered = vUv - vec2(0.5);
            float radius = length(centered);
            float ring = smoothstep(0.34, 0.28, abs(radius - 0.31));
            float pulse = 0.55 + 0.45 * sin(uTime * 4.2);
            float alpha = ring * pulse * uIntensity;
            if (alpha < 0.003) discard;
            gl_FragColor = vec4(uColor, alpha * 0.65);
          }
        `,
      }),
    []
  )

  React.useEffect(() => {
    haloMaterialRef.current = haloMaterial
    const haloGeometry = haloGeometryRef.current
    return () => {
      haloGeometry?.dispose()
      haloMaterial.dispose()
    }
  }, [haloMaterial])

  useFrame(({ clock }, delta) => {
    if (!haloMaterialRef.current) return
    haloMaterialRef.current.uniforms.uTime.value = clock.elapsedTime
    const target = isTruckSelected ? 1 : 0
    const current = haloMaterialRef.current.uniforms.uIntensity.value
    haloMaterialRef.current.uniforms.uIntensity.value =
      current + (target - current) * Math.min(1, delta * 6)
  })

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.315, 0]}
      frustumCulled={false}
    >
      <ringGeometry ref={haloGeometryRef} args={[1.25, 2.15, 96]} />
      <primitive attach='material' object={haloMaterial} />
    </mesh>
  )
}

function MapModeTransitionVeil() {
  const materialRef = React.useRef<MeshBasicMaterial | null>(null)

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.opacity = runtimeState.mapMode.blend * 0.42
    }
  })

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0.8, -0.28, -0.2]}
      frustumCulled={false}
    >
      <ringGeometry args={[1.8, 8.6, 96]} />
      <meshBasicMaterial
        ref={materialRef}
        color='#f97316'
        transparent
        opacity={0}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  )
}

export default function CinematicRig() {
  const isTruckSelected = useCameraSelectionStore(
    state => state.selectedTruckId !== null
  )
  const scrollBloom = 0.12 + runtimeState.scroll * 0.16
  const neonSelectionBoost = isTruckSelected ? 0.2 : 0
  const bloomIntensity = Math.min(0.5, scrollBloom + neonSelectionBoost)

  const transitionActive =
    runtimeState.transition.phase !== 'idle' ||
    runtimeState.transition.progress > 0.02
  const heavyScrollTransition =
    runtimeState.scroll > 0.1 && runtimeState.scroll < 0.92
  const fastThermalSwing = runtimeState.telemetry.temperatureC > 2.5
  const lowEndRuntime = isLowEndOrMobileRuntime()
  const highDpr = runtimeState.viewport.dpr > 1.4
  const disablePremiumLighting = lowEndRuntime || highDpr || transitionActive
  const enablePremiumLighting = !disablePremiumLighting
  const enableSoftShadows = enablePremiumLighting && runtimeState.scroll < 0.9
  const shouldEnablePostFx = !(
    transitionActive ||
    heavyScrollTransition ||
    highDpr ||
    fastThermalSwing
  )
  const shouldEnableDepthOfField =
    shouldEnablePostFx &&
    runtimeState.scroll < 0.84 &&
    runtimeState.viewport.dpr <= 1.25
  let resolutionScale = 1
  if (highDpr) {
    resolutionScale = 0.56
  } else if (runtimeState.viewport.dpr > 1.15) {
    resolutionScale = 0.72
  }
  const luminanceThreshold = isTruckSelected ? 0.3 : 0.36
  const luminanceSmoothing = isTruckSelected ? 0.22 : 0.32

  const renderPostFx = () => {
    if (!shouldEnablePostFx) {
      return <></>
    }

    return (
      <EffectComposer multisampling={0} resolutionScale={resolutionScale}>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={luminanceThreshold}
          luminanceSmoothing={luminanceSmoothing}
          mipmapBlur
        />
        {shouldEnableDepthOfField ? (
          <DepthOfField
            focusDistance={0.018}
            focalLength={0.016}
            bokehScale={0.62}
            height={360}
          />
        ) : (
          <></>
        )}
      </EffectComposer>
    )
  }

  return (
    <>
      <AdaptiveLightingEnvironment enabled={enablePremiumLighting} />
      <color attach='background' args={['#020617']} />
      <ambientLight intensity={enablePremiumLighting ? 0.48 : 0.58} />
      <hemisphereLight
        color='#c7f0ff'
        groundColor='#0f172a'
        intensity={enablePremiumLighting ? 0.62 : 0.35}
      />
      <directionalLight
        position={[5, 6, 3]}
        intensity={enablePremiumLighting ? 1.18 : 0.92}
        color='#bae6fd'
        castShadow={enableSoftShadows}
        shadow-mapSize-width={enableSoftShadows ? 1024 : 256}
        shadow-mapSize-height={enableSoftShadows ? 1024 : 256}
        shadow-camera-near={0.5}
        shadow-camera-far={26}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0006}
        shadow-radius={enableSoftShadows ? 5 : 1}
      />
      <pointLight position={[0, 1.2, 0]} intensity={1.85} color='#22d3ee' />
      <pointLight
        position={[4.8, 1.6, -2.6]}
        intensity={enablePremiumLighting ? 0.86 : 0.72}
        color='#2563eb'
      />

      <RouteAndGround enableSoftShadows={enableSoftShadows} />
      <TruckModel enableSoftShadows={enableSoftShadows} />
      <ColdFogParticles />
      <SelectionPulseHalo />
      <MapModeTransitionVeil />

      {renderPostFx()}
    </>
  )
}
