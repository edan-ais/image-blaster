import { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'
import { SplatRenderer, type SplatRendererHandle } from '../modules/splat/SplatRenderer'
import { EnvironmentMap, type EnvironmentMapHandle } from '../modules/environment/EnvironmentMap'
import { WorldCollider } from '../modules/collider/WorldCollider'
import { CharacterController, type CharacterControllerHandle } from '../modules/character/CharacterController'
import { FlyController, type FlyControllerHandle } from '../modules/character/FlyController'
import { ButterflyController, type ButterflyControllerHandle } from '../modules/butterfly/ButterflyController'
import { SceneLoader } from '../modules/scene/SceneLoader'
import { AudioManager } from '../modules/audio/AudioManager'
import { PostProcessing } from '../modules/postprocessing/PostProcessing'
import { getSplatUrl } from '../utils/worldLoader'
import { useDebugStore } from '../store/debug'
import type { World } from '../types/world'

const FADE_DURATION = 0.0
const FADE_SPEED = FADE_DURATION > 0 ? 1 / FADE_DURATION : Infinity

function SanityFloor() {
  const showColliders = useDebugStore((s) => s.showColliders)
  return (
    <RigidBody type="fixed" position={[0, -5, 0]}>
      <CuboidCollider args={[50, 5, 50]} />
      {showColliders && (
        <mesh>
          <boxGeometry args={[100, 10, 100]} />
          <meshBasicMaterial color={0x0000ff} wireframe />
        </mesh>
      )}
    </RigidBody>
  )
}

type CharHandle = CharacterControllerHandle | ButterflyControllerHandle | FlyControllerHandle

interface TransitionDriverProps {
  splatRef: React.RefObject<SplatRendererHandle | null>
  envRef: React.RefObject<EnvironmentMapHandle | null>
  charRef: React.RefObject<CharHandle | null>
  phaseRef: React.RefObject<'idle' | 'out' | 'in'>
  revealRef: React.RefObject<number>
  pendingWorld: React.RefObject<World | null>
  pendingSlug: React.RefObject<string | null>
  onSwap: (world: World, slug: string) => void
}

function TransitionDriver({
  splatRef,
  envRef,
  charRef,
  phaseRef,
  revealRef,
  pendingWorld,
  pendingSlug,
  onSwap,
}: TransitionDriverProps) {
  useFrame((_, delta) => {
    const splat = splatRef.current
    if (!splat) return

    const apply = (amount: number) => {
      splat.setReveal(amount)
      envRef.current?.setIntensity(amount)
    }

    if (phaseRef.current === 'out') {
      revealRef.current = Math.max(0, revealRef.current - delta * FADE_SPEED)
      apply(revealRef.current)
      if (revealRef.current <= 0 && pendingWorld.current && pendingSlug.current) {
        const w = pendingWorld.current
        const s = pendingSlug.current
        pendingWorld.current = null
        pendingSlug.current = null
        charRef.current?.reset()
        onSwap(w, s)
        phaseRef.current = 'in'
      }
    } else if (phaseRef.current === 'in') {
      revealRef.current = Math.min(1, revealRef.current + delta * FADE_SPEED)
      apply(revealRef.current)
      if (revealRef.current >= 1) phaseRef.current = 'idle'
    }
  })

  return null
}

interface Props {
  world: World
  slug: string
}

export function WorldViewer({ world: desiredWorld, slug: desiredSlug }: Props) {
  const [activeWorld, setActiveWorld] = useState(desiredWorld)
  const [activeSlug, setActiveSlug] = useState(desiredSlug)

  const splatRef = useRef<SplatRendererHandle>(null)
  const envRef = useRef<EnvironmentMapHandle>(null)
  const charRef = useRef<CharHandle>(null)
  const controllerMode = useDebugStore((s) => s.controllerMode)
  const phaseRef = useRef<'idle' | 'out' | 'in'>('in')
  const revealRef = useRef(0)
  const pendingWorldRef = useRef<World | null>(null)
  const pendingSlugRef = useRef<string | null>(null)

  useEffect(() => {
    if (desiredSlug !== activeSlug) {
      pendingWorldRef.current = desiredWorld
      pendingSlugRef.current = desiredSlug
      phaseRef.current = 'out'
    }
  }, [desiredSlug, desiredWorld, activeSlug])

  const splatUrl = getSplatUrl(activeWorld)
  const { ground_plane_offset, flip_y, metric_scale_factor } = activeWorld.assets.splats.semantics_metadata
  const flipY = flip_y ?? true
  return (
    <>
      <AudioManager slug={activeSlug} active />
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 1000 }}
        className="w-full h-full"
        gl={{ antialias: false }}
      >
        <Suspense fallback={null}>
          <TransitionDriver
            splatRef={splatRef}
            envRef={envRef}
            charRef={charRef}
            phaseRef={phaseRef}
            revealRef={revealRef}
            pendingWorld={pendingWorldRef}
            pendingSlug={pendingSlugRef}
            onSwap={(w, s) => {
              setActiveWorld(w)
              setActiveSlug(s)
            }}
          />
          <Physics gravity={[0, -9.81, 0]}>
            {controllerMode === 'butterfly' ? (
              <ButterflyController ref={charRef as React.RefObject<ButterflyControllerHandle>} />
            ) : controllerMode === 'fly' ? (
              <FlyController ref={charRef as React.RefObject<FlyControllerHandle>} />
            ) : (
              <CharacterController ref={charRef as React.RefObject<CharacterControllerHandle>} />
            )}
            {/* Per-asset Suspense boundary: loading a new world's collider
                must not unmount the rest of the scene (physics, character,
                splat, env). Each suspending loader gets its own boundary so
                only that subtree blanks while it streams in. */}
            <Suspense fallback={null}>
              <WorldCollider url={activeWorld.assets.mesh.collider_mesh_url} flipY={flipY} />
            </Suspense>
            <SanityFloor />
          </Physics>
          <SplatRenderer ref={splatRef} url={splatUrl} groundPlaneOffset={ground_plane_offset} flipY={flipY} metricScaleFactor={metric_scale_factor} />
          <Suspense fallback={null}>
            <EnvironmentMap ref={envRef} panoUrl={activeWorld.assets.imagery.pano_url} />
          </Suspense>
          <Suspense fallback={null}>
            <SceneLoader slug={activeSlug} />
          </Suspense>
          <PostProcessing />
        </Suspense>
      </Canvas>
    </>
  )
}
