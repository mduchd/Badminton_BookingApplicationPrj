import type { Facility } from '../modules/types/court'

type FacilityPage = { content: Facility[]; totalElements: number; totalPages: number }
type CachedPage = { savedAt: number; data: FacilityPage }
const CACHE_KEY = 'smashcourt.home.facilities.v1'
const MAX_AGE = 6 * 60 * 60 * 1000

export function readHomeFacilityCache(): CachedPage | undefined {
  try {
    const value: CachedPage = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (!value || !Number.isFinite(value.savedAt) || value.savedAt > Date.now() || Date.now() - value.savedAt > MAX_AGE ||
        !Array.isArray(value.data?.content) || !Number.isFinite(value.data.totalElements) || !Number.isFinite(value.data.totalPages)) return undefined
    return value
  } catch {
    return undefined
  }
}

export function writeHomeFacilityCache(data: FacilityPage): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    // Storage may be unavailable or full; loading the list still works.
  }
}
