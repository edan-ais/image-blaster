import worlds from 'virtual:worlds'
import { ViewerQuality, type World, type WorldEntry } from '../types/world'

export function loadWorlds(): WorldEntry[] {
  return worlds as WorldEntry[]
}

export async function fetchWorlds(): Promise<WorldEntry[]> {
  if (!import.meta.env.DEV) return loadWorlds()

  const response = await fetch('/__worlds', { cache: 'no-store' })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<WorldEntry[]>
}

function localWorldAssetUrl(url: string | undefined): string {
  if (!url) return ''
  if (url.startsWith('/worlds/') || url.startsWith('http://') || url.startsWith('https://')) return url
  return ''
}

export function getSplatUrl(world: World, quality: ViewerQuality = ViewerQuality.High): string {
  const urls = world.assets.splats.spz_urls
  if (quality === ViewerQuality.Low) {
    return localWorldAssetUrl(urls['100k'] ?? urls['150k'] ?? urls['500k'] ?? urls.full_res)
  }
  return localWorldAssetUrl(urls['500k'] ?? urls.full_res)
}
