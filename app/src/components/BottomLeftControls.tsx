import {
  ArrowCounterClockwise,
  GlobeSimple,
  Sphere,
  SpeakerHigh,
  SpeakerSlash,
  GlobeHemisphereEast,
  FadersHorizontalIcon,
} from '@phosphor-icons/react'
import { Tooltip } from '@radix-ui/themes'
import { type ReactElement, useEffect } from 'react'
import { useAudioStore } from '../store/audio'
import { useDebugStore } from '../store/debug'
import { ObjectRenderMode, ViewerQuality, WorldRenderMode } from '../types/world'

const OBJECT_MODES = [
  { mode: ObjectRenderMode.Wireframe, Icon: GlobeSimple, label: 'Wireframe' },
  { mode: ObjectRenderMode.ShadedWireframe, Icon: Sphere, label: 'Shaded Wireframe' },
  { mode: ObjectRenderMode.Lit, Icon: GlobeHemisphereEast, label: 'Lit' },
] as const

const QUALITY_MODES = [
  { mode: ViewerQuality.Low, label: 'Low' },
  { mode: ViewerQuality.Medium, label: 'Med' },
  { mode: ViewerQuality.High, label: 'High' },
] as const

const WORLD_MODES = [
  { mode: WorldRenderMode.Combined, label: 'All' },
  { mode: WorldRenderMode.SplatOnly, label: 'Scene' },
  { mode: WorldRenderMode.ObjectOnly, label: 'Objects' },
] as const

function nextMode<T>(items: readonly { mode: T }[], current: T) {
  const index = items.findIndex((item) => item.mode === current)
  return items[(index + 1) % items.length].mode
}

function ControlTooltip({ content, children }: { content: string; children: ReactElement }) {
  return (
    <Tooltip content={content} delayDuration={0} side="top">
      {children}
    </Tooltip>
  )
}

export function BottomLeftControls() {
  const muted = useAudioStore((s) => s.muted)
  const toggleMuted = useAudioStore((s) => s.toggleMuted)
  const resetObjects = useDebugStore((s) => s.resetObjects)
  const viewerQuality = useDebugStore((s) => s.viewerQuality)
  const setViewerQuality = useDebugStore((s) => s.setViewerQuality)
  const objectRenderMode = useDebugStore((s) => s.objectRenderMode)
  const setObjectRenderMode = useDebugStore((s) => s.setObjectRenderMode)
  const worldRenderMode = useDebugStore((s) => s.worldRenderMode)
  const setWorldRenderMode = useDebugStore((s) => s.setWorldRenderMode)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const n = e.key === '1' ? 0 : e.key === '2' ? 1 : e.key === '3' ? 2 : -1
      if (n === -1) return
      if (e.altKey && e.shiftKey) {
        const qualities = [ViewerQuality.Low, ViewerQuality.Medium, ViewerQuality.High]
        setViewerQuality(qualities[n])
      } else if (e.altKey) {
        const worlds = [WorldRenderMode.Combined, WorldRenderMode.SplatOnly, WorldRenderMode.ObjectOnly]
        setWorldRenderMode(worlds[n])
      } else if (e.shiftKey) {
        const objects = [ObjectRenderMode.Wireframe, ObjectRenderMode.ShadedWireframe, ObjectRenderMode.Lit]
        setObjectRenderMode(objects[n])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setObjectRenderMode, setWorldRenderMode, setViewerQuality])

  const utilBtn =
    'w-10 h-10 flex items-center justify-center rounded-xl text-white/60 hover:text-white hover:bg-white/12 transition-colors'

  const modeBtn = (active: boolean) =>
    `w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
      active ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/75 hover:bg-white/8'
    }`
  const pillBtn =
    'w-24 h-10 flex items-center justify-center gap-1.5 px-3 rounded-xl text-white/80 text-xs font-medium hover:text-white hover:bg-white/8 transition-colors'

  const currentQuality = QUALITY_MODES.find((item) => item.mode === viewerQuality) ?? QUALITY_MODES[0]
  const currentWorldMode = WORLD_MODES.find((item) => item.mode === worldRenderMode) ?? WORLD_MODES[0]

  return (
    <div className="flex items-center gap-1.5 px-3 py-2.5 rounded-3xl bg-black/55 backdrop-blur-md ring-1 ring-white/10">
      {/* utility */}
      <ControlTooltip content={muted ? 'Unmute' : 'Mute'}>
        <button onClick={toggleMuted} className={utilBtn}>
          {muted ? <SpeakerSlash size={18} weight="fill" /> : <SpeakerHigh size={18} weight="fill" />}
        </button>
      </ControlTooltip>
      <ControlTooltip content="Reset objects">
        <button onClick={resetObjects} className={utilBtn}>
          <ArrowCounterClockwise size={18} weight="bold" />
        </button>
      </ControlTooltip>

      <div className="w-px h-6 bg-white/15 mx-1" />

      {/* viewer quality */}
      <ControlTooltip content="Cycle quality">
        <button
          onClick={() => setViewerQuality(nextMode(QUALITY_MODES, viewerQuality))}
          className={pillBtn}
        >
          <FadersHorizontalIcon size={15} weight="regular" className="text-white/45 flex-shrink-0" />
          <span>{currentQuality.label}</span>
        </button>
      </ControlTooltip>

      <div className="w-px h-6 bg-white/15 mx-1" />

      {/* object render mode */}
      <div className="flex items-center gap-1 rounded-2xl bg-white/5 p-1">
        {OBJECT_MODES.map(({ mode, Icon, label }) => (
          <ControlTooltip key={mode} content={label}>
            <button
              onClick={() => setObjectRenderMode(mode)}
              className={modeBtn(objectRenderMode === mode)}
            >
              <Icon size={17} weight={objectRenderMode === mode ? 'fill' : 'regular'} />
            </button>
          </ControlTooltip>
        ))}
      </div>

      <div className="w-px h-6 bg-white/15 mx-1" />

      {/* world render mode */}
      <ControlTooltip content="Cycle world render mode">
        <button
          onClick={() => setWorldRenderMode(nextMode(WORLD_MODES, worldRenderMode))}
          className={pillBtn}
        >
          <GlobeSimple size={15} weight="regular" className="text-white/45 flex-shrink-0" />
          <span>{currentWorldMode.label}</span>
        </button>
      </ControlTooltip>
    </div>
  )
}
