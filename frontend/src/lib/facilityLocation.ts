export function standardizeVietnameseAddress(params: {
  streetAddress?: string
  ward?: string
  district?: string
  city?: string
  fallbackAddress?: string
}): string {
  const clean = (v?: string) => (v ? v.trim().replace(/\s+/g, ' ').replace(/^,+|,+$/g, '') : '')
  const street = clean(params.streetAddress)
  const ward = clean(params.ward)
  const district = clean(params.district)
  const city = clean(params.city) || 'Hà Nội'

  const parts: string[] = []
  if (street) parts.push(street)
  if (ward && !parts.some((p) => p.toLowerCase().includes(ward.toLowerCase()))) {
    const lw = ward.toLowerCase()
    parts.push(lw.startsWith('phường') || lw.startsWith('xã') ? ward : `Phường ${ward}`)
  }
  if (district && !parts.some((p) => p.toLowerCase().includes(district.toLowerCase()))) {
    const ld = district.toLowerCase()
    parts.push(
      ld.startsWith('quận') || ld.startsWith('huyện') || ld.startsWith('tp')
        ? district
        : `Quận ${district}`
    )
  }
  if (city && !parts.some((p) => p.toLowerCase().includes(city.toLowerCase()))) {
    const lc = city.toLowerCase()
    parts.push(
      lc.startsWith('tp') || lc.startsWith('thành phố') || lc.startsWith('tỉnh')
        ? city
        : `TP. ${city}`
    )
  }
  return parts.length > 0 ? parts.join(', ') : clean(params.fallbackAddress)
}

export function buildGoogleMapsEmbedUrl(lat?: number, lng?: number, address?: string): string {
  if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://maps.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}&z=16&output=embed`
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(address || 'Hà Nội, Việt Nam')}&z=15&output=embed`
}

export function buildGoogleMapsDirectionsUrl(lat?: number, lng?: number, address?: string): string {
  if (typeof lat === 'number' && typeof lng === 'number' && !Number.isNaN(lat) && !Number.isNaN(lng)) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || 'Hà Nội, Việt Nam')}`
}

// Convert existing badminton venues to full Facility objects
