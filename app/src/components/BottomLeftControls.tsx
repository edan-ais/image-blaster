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
    'w-7 h-7 flex items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/10 transition-colors'

  const modeBtn = (active: boolean) =>
    `w-7 h-7 flex items-center justify-center rounded-md transition-colors ${
      active ? 'bg-white/15 text-white' : 'text-white/45 hover:text-white/75 hover:bg-white/8'
    }`

  return (
    <div className="flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-black/55 backdrop-blur-md ring-1 ring-white/10">
      {/* utility */}
      <ControlTooltip content={muted ? 'Unmute' : 'Mute'}>
        <button onClick={toggleMuted} className={utilBtn}>
          {muted ? <SpeakerSlash size={16} weight="fill" /> : <SpeakerHigh size={16} weight="fill" />}
        </button>
      </ControlTooltip>
      <ControlTooltip content="Reset objects">
        <button onClick={resetObjects} className={utilBtn}>
          <ArrowCounterClockwise size={16} weight="bold" />
        </button>
      </ControlTooltip>

      <div className="w-px h-4 bg-white/15 mx-0.5" />

      {/* viewer quality */}
      <ControlTooltip content="Quality">
        <div className="relative flex items-center gap-1 px-1.5">
          <FadersHorizontalIcon size={13} weight="regular" className="text-white/45 flex-shrink-0" />
          <select
            value={viewerQuality}
            onChange={(e) => setViewerQuality(e.target.value as ViewerQuality)}
            className="bg-transparent text-white/80 text-[11px] font-medium border-none outline-none cursor-pointer appearance-none pr-3"
          >
            <option value={ViewerQuality.Low}>Low</option>
            <option value={ViewerQuality.Medium}>Med</option>
            <option value={ViewerQuality.High}>High</option>
          </select>
        </div>
      </ControlTooltip>

      <div className="w-px h-4 bg-white/15 mx-0.5" />

      {/* object render mode */}
      <div className="flex items-center gap-0.5 rounded-xl bg-white/5 px-0.5 py-0.5">
        {OBJECT_MODES.map(({ mode, Icon, label }) => (
          <ControlTooltip key={mode} content={label}>
            <button
              onClick={() => setObjectRenderMode(mode)}
              className={modeBtn(objectRenderMode === mode)}
            >
              <Icon size={15} weight={objectRenderMode === mode ? 'fill' : 'regular'} />
            </button>
          </ControlTooltip>
        ))}
      </div>

      <div className="w-px h-4 bg-white/15 mx-0.5" />

      {/* world render mode */}
      <ControlTooltip content="World render mode">
        <div className="relative flex items-center gap-1 px-1.5">
          <GlobeSimple size={13} weight="regular" className="text-white/45 flex-shrink-0" />
          <select
            value={worldRenderMode}
            onChange={(e) => setWorldRenderMode(e.target.value as WorldRenderMode)}
            className="bg-transparent text-white/80 text-[11px] font-medium border-none outline-none cursor-pointer appearance-none pr-3"
          >
            <option value={WorldRenderMode.Combined}>All</option>
            <option value={WorldRenderMode.SplatOnly}>Scene</option>
            <option value={WorldRenderMode.ObjectOnly}>Objects</option>
          </select>
        </div>
      </ControlTooltip>
    </div>
  )
}
