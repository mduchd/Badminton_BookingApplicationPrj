import { API_BASE_URL } from './apiConfig'

export interface PublicCatalogPage {
  content: unknown[]
  totalElements: number
  totalPages: number
}

let initialRequest: Promise<PublicCatalogPage> | undefined
const firstPageQuery = 'page=0&size=24'

async function requestPage(query: string): Promise<PublicCatalogPage> {
  // Public catalog GETs need neither credentials nor JSON request headers.
  // Keeping the request simple avoids an unnecessary cross-origin preflight.
  const response = await fetch(`${API_BASE_URL}/facilities/page?${query}`)
  if (!response.ok) throw new Error(`Không thể tải danh sách sân (${response.status})`)
  return response.json()
}

export function warmHomeCatalog(): void {
  if (window.location.pathname !== '/' && window.location.pathname !== '/home') return
  initialRequest = requestPage(firstPageQuery)
  void initialRequest.catch(() => { initialRequest = undefined })
}

export function fetchPublicCatalog(query: string): Promise<PublicCatalogPage> {
  if (query === firstPageQuery && initialRequest) {
    const request = initialRequest
    initialRequest = undefined
    return request
  }
  return requestPage(query)
}
