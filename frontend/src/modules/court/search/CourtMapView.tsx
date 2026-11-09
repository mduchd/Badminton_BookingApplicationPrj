import "leaflet/dist/leaflet.css"
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Supercluster from 'supercluster'
import {
  Search,
  X,
  Plus,
  Minus,
  Crosshair,
  List,
  Sparkles,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  Layers,
  Navigation,
} from 'lucide-react'
import type { BadmintonCourtItem } from '../../types/court'

interface CourtMapViewProps {
  courts: BadmintonCourtItem[]
  onSelectCourt?: (court: BadmintonCourtItem) => void
  onBookCourt: (court: BadmintonCourtItem) => void
  onOpenAIChat: () => void
  onSwitchToList: () => void
}

type QuickFilterCategory = 'all' | 'open_247' | 'budget' | 'car_parking'
type MapLayerStyle = 'google_road' | 'light_vector' | 'google_satellite'

const QUICK_FILTER_OPTIONS: { id: QuickFilterCategory; label: string; color: string }[] = [
  { id: 'all', label: 'Tất cả sân cầu lông', color: '#168039' },
  { id: 'open_247', label: 'Mở cửa 24/7', color: '#168039' },
  { id: 'budget', label: 'Giá tốt ≤110k/h', color: '#168039' },
  { id: 'car_parking', label: 'Bãi đỗ ô tô', color: '#168039' },
]

const AREA_SHORTCUTS: { label: string; lat: number; lng: number; zoom: number }[] = [
  { label: 'Hà Nội (22 sân)', lat: 21.0245, lng: 105.834, zoom: 12 },
  { label: 'TP.HCM (22 sân)', lat: 10.805, lng: 106.665, zoom: 12 },
  { label: 'Đồng Nai (6 sân)', lat: 10.945, lng: 106.895, zoom: 11 },
  { label: 'Đà Nẵng (4 sân)', lat: 16.048, lng: 108.215, zoom: 12 },
  { label: 'Kiên Giang (4 sân)', lat: 10.02, lng: 105.08, zoom: 10 },
  { label: 'Nha Trang (3 sân)', lat: 12.255, lng: 109.18, zoom: 12 },
]

function getSportPinColor(): string {
  return '#168039'
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function resolveMapTileConfig(style: MapLayerStyle): {
  url: string
  subdomains: string[]
  attribution: string
} {
  const goongKey = (import.meta.env.VITE_GOONG_MAP_KEY as string | undefined)?.trim()
  if (style === 'google_satellite') {
    return {
      url: 'https://mt{s}.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}',
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; Google Maps',
    }
  }
  if (style === 'light_vector') {
    if (goongKey) {
      return {
        url: `https://tiles.goong.io/assets/goong_map_web/{z}/{x}/{y}@2x.png?api_key=${goongKey}`,
        subdomains: ['a', 'b', 'c'],
        attribution: '&copy; Goong Maps',
      }
    }
    return {
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      attribution: '&copy; OpenStreetMap &copy; CARTO',
    }
  }
  return {
    url: 'https://mt{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    attribution: '&copy; Google Maps',
  }
}

function ScrollableMapFilters({ label, children }: { label: string; children: React.ReactNode }) {
  const rowRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ pointerId: number; x: number; scrollLeft: number } | null>(null)
  const dragged = useRef(false)

  useEffect(() => {
    const row = rowRef.current
    if (!row) return
    const scrollWithWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)
        || row.scrollWidth <= row.clientWidth) return
      event.preventDefault()
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? row.clientWidth : 1
      row.scrollLeft += event.deltaY * unit
    }
    row.addEventListener('wheel', scrollWithWheel, { passive: false })
    return () => row.removeEventListener('wheel', scrollWithWheel)
  }, [])

  return (
    <div
      ref={rowRef}
      role="group"
      aria-label={label}
      tabIndex={0}
      className="max-w-full overflow-x-auto overscroll-x-contain touch-pan-x select-none no-scrollbar focus-visible:outline-2 focus-visible:outline-[#168039]"
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
        event.preventDefault()
        event.currentTarget.scrollLeft += event.key === 'ArrowRight' ? 100 : -100
      }}
      onPointerDown={(event) => {
        dragged.current = false
        const row = event.currentTarget
        if (event.pointerType === 'mouse' && event.button === 0 && row.scrollWidth > row.clientWidth) {
          drag.current = { pointerId: event.pointerId, x: event.clientX, scrollLeft: row.scrollLeft }
        }
      }}
      onPointerMove={(event) => {
        const start = drag.current
        if (!start || start.pointerId !== event.pointerId) return
        const offset = event.clientX - start.x
        if (!dragged.current && Math.abs(offset) < 5) return
        if (!dragged.current) {
          dragged.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
        }
        event.currentTarget.scrollLeft = start.scrollLeft - offset
      }}
      onPointerLeave={() => { if (!dragged.current) drag.current = null }}
      onPointerUp={() => { drag.current = null }}
      onPointerCancel={() => { drag.current = null }}
      onClickCapture={(event) => {
        if (dragged.current && event.detail > 0) {
          event.preventDefault()
          event.stopPropagation()
          dragged.current = false
        }
      }}
    >
      <div className="flex w-max min-w-full items-center justify-center gap-1.5 py-0.5">
        {children}
      </div>
    </div>
  )
}

export const CourtMapView: React.FC<CourtMapViewProps> = ({
  courts,
  onSelectCourt,
  onBookCourt,
  onOpenAIChat,
  onSwitchToList,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedQuickFilter, setSelectedQuickFilter] = useState<QuickFilterCategory>('all')
  const [mapStyle, setMapStyle] = useState<MapLayerStyle>('google_road')
  const [isStyleMenuOpen, setIsStyleMenuOpen] = useState(false)
  const [selectedCourt, setSelectedCourt] = useState<BadmintonCourtItem | null>(null)
  const [visibleCount, setVisibleCount] = useState<number>(courts.length)
  const [isLocating, setIsLocating] = useState(false)

  const filteredCourts = useMemo(() => {
    return courts.filter((court) => {
      if (court.sportType && court.sportType !== 'badminton') {
        return false
      }
      if (selectedQuickFilter === 'open_247') {
        const hrs = (court.openHours || '').toLowerCase()
        const has247 =
          hrs.includes('00:00 - 24:00') ||
          hrs.includes('00:00 - 23:59') ||
          (court.amenities || []).some((a) => a.toLowerCase().includes('24/7'))
        if (!has247) return false
      } else if (selectedQuickFilter === 'budget') {
        if ((court.pricePerHour || 120000) > 110000) return false
      } else if (selectedQuickFilter === 'car_parking') {
        if (!(court.amenities || []).some((a) => a.toLowerCase().includes('ô tô'))) return false
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchesName = court.name.toLowerCase().includes(query)
        const matchesAddr = court.address.toLowerCase().includes(query)
        const matchesDist = court.district.toLowerCase().includes(query)
        if (!matchesName && !matchesAddr && !matchesDist) return false
      }
      return true
    })
  }, [courts, selectedQuickFilter, searchTerm])

  const clusterIndex = useMemo(() => {
    const sc = new Supercluster({
      radius: 56,
      maxZoom: 16,
      minPoints: 2,
    })

    const points = filteredCourts.map((court) => ({
      type: 'Feature' as const,
      properties: {
        cluster: false,
        courtId: court.id,
        courtData: court,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [court.longitude, court.latitude],
      },
    }))

    sc.load(points)
    return sc
  }, [filteredCourts])

  const formatClusterCount = (count: number): string => {
    if (count >= 100) return '100+'
    if (count >= 50) return '50+'
    if (count >= 20) return '20+'
    if (count >= 10) return '10+'
    return count.toString()
  }

  const renderClusters = useCallback(() => {
    const map = mapInstanceRef.current
    const layer = markersLayerRef.current
    if (!map || !layer || !clusterIndex) return

    try {
      const bounds = map.getBounds()
      if (!bounds || typeof bounds.isValid !== 'function' || !bounds.isValid()) return

      const zoom = Math.floor(map.getZoom())
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]

      if (bbox.some((v) => typeof v !== 'number' || Number.isNaN(v))) return

      layer.clearLayers()
      const clusters = clusterIndex.getClusters(bbox, zoom)

      let inViewTotal = 0
      clusters.forEach((c) => {
        inViewTotal += c.properties.cluster ? (c.properties.point_count as number) : 1
      })
      setVisibleCount(inViewTotal)

      clusters.forEach((item) => {
        const [lng, lat] = item.geometry.coordinates

        if (item.properties.cluster) {
          const count = item.properties.point_count as number
          const clusterId = item.properties.cluster_id as number
          const displayCount = formatClusterCount(count)
          const size = count >= 20 ? 48 : 42

          const clusterIcon = L.divIcon({
            html: `
              <div style="width:${size}px;height:${size}px;border-radius:9999px;background:rgba(22,128,57,0.22);display:flex;align-items:center;justify-content:center;cursor:pointer;">
                <div style="width:${size - 10}px;height:${size - 10}px;border-radius:9999px;background:#168039;color:#ffffff;font-weight:800;font-size:13px;border:2.5px solid #ffffff;box-shadow:0 3px 10px rgba(15,23,42,0.28);display:flex;align-items:center;justify-content:center;">
                  ${displayCount}
                </div>
              </div>
            `,
            className: 'smashcourt-cluster-marker',
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          })

          const marker = L.marker([lat, lng], { icon: clusterIcon })
          marker.on('click', () => {
            try {
              const expansionZoom = Math.min(
                clusterIndex.getClusterExpansionZoom(clusterId),
                18
              )
              map.flyTo([lat, lng], expansionZoom, { duration: 0.55 })
            } catch {
              map.flyTo([lat, lng], zoom + 2, { duration: 0.55 })
            }
          })
          layer.addLayer(marker)
        } else {
          const court = item.properties.courtData as BadmintonCourtItem
          const isSelected = selectedCourt?.id === court.id
          const pinColor = isSelected ? '#e5a92c' : getSportPinColor()
          const showLabel = zoom >= 13 || isSelected
          const priceK = `${Math.round((court.pricePerHour || 100000) / 1000)}k`
          const shortName = escapeHtml(
            court.name.length > 26 ? `${court.name.slice(0, 25)}…` : court.name
          )

          // Custom Sport Teardrop Pin + Outlined Halo Venue Label (inspired by modern VN sport map apps)
          const singleIcon = L.divIcon({
            html: `
              <div style="display:flex;flex-direction:column;align-items:center;pointer-events:auto;cursor:pointer;">
                ${
                  showLabel
                    ? `<div style="margin-bottom:3px;padding:1px 6px;border-radius:6px;font-size:11.5px;font-weight:800;line-height:1.25;white-space:nowrap;color:${
                        isSelected ? '#0f172a' : pinColor
                      };text-shadow:-1.5px -1.5px 0 #ffffff,1.5px -1.5px 0 #ffffff,-1.5px 1.5px 0 #ffffff,1.5px 1.5px 0 #ffffff,0 2px 4px rgba(15,23,42,0.22);">
                        ${shortName}
                      </div>`
                    : ''
                }
                <div style="position:relative;width:${isSelected ? 40 : 34}px;height:${
              isSelected ? 40 : 34
            }px;border-radius:9999px 9999px 9999px 4px;transform:rotate(-45deg);background:${pinColor};border:2.5px solid #ffffff;box-shadow:0 4px 12px rgba(15,23,42,0.32);display:flex;align-items:center;justify-content:center;">
                  <span style="transform:rotate(45deg);color:#ffffff;font-size:10px;font-weight:800;letter-spacing:-0.3px;">
                    ${priceK}
                  </span>
                </div>
              </div>
            `,
            className: 'smashcourt-sport-pin',
            iconSize: [160, showLabel ? 64 : 44],
            iconAnchor: [80, showLabel ? 58 : 38],
          })

          const marker = L.marker([lat, lng], {
            icon: singleIcon,
            zIndexOffset: isSelected ? 1000 : 0,
          })
          marker.on('click', () => {
            setSelectedCourt(court)
            map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.45 })
          })
          layer.addLayer(marker)
        }
      })
    } catch (err) {
      console.warn('Map cluster render skipped:', err)
    }
  }, [clusterIndex, selectedCourt?.id])

  // Initialize Map Instance
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) return

    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove()
      } catch {
        // ignore
      }
      mapInstanceRef.current = null
    }
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id
    }

    const map = L.map(container, {
      center: [21.0285, 105.825],
      zoom: 12,
      zoomControl: false,
    })

    const cfg = resolveMapTileConfig(mapStyle)
    const tileLayer = L.tileLayer(cfg.url, {
      maxZoom: 20,
      subdomains: cfg.subdomains,
      attribution: cfg.attribution,
    }).addTo(map)
    tileLayerRef.current = tileLayer

    const layerGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = layerGroup
    mapInstanceRef.current = map

    map.on('click', () => {
      setIsStyleMenuOpen(false)
    })

    const timer = setTimeout(() => {
      map.invalidateSize()
      renderClusters()
    }, 140)

    return () => {
      clearTimeout(timer)
      try {
        map.remove()
      } catch {
        // ignore
      }
      mapInstanceRef.current = null
      tileLayerRef.current = null
      markersLayerRef.current = null
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id
      }
    }
  }, [])

  // Keep map event listeners bound to latest renderClusters
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    map.on('moveend', renderClusters)
    map.on('zoomend', renderClusters)
    renderClusters()
    return () => {
      map.off('moveend', renderClusters)
      map.off('zoomend', renderClusters)
    }
  }, [renderClusters])

  // Switch tile provider dynamically (Google Road VN / Goong-Voyager Light / Google Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !tileLayerRef.current) return

    map.removeLayer(tileLayerRef.current)
    const cfg = resolveMapTileConfig(mapStyle)
    const nextLayer = L.tileLayer(cfg.url, {
      maxZoom: 20,
      subdomains: cfg.subdomains,
      attribution: cfg.attribution,
    }).addTo(map)
    tileLayerRef.current = nextLayer
  }, [mapStyle])

  const handleLocateUser = () => {
    if (!navigator.geolocation) return
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const { latitude, longitude } = pos.coords
        const map = mapInstanceRef.current
        if (!map) return

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude])
        } else {
          const userIcon = L.divIcon({
            html: `
              <div style="width:26px;height:26px;border-radius:9999px;background:rgba(2,132,199,0.22);display:flex;align-items:center;justify-content:center;">
                <div style="width:14px;height:14px;border-radius:9999px;background:#0284c7;border:2.5px solid #ffffff;box-shadow:0 2px 6px rgba(15,23,42,0.3);"></div>
              </div>
            `,
            className: 'user-location-pin',
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          })
          userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon }).addTo(map)
        }

        map.flyTo([latitude, longitude], 14, { duration: 0.75 })
      },
      () => {
        setIsLocating(false)
        mapInstanceRef.current?.flyTo([21.0285, 105.825], 13)
      },
      { timeout: 8000 }
    )
  }

  const handleJumpArea = (lat: number, lng: number, zoom: number) => {
    mapInstanceRef.current?.flyTo([lat, lng], zoom, { duration: 0.65 })
  }

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden bg-slate-100">
      {/* 1. Top Floating Search, Sport Chips & Area Quick-Jump */}
      <div className="absolute top-3 sm:top-4 left-0 right-0 z-20 px-3 sm:px-6 pointer-events-none">
        <div className="max-w-2xl mx-auto space-y-2 pointer-events-auto">
          {/* Search Bar + Viewport Count */}
          <div className="flex items-center bg-white rounded-full shadow-sm border border-slate-200 pl-4 pr-2.5 py-2 sm:py-2.5 gap-2">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên sân, đường phố, quận huyện..."
              className="flex-1 text-xs sm:text-sm text-slate-900 font-semibold placeholder:text-slate-500 focus:outline-none bg-transparent min-w-0"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-full cursor-pointer"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold shrink-0">
              {visibleCount} sân quanh đây
            </span>
          </div>

          {/* Badminton Quick Filter Chips */}
          <ScrollableMapFilters label="Bộ lọc nhanh">
            {QUICK_FILTER_OPTIONS.map((item) => {
              const isActive = selectedQuickFilter === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedQuickFilter(item.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                    isActive
                      ? 'bg-[#168039] text-white border-[#168039]'
                      : 'bg-white text-slate-800 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: isActive ? '#ffffff' : item.color }}
                  />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </ScrollableMapFilters>

          {/* City/District Quick Jump Pills */}
          <ScrollableMapFilters label="Chọn khu vực trên bản đồ">
            {AREA_SHORTCUTS.map((area) => (
              <button
                key={area.label}
                type="button"
                onClick={() => handleJumpArea(area.lat, area.lng, area.zoom)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 hover:bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:text-[#168039] whitespace-nowrap cursor-pointer transition-colors"
              >
                <Navigation className="w-3 h-3 text-[#168039]" />
                <span>{area.label}</span>
              </button>
            ))}
          </ScrollableMapFilters>
        </div>
      </div>

      {/* 2. Right Floating Map Controls (Flat Bordered Buttons, Zero Button Glow) */}
      <div className="absolute right-3 sm:right-6 top-36 sm:top-40 z-20 flex flex-col gap-2 items-end">
        {/* Layer Switcher Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStyleMenuOpen((v) => !v)}
            className="w-10 h-10 rounded-xl bg-white text-slate-800 border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
            title="Chuyển nền bản đồ"
          >
            <Layers className="w-4 h-4 text-[#168039]" />
          </button>

          {isStyleMenuOpen && (
            <div className="absolute right-12 top-0 w-48 bg-white rounded-xl border border-slate-200 shadow-lg p-1.5 space-y-1 z-30">
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-600">
                Chế độ nền bản đồ
              </div>
              {[
                { id: 'google_road' as const, label: 'Đường phố chi tiết VN' },
                { id: 'light_vector' as const, label: 'Nền sáng tối giản' },
                { id: 'google_satellite' as const, label: 'Ảnh vệ tinh thực tế' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setMapStyle(opt.id)
                    setIsStyleMenuOpen(false)
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    mapStyle === opt.id
                      ? 'bg-[#168039] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Court Assistant */}
        <button
          type="button"
          onClick={onOpenAIChat}
          className="w-10 h-10 rounded-xl bg-white text-[#168039] border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
          title="Trợ lý tìm sân thông minh"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-xl bg-white border border-slate-200 overflow-hidden">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-10 h-9 flex items-center justify-center text-slate-800 hover:bg-slate-50 border-b border-slate-200 transition-colors cursor-pointer"
            title="Phóng to"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-10 h-9 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Thu nhỏ"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Switch to List View */}
        <button
          type="button"
          onClick={onSwitchToList}
          className="w-10 h-10 rounded-xl bg-white text-slate-800 border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
          title="Chuyển sang danh sách"
        >
          <List className="w-4 h-4" />
        </button>

        {/* My GPS Location */}
        <button
          type="button"
          onClick={handleLocateUser}
          className={`w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer ${
            isLocating ? 'text-[#168039]' : 'text-slate-800'
          }`}
          title="Định vị của tôi"
        >
          <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 3. Full-screen Interactive Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full min-h-screen z-10" />

      {/* 4. Floating Selected Venue Card */}
      {selectedCourt && (
        <div className="absolute bottom-24 sm:bottom-28 left-3 right-3 sm:left-auto sm:right-6 sm:w-[430px] z-30">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-5 relative">
            <button
              type="button"
              onClick={() => setSelectedCourt(null)}
              className="absolute top-3 right-3 p-1.5 text-slate-600 hover:text-slate-900 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer"
              aria-label="Đóng thẻ sân"
            >
              <X className="w-4 h-4" />
            </button>

            <div
              onClick={() => onSelectCourt?.(selectedCourt)}
              className="flex gap-3.5 cursor-pointer group"
              title="Nhấn để mở ngăn thông tin chi tiết"
            >
              <img
                src={selectedCourt.imageUrl}
                alt={selectedCourt.name}
                className="w-24 h-24 rounded-xl object-cover shrink-0 border border-slate-200"
              />
              <div className="flex-1 min-w-0 pr-5">
                <div className="flex items-center gap-1.5 text-xs font-bold mb-1">
                  <Star className="w-3.5 h-3.5 fill-[#e5a92c] text-[#e5a92c]" />
                  <span className="font-extrabold text-slate-900">
                    {selectedCourt.rating || 4.8}
                  </span>
                  <span className="text-slate-600 font-medium">
                    ({selectedCourt.reviewCount || 100})
                  </span>
                  <span className="text-slate-300">|</span>
                  <span className="text-[#ea580c] font-bold">{selectedCourt.distance}</span>
                </div>

                <h4 className="font-black text-slate-900 text-sm sm:text-base line-clamp-1 group-hover:text-[#168039] transition-colors">
                  {selectedCourt.name}
                </h4>

                <p className="text-xs text-slate-700 line-clamp-1 mt-1 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-[#168039]" />
                  <span>{selectedCourt.address}</span>
                </p>

                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-700 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{selectedCourt.openHours}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div>
                <span className="text-xs text-slate-600 font-semibold">Giá niêm yết từ:</span>
                <div className="text-base sm:text-lg font-black text-[#168039]">
                  {selectedCourt.pricePerHour.toLocaleString('vi-VN')} đ
                  <span className="text-xs font-semibold text-slate-600"> / giờ</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onSelectCourt && (
                  <button
                    type="button"
                    onClick={() => onSelectCourt(selectedCourt)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                  >
                    Chi tiết sân
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onBookCourt(selectedCourt)}
                  className="px-4 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Đặt lịch</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
