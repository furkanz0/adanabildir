import { DISTRICT_GEO } from '../constants/districts'
import { distanceInMeters } from './geo'

/**
 * Koordinattan ilce tahmini.
 *
 * Iki asamali:
 *   1. Noktayi iceren dikdortgenleri bul
 *   2. Birden fazla varsa (sinirlar ust uste biniyor) merkeze en yakin olani sec
 *
 * Hicbir dikdortgen icermiyorsa null doner — kullanici Adana disinda ya da
 * desteklenmeyen 11 ilceden birinde demektir. O durumda form ilceyi bos
 * birakip kullanicidan elle secmesini istiyor.
 *
 * @returns {string|null} ilce anahtari veya null
 */
export function suggestDistrict(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const matches = Object.entries(DISTRICT_GEO).filter(
    ([, { bounds }]) =>
      latitude >= bounds.minLat &&
      latitude <= bounds.maxLat &&
      longitude >= bounds.minLon &&
      longitude <= bounds.maxLon,
  )

  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0][0]

  // Cakisma: merkeze en yakin ilce kazanir
  let best = matches[0][0]
  let bestDistance = Infinity

  for (const [key, { center }] of matches) {
    const d = distanceInMeters(latitude, longitude, center[0], center[1])
    if (d < bestDistance) {
      bestDistance = d
      best = key
    }
  }

  return best
}
