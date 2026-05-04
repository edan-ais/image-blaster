import { useRoute, useLocation, Redirect } from 'wouter'
import { Leva } from 'leva'
import { WorldViewer } from './components/WorldViewer'
import { WorldSidebar } from './components/WorldSidebar'
import { BottomLeftControls } from './components/BottomLeftControls'
import { DebugPanel } from './components/DebugPanel'
import { TouchControls } from './components/TouchControls'
import { loadWorlds } from './utils/worldLoader'

const worlds = loadWorlds()

export function App() {
  const [match, params] = useRoute('/:slug')
  useLocation()

  if (!worlds.length) {
    return (
      <div className="flex items-center justify-center h-screen text-white bg-black">
        No worlds found in worlds/
      </div>
    )
  }

  if (!match) {
    return <Redirect to={`/${worlds[0].slug}`} />
  }

  const slug = params?.slug ?? worlds[0].slug
  const entry = worlds.find((w) => w.slug === slug) ?? worlds[0]

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      <Leva theme={{ sizes: { rootWidth: '380px', controlWidth: '180px' } }} />
      <DebugPanel />
      <WorldViewer world={entry.world} slug={entry.slug} objectAssets={entry.objectAssets} sourceImageUrl={entry.sourceImageUrl} />
      <div className="fixed left-4 top-4 z-10">
        <WorldSidebar worlds={worlds} activeSlug={entry.slug} />
      </div>
      <div className="fixed bottom-4 left-4 z-20">
        <BottomLeftControls />
      </div>
      <TouchControls />
    </div>
  )
}
