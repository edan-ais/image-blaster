import { useEffect, useMemo, type ReactElement } from 'react'
import { EffectComposer } from '@react-three/postprocessing'
import { BlendFunction, BloomEffect, ChromaticAberrationEffect } from 'postprocessing'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MotionBlurEffect } from './MotionBlurEffect'
import { useDebugStore } from '../../store/debug'

const _prevQuat = new THREE.Quaternion()
const _delta = new THREE.Quaternion()

// Why we instantiate effects directly instead of using <Bloom>/<ChromaticAberration>:
// @react-three/postprocessing's wrapEffect uses `useMemo(..., [JSON.stringify(a)])`
// where `a` is the rest-spread of props. In React 19, `ref` is a regular prop, so
// once the ref populates with the effect instance, JSON.stringify recurses through
// the BloomEffect's render targets/textures and hits circular parent/children refs.
// Mounting effects via <primitive> bypasses that path entirely.
export function PostProcessing() {
  const { camera } = useThree()
  const bloomEnabled = useDebugStore((s) => s.bloomEnabled)
  const chromaticEnabled = useDebugStore((s) => s.chromaticEnabled)
  const motionBlurEnabled = useDebugStore((s) => s.motionBlurEnabled)

  const bloomEffect = useMemo(() => {
    const initial = useDebugStore.getState()
    return new BloomEffect({
      intensity: initial.bloomIntensity,
      luminanceThreshold: initial.bloomThreshold,
      luminanceSmoothing: 0.9,
      blendFunction: BlendFunction.ADD,
      mipmapBlur: true,
    })
  }, [])

  const chromaEffect = useMemo(() => {
    const initial = useDebugStore.getState()
    return new ChromaticAberrationEffect({
      offset: new THREE.Vector2(initial.chromaticOffset, initial.chromaticOffset),
      radialModulation: false,
      modulationOffset: 0,
      blendFunction: BlendFunction.NORMAL,
    })
  }, [])

  const blurEffect = useMemo(() => new MotionBlurEffect(), [])

  useEffect(() => {
    _prevQuat.copy(camera.quaternion)
  }, [camera])

  useEffect(() => {
    return () => {
      bloomEffect.dispose()
      chromaEffect.dispose()
      blurEffect.dispose()
    }
  }, [bloomEffect, chromaEffect, blurEffect])

  useFrame(() => {
    const s = useDebugStore.getState()

    const intensityUniform = bloomEffect.uniforms.get('intensity')
    if (intensityUniform) intensityUniform.value = s.bloomIntensity
    bloomEffect.luminanceMaterial.threshold = s.bloomThreshold

    chromaEffect.offset.set(s.chromaticOffset, s.chromaticOffset)

    _delta.copy(_prevQuat).invert().multiply(camera.quaternion)
    const angle = 2 * Math.acos(Math.min(1, Math.abs(_delta.w)))
    const strength = Math.min(angle * s.motionBlurStrength * 8, 1)
    blurEffect.setVelocity(_delta.x * 0.5, _delta.y * 0.5, strength)
    _prevQuat.copy(camera.quaternion)
  })

  // EffectComposer's children type doesn't accept null, so build an array.
  const effects: ReactElement[] = []
  if (bloomEnabled) effects.push(<primitive key="bloom" object={bloomEffect} />)
  if (chromaticEnabled) effects.push(<primitive key="chroma" object={chromaEffect} />)
  if (motionBlurEnabled) effects.push(<primitive key="blur" object={blurEffect} />)

  // EffectComposer needs at least one effect; if everything is off, skip it
  // entirely so the scene renders straight through.
  if (effects.length === 0) return null

  return <EffectComposer>{effects}</EffectComposer>
}
