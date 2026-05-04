import { Suspense, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { SplatRenderer, type SplatRendererHandle } from '../modules/splat/SplatRenderer'
import { EnvironmentMap, type EnvironmentMapHandle } from '../modules/environment/EnvironmentMap'
import { WorldCollider } from '../modules/collider/WorldCollider'
import { GroundPlane } from '../modules/collider/GroundPlane'
import { CharacterController, type CharacterControllerHandle } from '../modules/character/CharacterController'
import { FlyController, type FlyControllerHandle } from '../modules/character/FlyController'
import { ButterflyController, type ButterflyControllerHandle } from '../modules/butterfly/ButterflyController'
import { ObjectGrid } from '../modules/scene/ObjectGrid'
import { OriginHelper } from '../modules/scene/OriginHelper'
import { AudioManager } from '../modules/audio/AudioManager'
import { PostProcessing } from '../modules/postprocessing/PostProcessing'
import { getSplatUrl } from '../utils/worldLoader'
import { useDebugStore } from '../store/debug'
import { WorldRenderMode, ObjectRenderMode, ViewerQuality, type World, type WorldObjectAsset } from '../types/world'

const FADE_DURATION = 0.0
const FADE_SPEED = FADE_DURATION > 0 ? 1 / FADE_DURATION : Infinity

type CharHandle = CharacterControllerHandle | ButterflyControllerHandle | FlyControllerHandle

interface TransitionDriverProps {
  splatRef: React.RefObject<SplatRendererHandle | null>
  envRef: React.RefObject<EnvironmentMapHandle | null>
  charRef: React.RefObject<CharHandle | null>
  phaseRef: React.RefObject<'idle' | 'out' | 'in'>
  revealRef: React.RefObject<number>
  pendingWorld: React.RefObject<World | null>
  pendingSlug: React.RefObject<string | null>
  pendingObjectAssets: React.RefObject<WorldObjectAsset[] | null>
  pendingSourceImageUrl: React.RefObject<string | undefined>
  onSwap: (world: World, slug: string, objectAssets: WorldObjectAsset[], sourceImageUrl: string | undefined) => void
}

function TransitionDriver({
  splatRef,
  envRef,
  charRef,
  phaseRef,
  revealRef,
  pendingWorld,
  pendingSlug,
  pendingObjectAssets,
  pendingSourceImageUrl,
  onSwap,
}: TransitionDriverProps) {
  useFrame((_, delta) => {
    const splat = splatRef.current

    const apply = (amount: number) => {
      splat?.setReveal(amount)
      envRef.current?.setIntensity(amount)
    }

    if (phaseRef.current === 'out') {
      revealRef.current = Math.max(0, revealRef.current - delta * FADE_SPEED)
      apply(revealRef.current)
      if (revealRef.current <= 0 && pendingWorld.current && pendingSlug.current) {
        const w = pendingWorld.current
        const s = pendingSlug.current
        const objectAssets = pendingObjectAssets.current ?? []
        const sourceImageUrl = pendingSourceImageUrl.current
        pendingWorld.current = null
        pendingSlug.current = null
        pendingObjectAssets.current = null
        pendingSourceImageUrl.current = undefined
        charRef.current?.reset()
        onSwap(w, s, objectAssets, sourceImageUrl)
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
  objectAssets: WorldObjectAsset[]
  sourceImageUrl?: string
}

export function WorldViewer({ world: desiredWorld, slug: desiredSlug, objectAssets: desiredObjectAssets, sourceImageUrl: desiredSourceImageUrl }: Props) {
  const [activeWorld, setActiveWorld] = useState(desiredWorld)
  const [activeSlug, setActiveSlug] = useState(desiredSlug)
  const [activeObjectAssets, setActiveObjectAssets] = useState(desiredObjectAssets)
  const [activeSourceImageUrl, setActiveSourceImageUrl] = useState(desiredSourceImageUrl)

  const splatRef = useRef<SplatRendererHandle>(null)
  const envRef = useRef<EnvironmentMapHandle>(null)
  const charRef = useRef<CharHandle>(null)
  const worldRenderMode = useDebugStore((s) => s.worldRenderMode)
  const objectRenderMode = useDebugStore((s) => s.objectRenderMode)
  const viewerQuality = useDebugStore((s) => s.viewerQuality)
  const controllerMode = useDebugStore((s) => s.controllerMode)
  const environmentIntensity = useDebugStore((s) => s.environmentIntensity)
  const sunIntensity = useDebugStore((s) => s.sunIntensity)
  const sunColor = useDebugStore((s) => s.sunColor)
  const phaseRef = useRef<'idle' | 'out' | 'in'>('in')
  const revealRef = useRef(0)
  const pendingWorldRef = useRef<World | null>(null)
  const pendingSlugRef = useRef<string | null>(null)
  const pendingObjectAssetsRef = useRef<WorldObjectAsset[] | null>(null)
  const pendingSourceImageUrlRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (desiredSlug !== activeSlug) {
      pendingWorldRef.current = desiredWorld
      pendingSlugRef.current = desiredSlug
      pendingObjectAssetsRef.current = desiredObjectAssets
      pendingSourceImageUrlRef.current = desiredSourceImageUrl
      phaseRef.current = 'out'
    }
  }, [desiredSlug, desiredWorld, desiredObjectAssets, desiredSourceImageUrl, activeSlug])

  const splatUrl = getSplatUrl(activeWorld, viewerQuality)
  const { ground_plane_offset, flip_y, metric_scale_factor } = activeWorld.assets.splats.semantics_metadata
  const flipY = flip_y ?? true
  const isHighQuality = viewerQuality === ViewerQuality.High
  const showSplat = worldRenderMode !== WorldRenderMode.ObjectOnly
               && objectRenderMode !== ObjectRenderMode.Wireframe
  const showObjects = worldRenderMode !== WorldRenderMode.SplatOnly
  return (
    <>
      <AudioManager slug={activeSlug} active />
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 1000 }}
        className="w-full h-full"
        gl={{ antialias: false }}
        shadows={isHighQuality}
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
            pendingObjectAssets={pendingObjectAssetsRef}
            pendingSourceImageUrl={pendingSourceImageUrlRef}
            onSwap={(w, s, objectAssets, sourceImageUrl) => {
              setActiveWorld(w)
              setActiveSlug(s)
              setActiveObjectAssets(objectAssets)
              setActiveSourceImageUrl(sourceImageUrl)
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
            <Suspense fallback={null}>
              <WorldCollider url={activeWorld.assets.mesh.collider_mesh_url} flipY={flipY} groundPlaneOffset={ground_plane_offset} metricScaleFactor={metric_scale_factor} />
            </Suspense>
            {showObjects && (
              <Suspense fallback={null}>
                <ObjectGrid objects={activeObjectAssets} />
              </Suspense>
            )}
            <GroundPlane />
          </Physics>
          {showSplat && splatUrl && (
            <SplatRenderer ref={splatRef} url={splatUrl} groundPlaneOffset={ground_plane_offset} flipY={flipY} metricScaleFactor={metric_scale_factor} />
          )}
          <directionalLight
            castShadow={isHighQuality}
            color={sunColor}
            intensity={sunIntensity}
            position={[0, 10, 0]}
            shadow-mapSize={[2048, 2048]}
            shadow-camera-near={0.5}
            shadow-camera-far={60}
            shadow-camera-left={-20}
            shadow-camera-right={20}
            shadow-camera-top={20}
            shadow-camera-bottom={-20}
          />
          <Suspense fallback={null}>
            <EnvironmentMap ref={envRef} panoUrl={activeWorld.assets.imagery.pano_url} intensity={environmentIntensity} />
          </Suspense>
          <OriginHelper />
          {isHighQuality && <PostProcessing />}
        </Suspense>
      </Canvas>
      {activeSourceImageUrl && (
        <img
          src={activeSourceImageUrl}
          className="absolute top-4 left-4 w-36 rounded-lg opacity-75 pointer-events-none shadow-lg"
          alt="World source"
        />
      )}
    </>
  )
}
