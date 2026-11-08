export interface SubCourt {
  id: string
  facilityId: string
  name: string
  courtType: 'standard' | 'vip' | 'training'
  status: 'active' | 'maintenance' | 'inactive'
}

export interface Facility {
  id: string
  name: string
  logoUrl: string
  imageUrl: string
  galleryImages: string[]
  distance: string
  address: string
  district: string
  city: string
  openHours: string
  rating: number
  reviewCount: number
  pricePerHour: number
  amenities: string[]
  latitude: number
  longitude: number
  phone: string
  description: string
  ownerId: string
  isApproved: boolean
  status: 'active' | 'paused' | 'ACTIVE' | 'PENDING_APPROVAL' | 'PAUSED' | 'REJECTED'
  rejectionReason?: string
  subCourtCount?: number
  subCourts: SubCourt[]
}

export interface PriceRule {
  id: string
  facilityId: string
  courtId?: string // undefined = áp dụng toàn cụm sân
  name: string
  dayOfWeek: 'ALL' | 'WEEKDAY' | 'WEEKEND'
  startTime: string // HH:mm
  endTime: string // HH:mm
  pricePerHour: number
}

export interface MaintenanceBlock {
  id: string
  facilityId: string
  courtId: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  reason: string
  createdAt: string
}
