/* eslint-disable react/no-unknown-property */

import React from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Object3D,
  Mesh,
  Material,
  Points,
  ShaderMaterial,
  Vector3,
  PerspectiveCamera,
} from 'three'
import {
  Bloom,
  DepthOfField,
  EffectComposer,
} from '@react-three/postprocessing'
import { runtimeState } from './cinematicRuntimeState'
import { useCameraSelectionStore } from '../stores/cameraSelectionStore'

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

function TruckModel() {
  const root = React.useRef<Group>(null)
  const leftHull = React.useRef<Mesh>(null)
  const rightHull = React.useRef<Mesh>(null)
  const sensorGroup = React.useRef<Group>(null)
  const frontWheels = React.useRef<InstancedMesh>(null)
  const rearWheels = React.useRef<InstancedMesh>(null)

  React.useEffect(() => {
    const front = frontWheels.current
    const rear = rearWheels.current
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
    }
  }, [])

  useFrame(({ clock, camera }, delta) => {
    const p = runtimeState.scroll
    const exploded = 1 - p
    const glide = Math.max(0, p - 0.58)
    const targetFov = runtimeState.cameraFov

    const openDistance = exploded * 1.5
    if (leftHull.current) leftHull.current.position.x = -0.72 - openDistance
    if (rightHull.current) rightHull.current.position.x = 0.72 + openDistance

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
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[2.8, 0.24, 1.45]} />
        <meshStandardMaterial
          color='#1d4ed8'
          roughness={0.35}
          metalness={0.5}
        />
      </mesh>

      <mesh ref={leftHull} position={[-0.72, 0.6, 0]}>
        <boxGeometry args={[1.25, 0.7, 1.35]} />
        <meshStandardMaterial
          color='#38bdf8'
          roughness={0.24}
          metalness={0.68}
          emissive='#0b2f5e'
          emissiveIntensity={0.18}
        />
      </mesh>

      <mesh ref={rightHull} position={[0.72, 0.6, 0]}>
        <boxGeometry args={[1.25, 0.7, 1.35]} />
        <meshStandardMaterial
          color='#60a5fa'
          roughness={0.24}
          metalness={0.68}
          emissive='#0b2f5e'
          emissiveIntensity={0.2}
        />
      </mesh>

      <group ref={sensorGroup} position={[0, 0.45, 0]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.2, 24, 24]} />
          <meshStandardMaterial
            color='#22d3ee'
            emissive='#22d3ee'
            emissiveIntensity={1.6}
            roughness={0.12}
            metalness={0.4}
          />
        </mesh>
        <mesh position={[-0.34, 0.08, 0.38]}>
          <boxGeometry args={[0.16, 0.16, 0.16]} />
          <meshStandardMaterial
            color='#67e8f9'
            emissive='#67e8f9'
            emissiveIntensity={1.25}
          />
        </mesh>
        <mesh position={[0.38, -0.04, -0.31]}>
          <boxGeometry args={[0.14, 0.14, 0.14]} />
          <meshStandardMaterial
            color='#7dd3fc'
            emissive='#7dd3fc'
            emissiveIntensity={1.15}
          />
        </mesh>
      </group>

      <instancedMesh ref={frontWheels} args={[undefined, undefined, 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.2, 20]} />
        <meshStandardMaterial color='#0f172a' roughness={0.8} metalness={0.1} />
      </instancedMesh>

      <instancedMesh ref={rearWheels} args={[undefined, undefined, 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.2, 20]} />
        <meshStandardMaterial color='#0f172a' roughness={0.8} metalness={0.1} />
      </instancedMesh>
    </group>
  )
}

function RouteAndGround() {
  return (
    <>
      <mesh position={[0, -0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[42, 20]} />
        <meshStandardMaterial
          color='#030712'
          roughness={0.88}
          metalness={0.05}
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
    return () => {
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
      <ringGeometry args={[1.25, 2.15, 96]} />
      <primitive attach='material' object={haloMaterial} />
    </mesh>
  )
}

export default function CinematicRig() {
  const bloomIntensity = 0.26 + runtimeState.scroll * 0.34
  const transitionActive =
    runtimeState.transition.phase !== 'idle' ||
    runtimeState.transition.progress > 0.02
  const heavyScrollTransition =
    runtimeState.scroll > 0.1 && runtimeState.scroll < 0.92
  const fastThermalSwing = runtimeState.telemetry.temperatureC > 2.5
  const highDpr = runtimeState.viewport.dpr > 1.4
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

  const renderPostFx = () => {
    if (!shouldEnablePostFx) {
      return <></>
    }

    return (
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={0.31}
          luminanceSmoothing={0.4}
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
      <color attach='background' args={['#020617']} />
      <ambientLight intensity={0.54} />
      <directionalLight position={[5, 6, 3]} intensity={1.05} color='#bae6fd' />
      <pointLight position={[0, 1.2, 0]} intensity={1.85} color='#22d3ee' />
      <pointLight
        position={[4.8, 1.6, -2.6]}
        intensity={0.72}
        color='#2563eb'
      />

      <RouteAndGround />
      <TruckModel />
      <ColdFogParticles />
      <SelectionPulseHalo />

      {renderPostFx()}
    </>
  )
}
