import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { ThreeEvent, useLoader } from '@react-three/fiber'
import { PositionalAudio } from '@react-three/drei'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js'
import { ObjectRenderMode, type WorldObjectAsset } from '../../types/world'
import { useAudioStore } from '../../store/audio'
import { useAssetMaterials, SHADED_COLOR, HOVER_DIM_FACTOR } from './useAssetMaterials'

export const OBJECT_SCALE = 0.5

const COLLIDER_WIREFRAME_COLOR = 0x00aaff

type PointerHandler = (event: ThreeEvent<PointerEvent>) => void
type HoverHandler = (objectId: string, hovering: boolean) => void
type ClickHandler = (worldPos: THREE.Vector3) => void

const ignoreRaycast: THREE.Object3D['raycast'] = () => {}

export interface SceneObjectHandle {
  id: string
  rigidBody: RapierRigidBody | null
  initialPosition: THREE.Vector3
  initialRotation: THREE.Quaternion
  bounds: THREE.Box3
  getFocusPoint: (target: THREE.Vector3) => THREE.Vector3
}

interface Props {
  object: WorldObjectAsset
  position: [number, number, number]
  renderMode: ObjectRenderMode
  isHovered: boolean
  onHover: HoverHandler
  onClick?: ClickHandler
  onPointerDown?: PointerHandler
  onPointerMove?: PointerHandler
  onPointerUp?: PointerHandler
  onPointerCancel?: PointerHandler
}

interface MeshMaterialState {
  mesh: THREE.Mesh
  litMaterials: THREE.Material | THREE.Material[]
  colorEntries: Array<{ material: THREE.Material & { color: THREE.Color }; baseColor: THREE.Color }>
}

function cloneMaterial(material: THREE.Material | THREE.Material[]): THREE.Material | THREE.Material[] {
  if (Array.isArray(material)) return material.map((m) => m.clone())
  return material.clone()
}

function asMaterialArray(material: THREE.Material | THREE.Material[]) {
  return Array.isArray(material) ? material : [material]
}

function hasColor(material: THREE.Material): material is THREE.Material & { color: THREE.Color } {
  return 'color' in material && material.color instanceof THREE.Color
}

export const SceneObject = forwardRef<SceneObjectHandle, Props>(function SceneObject(
  {
    object,
    position,
    renderMode,
    isHovered,
    onHover,
    onClick,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  },
  ref,
) {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  const colliderProxyRef = useRef<THREE.Mesh>(null)
  const sfxRefs = useRef<Array<THREE.PositionalAudio | null>>([])
  const lastSfxIndexRef = useRef<number | null>(null)
  const muted = useAudioStore((s) => s.muted)
  const gltf = useLoader(GLTFLoader, object.url)
  const initialPosition = useMemo(() => new THREE.Vector3(...position), [position])
  const initialRotation = useMemo(() => new THREE.Quaternion(), [])

  const { wireframeMaterial, shadedMaterial, wireframeOverlayMaterial } = useAssetMaterials()

  const {
    scene,
    wireframeOverlayScene,
    offset,
    bounds,
    colliderCenter,
    colliderHalfExtents,
    materialStates,
    colliderWireframeMaterial,
  } = useMemo(() => {
    const clonedScene = cloneSkeleton(gltf.scene)
    const overlayScene = cloneSkeleton(gltf.scene)
    const states: MeshMaterialState[] = []

    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return

      child.castShadow = true
      child.raycast = ignoreRaycast
      const litMaterials = cloneMaterial(child.material)
      child.material = litMaterials
      const colorEntries = asMaterialArray(litMaterials)
        .filter(hasColor)
        .map((material) => ({
          material,
          baseColor: material.color.clone(),
        }))

      states.push({ mesh: child, litMaterials, colorEntries })
    })

    const box = new THREE.Box3().setFromObject(clonedScene)
    const center = new THREE.Vector3()
    const size = new THREE.Vector3()
    box.getCenter(center)
    box.getSize(size)

    return {
      scene: clonedScene,
      wireframeOverlayScene: overlayScene,
      offset: new THREE.Vector3(-center.x, -box.min.y, -center.z),
      bounds: box.clone(),
      colliderCenter: new THREE.Vector3(0, (size.y * OBJECT_SCALE) / 2, 0),
      colliderHalfExtents: new THREE.Vector3(
        Math.max((size.x * OBJECT_SCALE) / 2, 0.01),
        Math.max((size.y * OBJECT_SCALE) / 2, 0.01),
        Math.max((size.z * OBJECT_SCALE) / 2, 0.01),
      ),
      materialStates: states,
      colliderWireframeMaterial: new THREE.MeshBasicMaterial({
        color: COLLIDER_WIREFRAME_COLOR,
        wireframe: true,
        transparent: true,
        toneMapped: false,
        fog: false,
      }),
    }
  }, [gltf.scene])

  useEffect(() => {
    wireframeOverlayScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.material = wireframeOverlayMaterial
      child.renderOrder = 1
      child.raycast = ignoreRaycast
    })
  }, [wireframeOverlayScene, wireframeOverlayMaterial])

  useEffect(() => {
    if (renderMode === ObjectRenderMode.ShadedWireframe) {
      shadedMaterial.color.copy(SHADED_COLOR)
      if (isHovered) shadedMaterial.color.multiplyScalar(HOVER_DIM_FACTOR)
    }

    for (const state of materialStates) {
      if (renderMode === ObjectRenderMode.Wireframe) {
        state.mesh.material = wireframeMaterial
        continue
      }

      if (renderMode === ObjectRenderMode.ShadedWireframe) {
        state.mesh.material = shadedMaterial
        continue
      }

      state.mesh.material = state.litMaterials
      for (const { material, baseColor } of state.colorEntries) {
        material.color.copy(baseColor)
        if (isHovered) material.color.multiplyScalar(HOVER_DIM_FACTOR)
      }
    }
  }, [isHovered, materialStates, renderMode, wireframeMaterial, shadedMaterial])

  useEffect(() => {
    colliderWireframeMaterial.opacity = renderMode === ObjectRenderMode.Lit ? 0 : 1
    colliderWireframeMaterial.depthWrite = renderMode !== ObjectRenderMode.Lit
    colliderWireframeMaterial.needsUpdate = true
  }, [colliderWireframeMaterial, renderMode])

  useEffect(() => {
    sfxRefs.current.length = object.sfxUrls.length
  }, [object.sfxUrls.length])

  const playRandomSfx = useCallback(() => {
    if (muted || object.sfxUrls.length === 0) return

    const lastIndex = lastSfxIndexRef.current
    let nextIndex = 0
    if (object.sfxUrls.length > 1) {
      nextIndex = Math.floor(Math.random() * (object.sfxUrls.length - 1))
      if (lastIndex !== null && nextIndex >= lastIndex) nextIndex += 1
    }

    const sound = sfxRefs.current[nextIndex]
    if (!sound) return

    lastSfxIndexRef.current = nextIndex
    sound.setVolume(1)
    if (sound.isPlaying) sound.stop()

    const play = () => sound.play()
    if (sound.context.state === 'suspended') {
      sound.context.resume().then(play).catch(() => {})
      return
    }
    play()
  }, [muted, object.sfxUrls.length])

  useEffect(() => {
    return () => {
      colliderWireframeMaterial.dispose()
      for (const state of materialStates) {
        for (const material of asMaterialArray(state.litMaterials)) {
          material.dispose()
        }
      }
    }
  }, [colliderWireframeMaterial, materialStates])

  useImperativeHandle(
    ref,
    () => ({
      id: object.id,
      rigidBody: rigidBodyRef.current,
      initialPosition,
      initialRotation,
      bounds,
      getFocusPoint: (target) => {
        if (colliderProxyRef.current) return colliderProxyRef.current.getWorldPosition(target)
        return target.copy(initialPosition).add(colliderCenter)
      },
    }),
    [bounds, colliderCenter, initialPosition, initialRotation, object.id],
  )

  return (
    <RigidBody
      ref={rigidBodyRef}
      type="dynamic"
      colliders={false}
      position={position}
      linearDamping={0.45}
      angularDamping={0.35}
      additionalSolverIterations={4}
      ccd
      canSleep
    >
      <CuboidCollider
        args={[colliderHalfExtents.x, colliderHalfExtents.y, colliderHalfExtents.z]}
        position={[colliderCenter.x, colliderCenter.y, colliderCenter.z]}
      />
      <mesh
        ref={colliderProxyRef}
        position={[colliderCenter.x, colliderCenter.y, colliderCenter.z]}
        material={colliderWireframeMaterial}
        onPointerOver={(event) => {
          event.stopPropagation()
          onHover(object.id, true)
        }}
        onPointerOut={(event) => {
          event.stopPropagation()
          onHover(object.id, false)
        }}
        onClick={(event) => {
          event.stopPropagation()
          onClick?.(event.point.clone())
        }}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.stopPropagation()
          playRandomSfx()
          onPointerDown?.(event)
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <boxGeometry args={[colliderHalfExtents.x * 2, colliderHalfExtents.y * 2, colliderHalfExtents.z * 2]} />
      </mesh>
      <group scale={OBJECT_SCALE}>
        <primitive object={scene} position={offset} dispose={null} />
        {renderMode === ObjectRenderMode.ShadedWireframe && (
          <primitive object={wireframeOverlayScene} position={offset} dispose={null} />
        )}
        {object.sfxUrls.map((url, index) => (
          <PositionalAudio
            key={url}
            ref={(audio) => {
              sfxRefs.current[index] = audio
            }}
            url={url}
            distance={2}
            loop={false}
          />
        ))}
      </group>
    </RigidBody>
  )
})
