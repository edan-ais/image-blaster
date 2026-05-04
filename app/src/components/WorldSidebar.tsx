import { useLocation } from 'wouter'
import type { WorldEntry } from '../types/world'
import { pendingFocusId } from '../modules/camera/cameraFocus'

interface Props {
  worlds: WorldEntry[]
  activeSlug: string
}

export function WorldSidebar({ worlds, activeSlug }: Props) {
  const [, navigate] = useLocation()

  return (
    <aside className="w-44 sm:w-52 max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden rounded-2xl bg-black/55 backdrop-blur-md ring-1 ring-white/10">
      <div className="px-3 py-2.5 text-[14px] text-white/40 border-white/10 flex-shrink-0">
        image-blaster
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto p-1.5">
        {worlds.map(({ slug, world, objectAssets }) => {
          const isActive = slug === activeSlug
          const name = world.display_name || slug
          return (
            <div key={slug}>
              <button
                onClick={() => navigate(`/${slug}`)}
                className={`
                  w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-left
                  transition-colors duration-150
                  ${isActive ? 'bg-white/15' : 'hover:bg-white/8'}
                `}
              >
                <img
                  src={world.assets.thumbnail_url}
                  alt={name}
                  className="w-9 h-9 rounded-md object-cover flex-shrink-0"
                />
                <span className="text-white text-xs font-medium leading-tight truncate flex-1">{name}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                )}
              </button>

              {/* expandable object list */}
              <div
                className={`
                  overflow-hidden transition-all duration-300 ease-in-out
                  ${isActive && objectAssets.length > 0 ? 'max-h-96' : 'max-h-0'}
                `}
              >
                <div className="flex flex-col gap-0.5 pt-1">
                  {objectAssets.map((obj) => (
                    <button
                      key={obj.id}
                      onClick={() => { pendingFocusId.current = obj.id }}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/8 transition-colors text-left group"
                    >
                      {obj.thumbnailUrl ? (
                        <img
                          src={obj.thumbnailUrl}
                          alt={obj.name}
                          className="w-7 h-7 rounded object-cover flex-shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-white/10 flex-shrink-0" />
                      )}
                      <span className="text-white/50 group-hover:text-white/80 text-[11px] truncate transition-colors">
                        {obj.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
