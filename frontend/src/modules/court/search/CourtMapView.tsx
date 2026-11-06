import React, { useEffect, useRef, useState, useMemo } from 'react'
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
} from 'lucide-react'
import type { BadmintonCourtItem } from '../../user/mockData'

interface CourtMapViewProps {
  courts: BadmintonCourtItem[]
  onSelectCourt?: (court: BadmintonCourtItem) => void
  onBookCourt: (court: BadmintonCourtItem) => void
  onOpenAIChat: () => void
  onSwitchToList: () => void
}

type SportCategory = 'all' | 'badminton' | 'pickleball' | 'football' | 'basketball' | 'tennis'

const SPORT_OPTIONS: { id: SportCategory; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'badminton', label: 'Cầu lông' },
  { id: 'pickleball', label: 'Pickleball' },
  { id: 'football', label: 'Bóng đá' },
  { id: 'basketball', label: 'Bóng rổ' },
  { id: 'tennis', label: 'Quần vợt' },
]

export const CourtMapView: React.FC<CourtMapViewProps> = ({
  courts,
  onSelectCourt,
  onBookCourt,
  onOpenAIChat,
  onSwitchToList,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSport, setSelectedSport] = useState<SportCategory>('all')
  const [selectedCourt, setSelectedCourt] = useState<BadmintonCourtItem | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  // Filter courts by search term & sport category
  const filteredCourts = useMemo(() => {
    return courts.filter((court) => {
      if (selectedSport !== 'all' && court.sportType !== selectedSport) {
        return false
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
  }, [courts, selectedSport, searchTerm])

  // Initialize Supercluster instance
  const clusterIndex = useMemo(() => {
    const sc = new Supercluster({
      radius: 60,
      maxZoom: 17,
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

  // Format cluster display numbers
  const formatClusterCount = (count: number): string => {
    if (count >= 100) return '100+'
    if (count >= 70) return '70+'
    if (count >= 50) return '50+'
    if (count >= 30) return '30+'
    if (count >= 20) return '20+'
    if (count >= 10) return '10+'
    return count.toString()
  }

  // Update clusters on map
  const renderClusters = () => {
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

      if (bbox.some((v) => typeof v !== 'number' || isNaN(v))) return

      layer.clearLayers()
      const clusters = clusterIndex.getClusters(bbox, zoom)

      clusters.forEach((item) => {
        const [lng, lat] = item.geometry.coordinates

        if (item.properties.cluster) {
          const count = item.properties.point_count as number
          const clusterId = item.properties.cluster_id as number
          const displayCount = formatClusterCount(count)

          // Cluster pin styling: Solid dark green circle with white text
          const clusterIcon = L.divIcon({
            html: `
              <div class="w-10 h-10 rounded-full bg-[#1b7a42] text-white font-bold flex items-center justify-center border-2 border-white shadow-lg text-[13px] hover:bg-[#168039] transition-transform active:scale-95 cursor-pointer">
                ${displayCount}
              </div>
            `,
            className: 'custom-cluster-icon',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          })

          const marker = L.marker([lat, lng], { icon: clusterIcon })
          marker.on('click', () => {
            try {
              const expansionZoom = Math.min(
                clusterIndex.getClusterExpansionZoom(clusterId),
                18
              )
              map.flyTo([lat, lng], expansionZoom, { duration: 0.6 })
            } catch {
              map.flyTo([lat, lng], zoom + 2, { duration: 0.6 })
            }
          })
          layer.addLayer(marker)
        } else {
          const court = item.properties.courtData as BadmintonCourtItem

          // Single court pin styling: Green pin badge with "1"
          const singleIcon = L.divIcon({
            html: `
              <div class="w-8 h-8 rounded-full bg-[#1b7a42] text-white font-bold flex items-center justify-center border-2 border-white shadow-md text-[12px] hover:bg-[#168039] hover:scale-110 transition-all cursor-pointer">
                1
              </div>
            `,
            className: 'custom-single-marker',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          })

          const marker = L.marker([lat, lng], { icon: singleIcon })
          marker.on('click', () => {
            setSelectedCourt(court)
            map.panTo([lat, lng])
          })
          layer.addLayer(marker)
        }
      })
    } catch (err) {
      console.warn('Map cluster render skipped:', err)
    }
  }

  // Initialize Leaflet map
  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) return

    // Safely remove any existing map on this container
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove()
      } catch (e) {
        console.warn(e)
      }
      mapInstanceRef.current = null
    }
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id
    }

    // Center on Hanoi coordinates
    const map = L.map(container, {
      center: [21.0285, 105.8342],
      zoom: 12,
      zoomControl: false, // Custom zoom buttons
    })

    // Google Maps tiles (Tốc độ số 1 tại VN, tiếng Việt đầy đủ, không watermark, không bị nghẽn/rate-limit)
    L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      maxZoom: 20,
      subdomains: ['0', '1', '2', '3'],
      attribution: '&copy; Google Maps',
    }).addTo(map)

    const layerGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = layerGroup
    mapInstanceRef.current = map

    const handleMapChange = () => {
      renderClusters()
    }

    map.on('moveend', handleMapChange)
    map.on('zoomend', handleMapChange)

    // Ensure map bounds are measured properly
    const timer = setTimeout(() => {
      map.invalidateSize()
      renderClusters()
    }, 150)

    return () => {
      clearTimeout(timer)
      map.off('moveend', handleMapChange)
      map.off('zoomend', handleMapChange)
      try {
        map.remove()
      } catch (e) {
        console.warn(e)
      }
      mapInstanceRef.current = null
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id
      }
    }
  }, [])

  // Re-render clusters when filter or clusterIndex changes
  useEffect(() => {
    renderClusters()
  }, [clusterIndex])

  // Locate user position
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt không hỗ trợ định vị GPS')
      return
    }

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
              <div class="relative flex items-center justify-center">
                <span class="relative inline-flex rounded-full h-4 w-4 bg-[#1b7a42] border-2 border-white shadow"></span>
              </div>
            `,
            className: 'user-location-pin',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          })
          const marker = L.marker([latitude, longitude], { icon: userIcon }).addTo(map)
          userMarkerRef.current = marker
        }

        map.flyTo([latitude, longitude], 14, { duration: 0.8 })
      },
      () => {
        setIsLocating(false)
        // Fallback: zoom to Hanoi center
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([21.0285, 105.8342], 13)
        }
      },
      { timeout: 8000 }
    )
  }

  // Handle book court
  const handleTriggerBooking = (court: BadmintonCourtItem) => {
    onBookCourt(court)
  }

  return (
    <div className="relative w-full h-full min-h-[450px] overflow-hidden bg-slate-100">
      {/* 1. Top Floating Search & Sport Category Chips */}
      <div className="absolute top-4 left-0 right-0 z-20 px-3 sm:px-6 pointer-events-none">
        <div className="max-w-2xl mx-auto space-y-2 pointer-events-auto">
          {/* Search bar */}
          <div className="flex items-center bg-white rounded-full shadow-md border border-slate-200 px-5 py-3 sm:py-3.5">
            <Search className="w-5 h-5 text-slate-500 mr-3 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm sân quanh đây..."
              className="flex-1 text-sm sm:text-base text-slate-900 font-medium placeholder:text-slate-500 focus:outline-none bg-transparent"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1.5 text-slate-500 hover:text-slate-800 rounded-full cursor-pointer ml-1 font-bold"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sport Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {SPORT_OPTIONS.map((sport) => {
              const isActive = selectedSport === sport.id
              return (
                <button
                  key={sport.id}
                  type="button"
                  onClick={() => setSelectedSport(sport.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap shadow-xs transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1b7a42] text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span>{sport.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 2. Floating Action Controls (Right-side) */}
      <div className="absolute right-3 sm:right-6 top-32 z-20 flex flex-col gap-2">
        {/* AI Assistant shortcut */}
        <button
          type="button"
          onClick={onOpenAIChat}
          className="w-10 h-10 rounded-full bg-white text-[#1b7a42] border border-slate-200 shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
          title="Trợ lý tìm sân"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-xl bg-white border border-slate-200 shadow-md overflow-hidden">
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="w-10 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 border-b border-slate-100 transition-colors cursor-pointer"
            title="Phóng to"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="w-10 h-9 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Thu nhỏ"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Switch to List View */}
        <button
          type="button"
          onClick={onSwitchToList}
          className="w-10 h-10 rounded-xl bg-white text-slate-700 border border-slate-200 shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
          title="Xem danh sách"
        >
          <List className="w-4 h-4" />
        </button>

        {/* My Location Button */}
        <button
          type="button"
          onClick={handleLocateUser}
          className={`w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer ${
            isLocating ? 'text-[#1b7a42]' : 'text-slate-700'
          }`}
          title="Vị trí của tôi"
        >
          <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 3. Full-screen Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[450px] z-10" />

      {/* 4. Bottom Court Preview Card (Appears when single court pin is clicked) */}
      {selectedCourt && (
        <div className="absolute bottom-20 sm:bottom-24 left-3 right-3 sm:left-auto sm:right-6 sm:w-[420px] z-30 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-200 p-4 sm:p-5 relative">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setSelectedCourt(null)}
              className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-slate-800 rounded-full bg-slate-100 hover:bg-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div
              onClick={() => onSelectCourt?.(selectedCourt)}
              className="flex gap-4 cursor-pointer group"
              title="Nhấn để xem thông tin sân"
            >
              <img
                src={selectedCourt.imageUrl}
                alt={selectedCourt.name}
                className="w-24 h-24 rounded-2xl object-cover flex-shrink-0 group-hover:scale-102 transition-transform duration-200"
              />
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1b7a42] mb-1">
                  <Star className="w-4 h-4 fill-[#e5a92c] text-[#e5a92c]" />
                  <span className="font-extrabold text-slate-900">{selectedCourt.rating || 4.8}</span>
                  <span className="text-slate-600 font-medium">({selectedCourt.reviewCount || 100})</span>
                  <span className="mx-1 text-slate-300">|</span>
                  <span className="text-[#ea580c] font-black">{selectedCourt.distance}</span>
                </div>
                <h4 className="font-black text-slate-900 text-sm sm:text-base line-clamp-1 group-hover:text-emerald-700 transition-colors">
                  {selectedCourt.name}
                </h4>
                <p className="text-xs text-slate-700 line-clamp-1 mt-1 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                  <span>{selectedCourt.address}</span>
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-700 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedCourt.openHours}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div>
                <span className="text-xs text-slate-700 font-semibold">Giá chỉ từ:</span>
                <div className="text-base sm:text-lg font-black text-[#1b7a42]">
                  {selectedCourt.pricePerHour.toLocaleString('vi-VN')}đ
                  <span className="text-xs font-semibold text-slate-600"> / giờ</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onSelectCourt && (
                  <button
                    type="button"
                    onClick={() => onSelectCourt(selectedCourt)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                  >
                    Xem chi tiết
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleTriggerBooking(selectedCourt)}
                  className="px-4 py-2.5 rounded-xl bg-[#1b7a42] hover:bg-[#156335] text-white text-xs sm:text-sm font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>Đặt sân</span>
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
