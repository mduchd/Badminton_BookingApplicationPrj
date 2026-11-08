import { API_BASE_URL } from '../../../lib/apiConfig'
import { authStorage } from '../../user/auth/authApi'
import {
  buildGoogleMapsDirectionsUrl,
  buildGoogleMapsEmbedUrl,
  standardizeVietnameseAddress,
} from '../../../lib/facilityLocation'
import type { BadmintonCourtItem } from '../../types/court'
import type {
  CourtUpsertPayload,
  Facility,
  FacilityFilterMetadata,
  FacilityFilterParams,
  FacilityUpsertPayload,
  MaintenanceBlock,
  MaintenanceCreatePayload,
  OwnerBookingItem,
  OwnerDashboardData,
  PriceRule,
  PriceRuleUpsertPayload,
  SubCourt,
  UploadedImageItem,
} from '../../types/court'

export class ApiHttpError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken()
  const headers = new Headers(init.headers || {})

  if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    let message = `Lỗi máy chủ (${response.status})`
    try {
      const errBody = await response.json()
      if (errBody?.message) {
        message = errBody.message
      } else if (errBody?.error) {
        message = errBody.error
      }
    } catch {
      // ignore json parse error
    }
    throw new ApiHttpError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

function normalizeTimeStr(value?: string | null, fallback = '06:00'): string {
  if (!value) return fallback
  const trimmed = String(value).trim()
  if (trimmed.length < 5) return fallback
  const hhmm = trimmed.slice(0, 5)
  return hhmm === '23:59' ? '24:00' : hhmm
}

function mapCourtDto(dto: any, fallbackFacilityId?: string): SubCourt {
  const rawType = String(dto.courtType || 'STANDARD').toLowerCase()
  const courtType: SubCourt['courtType'] =
    rawType === 'vip' ? 'vip' : rawType === 'training' ? 'training' : 'standard'

  const rawStatus = String(dto.status || 'ACTIVE').toLowerCase()
  const status: SubCourt['status'] =
    rawStatus === 'maintenance' ? 'maintenance' : rawStatus === 'inactive' ? 'inactive' : 'active'

  return {
    id: String(dto.id),
    facilityId: String(dto.facilityId ?? fallbackFacilityId ?? ''),
    name: dto.name || 'Sân cầu lông',
    courtNumber: dto.courtNumber ? Number(dto.courtNumber) : undefined,
    courtType,
    basePricePerHour: dto.basePricePerHour != null ? Number(dto.basePricePerHour) : 100000,
    surfaceType: dto.surfaceType || 'Thảm BWF tiêu chuẩn',
    description: dto.description || '',
    status,
  }
}

function mapFacilityDto(dto: any): Facility {
  const id = String(dto.id)
  const rawStatus = String(dto.status || 'ACTIVE').toUpperCase()
  const status: Facility['status'] =
    rawStatus === 'MAINTENANCE'
      ? 'maintenance'
      : rawStatus === 'INACTIVE' || rawStatus === 'PAUSED'
      ? 'paused'
      : 'active'

  const openTime = normalizeTimeStr(dto.openTime, '05:30')
  const closeTime = normalizeTimeStr(dto.closeTime, '23:00')
  const gallery: string[] =
    Array.isArray(dto.galleryImages) && dto.galleryImages.length > 0
      ? dto.galleryImages
      : dto.imageUrl
      ? [dto.imageUrl]
      : ['/images/logos/badminton-club-logo.svg']

  const lat = dto.latitude != null ? Number(dto.latitude) : 21.0285
  const lng = dto.longitude != null ? Number(dto.longitude) : 105.8542
  const normalizedAddress =
    dto.normalizedAddress ||
    standardizeVietnameseAddress({
      streetAddress: dto.streetAddress,
      ward: dto.ward,
      district: dto.district,
      city: dto.city,
      fallbackAddress: dto.address,
    })

  return {
    id,
    slug: dto.slug || undefined,
    name: dto.name || 'Cụm sân SmashCourt',
    logoUrl: dto.logoUrl || '/images/logos/badminton-club-logo.svg',
    imageUrl: dto.imageUrl || gallery[0],
    galleryImages: gallery,
    distance: dto.distanceKm != null ? `${Number(dto.distanceKm).toFixed(1)}km` : '1.5km',
    streetAddress: dto.streetAddress || '',
    ward: dto.ward || '',
    district: dto.district || 'Cầu Giấy',
    city: dto.city || 'Hà Nội',
    address: dto.address || dto.normalizedAddress || normalizedAddress,
    normalizedAddress,
    openTime,
    closeTime,
    openHours: String(dto.openHours || `${openTime} - ${closeTime}`).replace('23:59', '24:00'),
    mapsEmbedUrl: dto.mapsEmbedUrl || buildGoogleMapsEmbedUrl(lat, lng, normalizedAddress),
    mapsDirectionsUrl: dto.mapsDirectionsUrl || buildGoogleMapsDirectionsUrl(lat, lng, normalizedAddress),
    sportType: dto.sportType === 'pickleball' ? 'pickleball' : 'badminton',
    rating: dto.rating != null ? Number(dto.rating) : 0,
    reviewCount: dto.reviewCount != null ? Number(dto.reviewCount) : 0,
    minPrice: dto.minPrice != null ? Number(dto.minPrice) : Number(dto.pricePerHour || 100000),
    maxPrice: dto.maxPrice != null ? Number(dto.maxPrice) : Number(dto.pricePerHour || 140000),
    pricePerHour: dto.pricePerHour != null ? Number(dto.pricePerHour) : Number(dto.minPrice || 100000),
    amenities: Array.isArray(dto.amenities) ? dto.amenities : [],
    latitude: lat,
    longitude: lng,
    phone: dto.phone || '',
    messengerUrl: dto.messengerUrl || '',
    description: dto.description || '',
    ownerId: String(dto.ownerId ?? '2'),
    isApproved: dto.isApproved !== false,
    status,
    subCourts: Array.isArray(dto.courts)
      ? dto.courts.map((c: any) => mapCourtDto(c, id))
      : [],
  }
}

function mapPriceRuleDto(dto: any): PriceRule {
  const rawDay = String(dto.dayType || 'ALL').toUpperCase()
  const dayOfWeek: PriceRule['dayOfWeek'] =
    rawDay === 'WEEKDAY' ? 'WEEKDAY' : rawDay === 'WEEKEND' ? 'WEEKEND' : 'ALL'

  const rawCustomer = String(dto.customerType || 'CASUAL').toUpperCase()
  const customerType: PriceRule['customerType'] =
    rawCustomer === 'FIXED_MONTHLY' ? 'FIXED_MONTHLY' : 'CASUAL'

  return {
    id: String(dto.id),
    facilityId: String(dto.facilityId ?? ''),
    courtId: dto.courtId != null ? String(dto.courtId) : undefined,
    courtName: dto.courtName || 'Tất cả sân con',
    name: dto.name || 'Khung giờ tiêu chuẩn',
    dayOfWeek,
    dayOfWeekNumber: dto.dayOfWeek != null ? Number(dto.dayOfWeek) : null,
    customerType,
    startTime: normalizeTimeStr(dto.startTime, '06:00'),
    endTime: normalizeTimeStr(dto.endTime, '17:00'),
    pricePerSlot: dto.pricePerSlot != null ? Number(dto.pricePerSlot) : Number(dto.pricePerHour || 100000),
    pricePerHour: dto.pricePerHour != null ? Number(dto.pricePerHour) : Number(dto.pricePerSlot || 100000),
    slotDurationMinutes: dto.slotDurationMinutes != null ? Number(dto.slotDurationMinutes) : 60,
    effectiveFrom: dto.effectiveFrom || undefined,
    effectiveTo: dto.effectiveTo || undefined,
  }
}

function mapMaintenanceDto(dto: any): MaintenanceBlock {
  return {
    id: String(dto.id),
    facilityId: String(dto.facilityId ?? ''),
    facilityName: dto.facilityName || '',
    courtId: String(dto.courtId ?? ''),
    courtName: dto.courtName || 'Sân con',
    date: String(dto.date),
    startTime: normalizeTimeStr(dto.startTime, '13:00'),
    endTime: normalizeTimeStr(dto.endTime, '16:00'),
    reason: dto.reason || 'Bảo dưỡng định kỳ',
    status: dto.status || 'ACTIVE',
    createdAt: dto.createdAt || new Date().toISOString(),
  }
}

function mapOwnerBookingDto(dto: any): OwnerBookingItem {
  return {
    id: String(dto.id),
    bookingCode: dto.bookingCode || `SMC-${dto.id}`,
    facilityId: String(dto.facilityId ?? ''),
    facilityName: dto.facilityName || 'Cụm sân SmashCourt',
    courtId: String(dto.courtId ?? ''),
    courtName: dto.courtName || 'Sân 1',
    customerName: dto.customerName || 'Khách đặt sân',
    customerPhone: dto.customerPhone || '0912 345 678',
    customerEmail: dto.customerEmail || '',
    bookingDate: String(dto.bookingDate),
    startTime: normalizeTimeStr(dto.startTime, '18:00'),
    endTime: normalizeTimeStr(dto.endTime, '20:00'),
    totalAmount: Number(dto.totalAmount || 0),
    status: dto.status || 'CONFIRMED',
    holdExpiresAt: dto.holdExpiresAt || undefined,
    createdAt: dto.createdAt || new Date().toISOString(),
  }
}

export function facilityToCourtItem(fac: Facility): BadmintonCourtItem {
  return {
    id: fac.id,
    name: fac.name,
    logoUrl: fac.logoUrl || '/images/logos/badminton-club-logo.svg',
    imageUrl: fac.imageUrl,
    galleryImages: fac.galleryImages,
    distance: fac.distance,
    address: fac.address || fac.normalizedAddress,
    district: fac.district,
    city: fac.city,
    ward: fac.ward,
    streetAddress: fac.streetAddress,
    minPrice: fac.minPrice,
    maxPrice: fac.maxPrice,
    phone: fac.phone,
    messengerUrl: fac.messengerUrl,
    openHours: String(fac.openHours || '').replace('23:59', '24:00'),
    rating: fac.rating,
    reviewCount: fac.reviewCount,
    pricePerHour: fac.pricePerHour,
    amenities: fac.amenities,
    tags: ['Đơn ngày', 'Sự kiện'],
    latitude: fac.latitude,
    longitude: fac.longitude,
    sportType: fac.sportType || 'badminton',
  }
}

export const courtApi = {
  getFavorites: async (): Promise<string[]> =>
    (await apiRequest<number[]>('/facilities/favorites')).map(String),

  setFavorite: (facilityId: string, favorite: boolean): Promise<void> =>
    apiRequest(`/facilities/favorites/${facilityId}`, { method: favorite ? 'PUT' : 'DELETE' }),

  searchFacilities: async (params: FacilityFilterParams = {}): Promise<Facility[]> => {
    const qs = new URLSearchParams()
    if (params.keyword?.trim()) qs.set('keyword', params.keyword.trim())
    if (params.city?.trim()) qs.set('city', params.city.trim())
    if (params.district?.trim()) qs.set('district', params.district.trim())
    if (params.ward?.trim()) qs.set('ward', params.ward.trim())
    if (params.sportType?.trim() && params.sportType !== 'all') qs.set('sportType', params.sportType.trim())
    if (params.minPrice != null) qs.set('minPrice', String(params.minPrice))
    if (params.maxPrice != null) qs.set('maxPrice', String(params.maxPrice))
    if (params.lat != null) qs.set('lat', String(params.lat))
    if (params.lng != null) qs.set('lng', String(params.lng))
    if (params.radiusKm != null) qs.set('radiusKm', String(params.radiusKm))
    if (params.sortBy) qs.set('sortBy', params.sortBy)
    if (params.amenities && params.amenities.length > 0) {
      params.amenities.forEach((am) => qs.append('amenities', am))
    }

    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    const data = await apiRequest<any[]>(`/facilities${suffix}`)
    return data.map(mapFacilityDto)
  },

  getFilterMetadata: (): Promise<FacilityFilterMetadata> => apiRequest('/facilities/metadata'),

  getFacilityDetail: async (
    facilityId: string
  ): Promise<{ facility: Facility; priceRules: PriceRule[]; maintenanceBlocks: MaintenanceBlock[] }> => {
    const dto = await apiRequest<any>(`/facilities/${facilityId}`)
    return {
      facility: mapFacilityDto({ ...dto.facility, courts: dto.courts }),
      priceRules: dto.priceRules.map(mapPriceRuleDto),
      maintenanceBlocks: dto.activeMaintenanceBlocks.map(mapMaintenanceDto),
    }
  },

  getOwnerFacilities: async (): Promise<Facility[]> =>
    (await apiRequest<any[]>('/owner/facilities')).map(mapFacilityDto),

  createFacility: async (payload: FacilityUpsertPayload): Promise<Facility> =>
    mapFacilityDto(await apiRequest('/owner/facilities', {
      method: 'POST',
      body: JSON.stringify(payload),
    })),

  updateFacility: async (facilityId: string, payload: FacilityUpsertPayload): Promise<Facility> =>
    mapFacilityDto(await apiRequest(`/owner/facilities/${facilityId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })),

  updateFacilityStatus: async (
    facilityId: string,
    status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
  ): Promise<Facility> =>
    mapFacilityDto(await apiRequest(`/owner/facilities/${facilityId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })),

  deleteFacility: (facilityId: string): Promise<void> =>
    apiRequest(`/owner/facilities/${facilityId}`, { method: 'DELETE' }),

  addSubCourt: async (facilityId: string, payload: CourtUpsertPayload): Promise<SubCourt> =>
    mapCourtDto(await apiRequest(`/owner/facilities/${facilityId}/courts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }), facilityId),

  updateSubCourt: async (facilityId: string, courtId: string, payload: CourtUpsertPayload): Promise<SubCourt> =>
    mapCourtDto(await apiRequest(`/owner/courts/${courtId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }), facilityId),

  deleteSubCourt: (courtId: string): Promise<void> =>
    apiRequest(`/owner/courts/${courtId}`, { method: 'DELETE' }),

  getOwnerPriceRules: async (facilityId: string): Promise<PriceRule[]> =>
    (await apiRequest<any[]>(`/owner/facilities/${facilityId}/price-rules`)).map(mapPriceRuleDto),

  createPriceRule: async (facilityId: string, payload: PriceRuleUpsertPayload): Promise<PriceRule> =>
    mapPriceRuleDto(await apiRequest(`/owner/facilities/${facilityId}/price-rules`, {
      method: 'POST',
      body: JSON.stringify({ ...payload, courtId: payload.courtId ? Number(payload.courtId) : null }),
    })),

  updatePriceRule: async (ruleId: string, payload: PriceRuleUpsertPayload): Promise<PriceRule> =>
    mapPriceRuleDto(await apiRequest(`/owner/price-rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...payload, courtId: payload.courtId ? Number(payload.courtId) : null }),
    })),

  deletePriceRule: (ruleId: string): Promise<void> =>
    apiRequest(`/owner/price-rules/${ruleId}`, { method: 'DELETE' }),

  getMaintenanceBlocks: async (facilityId: string): Promise<MaintenanceBlock[]> =>
    (await apiRequest<any[]>(`/owner/facilities/${facilityId}/maintenance`)).map(mapMaintenanceDto),

  createMaintenanceBlock: async (
    facilityId: string,
    payload: MaintenanceCreatePayload
  ): Promise<MaintenanceBlock[]> => {
    const data = await apiRequest<any[]>(`/owner/facilities/${facilityId}/maintenance`, {
      method: 'POST',
      body: JSON.stringify({ ...payload, courtId: payload.courtId ? Number(payload.courtId) : null }),
    })
    return data.map(mapMaintenanceDto)
  },

  releaseMaintenanceBlock: (blockId: string): Promise<void> =>
    apiRequest(`/owner/maintenance/${blockId}`, { method: 'DELETE' }),

  getOwnerDashboard: async (facilityId?: string, fromDate?: string, toDate?: string): Promise<OwnerDashboardData> => {
    const qs = new URLSearchParams()
    if (facilityId) qs.set('facilityId', facilityId)
    if (fromDate) qs.set('fromDate', fromDate)
    if (toDate) qs.set('toDate', toDate)
    const dto = await apiRequest<any>(`/owner/dashboard?${qs}`)
    return {
      facilityId: String(dto.facilityId ?? ''),
      facilityName: dto.facilityName || '',
      fromDate: String(dto.fromDate),
      toDate: String(dto.toDate),
      totalRevenue: Number(dto.totalRevenue || 0),
      todayRevenue: Number(dto.todayRevenue || 0),
      confirmedBookings: Number(dto.confirmedBookings || 0),
      completedBookings: Number(dto.completedBookings || 0),
      heldBookings: Number(dto.heldBookings || 0),
      cancelledBookings: Number(dto.cancelledBookings || 0),
      occupancyRate: Number(dto.occupancyRate || 0),
      activeCourts: Number(dto.activeCourts || 0),
      maintenanceCourts: Number(dto.maintenanceCourts || 0),
      totalCourts: Number(dto.totalCourts || 0),
      dailyRevenueSeries: (dto.dailyRevenueSeries || []).map((d: any) => ({
        date: String(d.date),
        label: d.label,
        revenue: Number(d.revenue || 0),
        bookingCount: Number(d.bookingCount || 0),
      })),
      courtRevenues: (dto.courtRevenues || []).map((c: any) => ({
        courtId: String(c.courtId),
        courtName: c.courtName,
        courtType: c.courtType,
        status: c.status,
        revenue: Number(c.revenue || 0),
        bookingCount: Number(c.bookingCount || 0),
        bookedHours: Number(c.bookedHours || 0),
      })),
      hourlyBands: (dto.hourlyBands || []).map((b: any) => ({
        bandLabel: b.bandLabel,
        occupancyPercent: Number(b.occupancyPercent || 0),
        bookedSlots: Number(b.bookedSlots || 0),
        isPeak: Boolean(b.isPeak),
      })),
      liveCourtStatuses: (dto.liveCourtStatuses || []).map((s: any) => ({
        courtId: String(s.courtId),
        courtName: s.courtName,
        courtType: s.courtType,
        liveStatus: s.liveStatus,
        currentInfo: s.currentInfo,
      })),
      todayCheckInQueue: (dto.todayCheckInQueue || []).map(mapOwnerBookingDto),
    }
  },

  getOwnerBookings: async (params: {
    facilityId?: string
    status?: string
    date?: string
    keyword?: string
  }): Promise<OwnerBookingItem[]> => {
    const qs = new URLSearchParams()
    if (params.facilityId) qs.set('facilityId', params.facilityId)
    if (params.status && params.status !== 'ALL') qs.set('status', params.status)
    if (params.date) qs.set('date', params.date)
    if (params.keyword?.trim()) qs.set('keyword', params.keyword.trim())
    const data = await apiRequest<any[]>(`/owner/bookings?${qs}`)
    return data.map(mapOwnerBookingDto)
  },

  updateOwnerBookingStatus: async (bookingId: string, status: OwnerBookingItem['status']): Promise<void> => {
    await apiRequest(`/owner/bookings/${bookingId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  uploadImages: async (files: File[]): Promise<UploadedImageItem[]> => {
    if (files.length === 0) return []
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return apiRequest('/owner/uploads/images', { method: 'POST', body: formData })
  },
}
