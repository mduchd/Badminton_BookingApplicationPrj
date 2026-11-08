export interface SubCourt {
  id: string
  facilityId: string
  name: string
  courtNumber?: number
  courtType: 'standard' | 'vip' | 'training'
  basePricePerHour?: number
  surfaceType?: string
  description?: string
  status: 'active' | 'maintenance' | 'inactive'
}

export interface Facility {
  id: string
  slug?: string
  name: string
  logoUrl: string
  imageUrl: string
  galleryImages: string[]
  distance: string
  streetAddress?: string
  ward?: string
  district: string
  city: string
  address: string
  normalizedAddress?: string
  openTime?: string
  closeTime?: string
  openHours: string
  mapsEmbedUrl?: string
  mapsDirectionsUrl?: string
  sportType?: 'badminton' | 'pickleball' | 'football' | 'basketball' | 'tennis'
  rating: number
  reviewCount: number
  minPrice?: number
  maxPrice?: number
  pricePerHour: number
  amenities: string[]
  latitude: number
  longitude: number
  phone: string
  messengerUrl?: string
  description: string
  ownerId: string
  isApproved: boolean
  status: 'active' | 'paused' | 'maintenance' | 'inactive' | 'ACTIVE' | 'PENDING_APPROVAL' | 'PAUSED' | 'REJECTED'
  rejectionReason?: string
  subCourtCount?: number
  subCourts: SubCourt[]
}

export type DayTypeFilter = 'ALL' | 'WEEKDAY' | 'WEEKEND'
export type CustomerPricingType = 'CASUAL' | 'FIXED_MONTHLY'

export interface PriceRule {
  id: string
  facilityId: string
  courtId?: string
  courtName?: string
  name: string
  dayOfWeek: DayTypeFilter
  dayOfWeekNumber?: number | null
  customerType?: CustomerPricingType
  startTime: string
  endTime: string
  pricePerSlot?: number
  pricePerHour: number
  slotDurationMinutes?: number
  effectiveFrom?: string
  effectiveTo?: string
}

export interface MaintenanceBlock {
  id: string
  facilityId: string
  facilityName?: string
  courtId: string
  courtName: string
  date: string
  startTime: string
  endTime: string
  reason: string
  status?: string
  createdAt: string
}

export interface DailyRevenuePoint {
  date: string
  label: string
  revenue: number
  bookingCount: number
}

export interface CourtRevenueItem {
  courtId: string
  courtName: string
  courtType: string
  status: string
  revenue: number
  bookingCount: number
  bookedHours: number
}

export interface HourlyBandOccupancy {
  bandLabel: string
  occupancyPercent: number
  bookedSlots: number
  isPeak: boolean
}

export interface LiveCourtStatusItem {
  courtId: string
  courtName: string
  courtType: string
  liveStatus: 'AVAILABLE' | 'PLAYING' | 'HELD' | 'MAINTENANCE'
  currentInfo: string
}

export interface OwnerBookingItem {
  id: string
  bookingCode: string
  facilityId: string
  facilityName: string
  courtId: string
  courtName: string
  customerName: string
  customerPhone: string
  customerEmail: string
  bookingDate: string
  startTime: string
  endTime: string
  totalAmount: number
  status: 'HELD' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  holdExpiresAt?: string
  createdAt: string
}

export interface OwnerDashboardData {
  facilityId: string
  facilityName: string
  fromDate: string
  toDate: string
  totalRevenue: number
  todayRevenue: number
  confirmedBookings: number
  completedBookings: number
  heldBookings: number
  cancelledBookings: number
  occupancyRate: number
  activeCourts: number
  maintenanceCourts: number
  totalCourts: number
  dailyRevenueSeries: DailyRevenuePoint[]
  courtRevenues: CourtRevenueItem[]
  hourlyBands: HourlyBandOccupancy[]
  liveCourtStatuses: LiveCourtStatusItem[]
  todayCheckInQueue: OwnerBookingItem[]
}

export interface UploadedImageItem {
  url: string
  publicId: string
  provider: 'CLOUDINARY' | 'LOCAL_STORAGE'
  originalFilename: string
  bytes: number
}

export interface FacilityFilterParams {
  keyword?: string
  city?: string
  district?: string
  ward?: string
  sportType?: string
  amenities?: string[]
  minPrice?: number
  maxPrice?: number
  lat?: number
  lng?: number
  radiusKm?: number
  sortBy?: 'rating_desc' | 'price_asc' | 'price_desc' | 'distance_asc'
}

export interface FacilityFilterMetadata {
  cities: string[]
  districts: string[]
  amenities: string[]
}

export interface CourtUpsertPayload {
  name: string
  courtNumber?: number
  courtType: 'STANDARD' | 'VIP' | 'TRAINING'
  basePricePerHour: number
  surfaceType?: string
  description?: string
  status?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
}

export interface FacilityUpsertPayload {
  name: string
  city: string
  district: string
  ward?: string
  streetAddress?: string
  address?: string
  latitude?: number
  longitude?: number
  openTime: string
  closeTime: string
  phone?: string
  messengerUrl?: string
  description?: string
  logoUrl?: string
  imageUrl?: string
  galleryImages?: string[]
  amenities?: string[]
  sportType?: string
  status?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE'
  courts?: CourtUpsertPayload[]
}

export interface PriceRuleUpsertPayload {
  courtId?: string | null
  name: string
  dayOfWeek?: number | null
  dayType: DayTypeFilter
  customerType: CustomerPricingType
  startTime: string
  endTime: string
  pricePerSlot: number
  slotDurationMinutes?: number
  effectiveFrom?: string | null
  effectiveTo?: string | null
}

export interface MaintenanceCreatePayload {
  courtId?: string | null
  applyAllCourts?: boolean
  date: string
  startTime: string
  endTime: string
  reason: string
}

export interface BadmintonCourtItem {
  id: string
  name: string
  logoUrl: string
  imageUrl: string
  galleryImages?: string[]
  distance: string
  address: string
  openHours: string
  rating?: number
  reviewCount?: number
  tags: ('Đơn ngày' | 'Sự kiện')[]
  district: string
  city?: string
  ward?: string
  streetAddress?: string
  courtCount?: number
  minPrice?: number
  maxPrice?: number
  phone?: string
  messengerUrl?: string
  pricePerHour: number
  amenities: string[]
  isFavorite?: boolean
  latitude: number
  longitude: number
  sportType: 'badminton' | 'pickleball' | 'football' | 'basketball' | 'tennis'
}
