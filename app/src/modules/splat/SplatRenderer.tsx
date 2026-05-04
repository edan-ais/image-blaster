import { useMemo, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import { extend, useThree, useFrame } from '@react-three/fiber'
import { SplatMesh, SparkRenderer, dyno } from '@sparkjsdev/spark'
import { useDebugStore } from '../../store/debug'
import { ViewerQuality } from '../../types/world'

// Patch Spark's default vertex shader to swap the linear thin-lens CoC formula
// for a configurable curve: zero blur within `sharpRange` of the focal plane,
// then exponential growth at `falloffRate` per world unit beyond it. The
// existing `apertureAngle` uniform stays as the overall blur strength.
const ORIGINAL_FOCUS_BLUR =
  'float focusBlur = abs((-viewCenter.z - focalDistance) / viewCenter.z);'
const CUSTOM_FOCUS_BLUR = `float dist = -viewCenter.z;
            float diff = abs(dist - focalDistance);
            float beyond = max(0.0, diff - sharpRange);
            float focusBlur = exp(beyond * falloffRate) - 1.0;`
const APERTURE_DECL = 'uniform float apertureAngle;'
const APERTURE_DECL_PLUS = `uniform float apertureAngle;
uniform float sharpRange;
uniform float falloffRate;`

const SparkRendererEl = extend(SparkRenderer)
const SplatMeshEl = extend(SplatMesh)

// Vertical fade window as a fraction of the reveal timeline.
// 1.0 means the bottom-most splat finishes fading exactly as the top-most starts;
// values <1 give more overlap, >1 give a sharper top-to-bottom sweep.
const FADE_WINDOW = 0.6

export interface SplatRendererHandle {
  setReveal: (amount: number) => void
}

interface Props {
  url: string
  groundPlaneOffset?: number
  flipY?: boolean
  metricScaleFactor?: number
}

function makeRevealModifier() {
  const revealFloat = dyno.dynoFloat(1)
  const yMinFloat = dyno.dynoFloat(-1)
  const yMaxFloat = dyno.dynoFloat(1)
  const windowFloat = dyno.dynoFloat(FADE_WINDOW)
  const modifierDyno = dyno.dyno({
    inTypes: {
      gsplat: dyno.Gsplat,
      reveal: 'float' as const,
      yMin: 'float' as const,
      yMax: 'float' as const,
      win: 'float' as const,
    },
    outTypes: { gsplat: dyno.Gsplat },
    inputs: { reveal: revealFloat, yMin: yMinFloat, yMax: yMaxFloat, win: windowFloat },
    statements: ({ inputs, outputs }) => [
      `${outputs.gsplat} = ${inputs.gsplat};`,
      // Local center.y maps to world via a Math.PI X-rotation in the parent group,
      // so larger local Y = lower in world. We want lower-world splats to fade in
      // first, i.e. high-local-Y first. n=0 at low local-Y (top of world),
      // n=1 at high local-Y (bottom of world).
      `float yRange = max(1e-4, ${inputs.yMax} - ${inputs.yMin});`,
      `float n = clamp((${inputs.gsplat}.center.y - ${inputs.yMin}) / yRange, 0.0, 1.0);`,
      `float scaledReveal = ${inputs.reveal} * (1.0 + ${inputs.win});`,
      `float threshold = (1.0 - n) * ${inputs.win};`,
      `float a = clamp(scaledReveal - threshold, 0.0, 1.0);`,
      `${outputs.gsplat}.rgba.a *= a;`,
    ],
  })
  const modifier = dyno.dynoBlock(
    { gsplat: dyno.Gsplat },
    { gsplat: dyno.Gsplat },
    ({ gsplat }) => ({ gsplat: modifierDyno.apply({ gsplat }).gsplat }),
  )
  return { revealFloat, yMinFloat, yMaxFloat, modifier }
}


export const SplatRenderer = forwardRef<SplatRendererHandle, Props>(
  ({ url, groundPlaneOffset = 0, flipY, metricScaleFactor = 1 }, ref) => {
    const renderer = useThree((state) => state.gl)
    const splatRef = useRef<SplatMesh>(null)
    const sparkRef = useRef<SparkRenderer>(null)
    
    const { revealFloat, yMinFloat, yMaxFloat, modifier } = useRef(makeRevealModifier()).current

    // Patch the SparkRenderer's vertex shader once to add our custom CoC curve
    // and inject `sharpRange` / `falloffRate` uniforms.
    useEffect(() => {
      const spark = sparkRef.current
      if (!spark) return
      const mat = spark.material
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = mat.uniforms as any
      if (!u.sharpRange) u.sharpRange = { value: 2 }
      if (!u.falloffRate) u.falloffRate = { value: 0.3 }
      if (!mat.vertexShader.includes('uniform float sharpRange;')) {
        mat.vertexShader = mat.vertexShader
          .replace(APERTURE_DECL, APERTURE_DECL_PLUS)
          .replace(ORIGINAL_FOCUS_BLUR, CUSTOM_FOCUS_BLUR)
        mat.needsUpdate = true
      }
    }, [])

    useFrame(() => {
      const spark = sparkRef.current
      if (!spark) return
      const s = useDebugStore.getState()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const u = spark.material.uniforms as any
      if (s.viewerQuality === ViewerQuality.High && s.dofEnabled) {
        spark.focalDistance = s.focalDistance
        spark.apertureAngle = s.apertureAngle
        spark.falloff = s.falloff
        if (u.sharpRange) u.sharpRange.value = s.sharpRange
        if (u.falloffRate) u.falloffRate.value = s.falloffRate
      } else {
        spark.focalDistance = 0
        spark.apertureAngle = 0
        spark.falloff = 1
      }
    })

    useImperativeHandle(ref, () => ({
      setReveal: (amount: number) => {
        revealFloat.value = amount
        splatRef.current?.updateVersion()
      },
    }))

    const sparkArgs = useMemo(() => ({ renderer }), [renderer]) //, maxPixelRadius: 1 
    const splatArgs = useMemo(
      () => ({
        url,
        objectModifier: modifier,
        onLoad: (mesh: SplatMesh) => {
          const box = mesh.getBoundingBox(true)
          if (box.isEmpty()) return
          yMinFloat.value = box.min.y
          yMaxFloat.value = box.max.y
          mesh.updateVersion()
        },
      }),
      // modifier/yMin/yMax are stable — only url triggers a new SplatMesh
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [url],
    )

    return (
      <SparkRendererEl ref={sparkRef} args={[sparkArgs]}>
        <group position={[0, groundPlaneOffset, 0]} rotation={[flipY ? Math.PI : 0, 0, 0]} scale={metricScaleFactor}>
          <SplatMeshEl ref={splatRef} args={[splatArgs]} />
        </group>
      </SparkRendererEl>
    )
  },
)
