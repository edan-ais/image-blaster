import worlds from 'virtual:worlds'
import { ViewerQuality, type World, type WorldEntry } from '../types/world'

export function loadWorlds(): WorldEntry[] {
  return worlds as WorldEntry[]
}

export function getSplatUrl(world: World, quality: ViewerQuality = ViewerQuality.High): string {
  const urls = world.assets.splats.spz_urls
  if (quality === ViewerQuality.Low) {
    return urls['100k'] ?? urls['150k'] ?? urls['500k'] ?? urls.full_res ?? ''
  }
  if (quality === ViewerQuality.Medium) {
    return urls['500k'] ?? urls['150k'] ?? urls['100k'] ?? urls.full_res ?? ''
  }
  return urls.full_res ?? urls['500k'] ?? urls['150k'] ?? urls['100k'] ?? ''
}
