import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ControllerMode = 'fly' | 'fps' | 'butterfly'

interface DebugStore {
  showColliders: boolean
  setShowColliders: (v: boolean) => void
  controllerMode: ControllerMode
  setControllerMode: (v: ControllerMode) => void
  // Splat depth-of-field (Spark 2.0 built-in DoF + circle-bokeh via flat falloff)
  dofEnabled: boolean
  setDofEnabled: (v: boolean) => void
  focalDistance: number
  setFocalDistance: (v: number) => void
  apertureAngle: number
  setApertureAngle: (v: number) => void
  falloff: number
  setFalloff: (v: number) => void
  // Custom DoF curve: 0 within sharpRange of focal plane, exp growth beyond.
  sharpRange: number
  setSharpRange: (v: number) => void
  falloffRate: number
  setFalloffRate: (v: number) => void
  // Post-processing
  bloomEnabled: boolean
  setBloomEnabled: (v: boolean) => void
  bloomIntensity: number
  setBloomIntensity: (v: number) => void
  bloomThreshold: number
  setBloomThreshold: (v: number) => void
  chromaticEnabled: boolean
  setChromaticEnabled: (v: boolean) => void
  chromaticOffset: number
  setChromaticOffset: (v: number) => void
  motionBlurEnabled: boolean
  setMotionBlurEnabled: (v: boolean) => void
  motionBlurStrength: number
  setMotionBlurStrength: (v: number) => void
}

export const useDebugStore = create<DebugStore>()(
  persist(
    (set) => ({
      showColliders: false,
      setShowColliders: (showColliders) => set({ showColliders }),
      controllerMode: 'fps',
      setControllerMode: (controllerMode) => set({ controllerMode }),
      dofEnabled: true,
      setDofEnabled: (dofEnabled) => set({ dofEnabled }),
      focalDistance: 10,
      setFocalDistance: (focalDistance) => set({ focalDistance }),
      apertureAngle: 0.05,
      setApertureAngle: (apertureAngle) => set({ apertureAngle }),
      falloff: 1,
      setFalloff: (falloff) => set({ falloff }),
      sharpRange: 2.5,
      setSharpRange: (sharpRange) => set({ sharpRange }),
      falloffRate: 0.01,
      setFalloffRate: (falloffRate) => set({ falloffRate }),
      bloomEnabled: true,
      setBloomEnabled: (bloomEnabled) => set({ bloomEnabled }),
      bloomIntensity: 0.4,
      setBloomIntensity: (bloomIntensity) => set({ bloomIntensity }),
      bloomThreshold: 0.85,
      setBloomThreshold: (bloomThreshold) => set({ bloomThreshold }),
      chromaticEnabled: true,
      setChromaticEnabled: (chromaticEnabled) => set({ chromaticEnabled }),
      chromaticOffset: 0.0008,
      setChromaticOffset: (chromaticOffset) => set({ chromaticOffset }),
      motionBlurEnabled: true,
      setMotionBlurEnabled: (motionBlurEnabled) => set({ motionBlurEnabled }),
      motionBlurStrength: 0.3,
      setMotionBlurStrength: (motionBlurStrength) => set({ motionBlurStrength }),
    }),
    {
      name: 'compendium-debug',
      version: 5,
      // Only persist things you'd want sticky across reloads. DoF and Post FX
      // values are always meant to start fresh from the defaults declared above.
      partialize: (s) => ({
        showColliders: s.showColliders,
        controllerMode: s.controllerMode,
      }),
    },
  ),
)
