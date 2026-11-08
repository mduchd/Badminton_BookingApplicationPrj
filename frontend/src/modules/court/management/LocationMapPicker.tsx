import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Crosshair, ExternalLink, Layers, MapPin, Navigation } from 'lucide-react'
import { buildGoogleMapsDirectionsUrl, buildGoogleMapsEmbedUrl } from '../../../lib/facilityLocation'

interface LocationMapPickerProps {
  latitude: number
  longitude: number
  normalizedAddress: string
  onChangeCoordinates: (lat: number, lng: number) => void
}

type PickerTileStyle = 'google_road' | 'google_hybrid'

const DISTRICT_PRESETS: { label: string; lat: number; lng: number }[] = [
  { label: 'Cầu Giấy, HN', lat: 21.0313, lng: 105.7831 },
  { label: 'Đống Đa, HN', lat: 21.018, lng: 105.829 },
  { label: 'Nam Từ Liêm, HN', lat: 21.0156, lng: 105.7654 },
  { label: 'Thanh Xuân, HN', lat: 20.9938, lng: 105.8114 },
  { label: 'Bình Thạnh, HCM', lat: 10.8106, lng: 106.7091 },
  { label: 'Quận 7, HCM', lat: 10.734, lng: 106.7218 },
]

function getTileLayerUrl(style: PickerTileStyle): string {
  if (style === 'google_hybrid') {
    return 'https://mt{s}.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}'
  }
  return 'https://mt{s}.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}'
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  latitude,
  longitude,
  normalizedAddress,
  onChangeCoordinates,
}) => {
  const [viewMode, setViewMode] = useState<'picker' | 'embed'>('picker')
  const [tileStyle, setTileStyle] = useState<PickerTileStyle>('google_road')
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const safeLat = Number.isFinite(latitude) ? latitude : 21.0285
  const safeLng = Number.isFinite(longitude) ? longitude : 105.8542

  useEffect(() => {
    if (viewMode !== 'picker' || !mapContainerRef.current) return

    if (!mapRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [safeLat, safeLng],
        zoom: 16,
        zoomControl: true,
      })

      const layer = L.tileLayer(getTileLayerUrl(tileStyle), {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps',
      }).addTo(map)
      tileLayerRef.current = layer

      const pinIcon = L.divIcon({
        className: 'smashcourt-owner-teardrop-pin',
        html: `
          <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-14px);">
            <div style="width:34px;height:34px;border-radius:9999px 9999px 9999px 4px;transform:rotate(-45deg);background:#168039;border:3px solid #ffffff;box-shadow:0 3px 10px rgba(15,23,42,0.35);display:flex;align-items:center;justify-content:center;">
              <div style="width:10px;height:10px;border-radius:9999px;background:#ffffff;transform:rotate(45deg);"></div>
            </div>
          </div>
        `,
        iconSize: [34, 42],
        iconAnchor: [17, 36],
      })

      const marker = L.marker([safeLat, safeLng], {
        draggable: true,
        icon: pinIcon,
      }).addTo(map)

      marker.on('dragend', () => {
        const pos = marker.getLatLng()
        onChangeCoordinates(
          Number(pos.lat.toFixed(6)),
          Number(pos.lng.toFixed(6))
        )
      })

      map.on('click', (ev: L.LeafletMouseEvent) => {
        const nextLat = Number(ev.latlng.lat.toFixed(6))
        const nextLng = Number(ev.latlng.lng.toFixed(6))
        marker.setLatLng([nextLat, nextLng])
        onChangeCoordinates(nextLat, nextLng)
      })

      mapRef.current = map
      markerRef.current = marker

      setTimeout(() => {
        map.invalidateSize()
      }, 120)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        tileLayerRef.current = null
        markerRef.current = null
      }
    }
  }, [viewMode])

  useEffect(() => {
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(getTileLayerUrl(tileStyle))
    }
  }, [tileStyle])

  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const cur = markerRef.current.getLatLng()
      if (Math.abs(cur.lat - safeLat) > 0.00001 || Math.abs(cur.lng - safeLng) > 0.00001) {
        markerRef.current.setLatLng([safeLat, safeLng])
        mapRef.current.setView([safeLat, safeLng], mapRef.current.getZoom())
      }
    }
  }, [safeLat, safeLng])

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lng = Number(pos.coords.longitude.toFixed(6))
        onChangeCoordinates(lat, lng)
      },
      () => {
        // user declined geolocation
      }
    )
  }

  const embedUrl = buildGoogleMapsEmbedUrl(safeLat, safeLng, normalizedAddress)
  const directionsUrl = buildGoogleMapsDirectionsUrl(safeLat, safeLng, normalizedAddress)

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
      {/* Header Toolbar */}
      <div className="px-3.5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#168039]" />
          <span className="text-xs font-bold text-slate-900">
            Định vị ghim sân & Bản đồ tiếng Việt
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setViewMode('picker')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'picker'
                ? 'bg-[#168039] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Chấm tọa độ
          </button>
          <button
            type="button"
            onClick={() => setViewMode('embed')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              viewMode === 'embed'
                ? 'bg-[#168039] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Google Maps Embed
          </button>

          {viewMode === 'picker' && (
            <button
              type="button"
              onClick={() =>
                setTileStyle((prev) =>
                  prev === 'google_road' ? 'google_hybrid' : 'google_road'
                )
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
              title="Chuyển đổi lớp bản đồ Đường phố / Vệ tinh"
            >
              <Layers className="w-3.5 h-3.5 text-[#168039]" />
              <span>{tileStyle === 'google_road' ? 'Xem vệ tinh' : 'Xem đường phố'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleUseCurrentGps}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            title="Lấy vị trí hiện tại"
          >
            <Crosshair className="w-3.5 h-3.5 text-[#168039]" />
            <span>GPS hiện tại</span>
          </button>
        </div>
      </div>

      {/* Quick area jump buttons */}
      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[11px] font-semibold text-slate-600 shrink-0">Khu vực nhanh:</span>
        {DISTRICT_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChangeCoordinates(preset.lat, preset.lng)}
            className="px-2 py-1 rounded-md bg-white border border-slate-200 hover:border-[#168039] text-[11px] font-semibold text-slate-700 hover:text-[#168039] shrink-0 cursor-pointer transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Map Canvas */}
      <div className="h-60 w-full bg-slate-100 relative">
        {viewMode === 'picker' ? (
          <div ref={mapContainerRef} className="w-full h-full z-0" />
        ) : (
          <iframe
            title="Google Maps nhúng vị trí sân"
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
          />
        )}
      </div>

      {/* Coordinate Inputs & Standardized Preview */}
      <div className="p-3 bg-white border-t border-slate-200 space-y-2">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Vĩ độ (Latitude)
            </label>
            <input
              type="number"
              step="0.000001"
              value={safeLat}
              onChange={(e) => onChangeCoordinates(Number(e.target.value), safeLng)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-900"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Kinh độ (Longitude)
            </label>
            <input
              type="number"
              step="0.000001"
              value={safeLng}
              onChange={(e) => onChangeCoordinates(safeLat, Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-semibold text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600 pt-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Navigation className="w-3.5 h-3.5 text-[#168039] shrink-0" />
            <span className="truncate font-medium">
              Địa chỉ chuẩn hóa:{' '}
              <strong className="text-slate-900">{normalizedAddress || 'Chưa nhập'}</strong>
            </span>
          </div>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-bold text-[#168039] hover:underline shrink-0 cursor-pointer"
          >
            <span>Chỉ đường</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}
