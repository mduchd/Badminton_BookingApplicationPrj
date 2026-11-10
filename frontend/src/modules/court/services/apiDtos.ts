import type { OwnerDashboardData, OwnerBookingItem } from '../../types/court'

type Id = number | string
export interface CourtDto {
  id: Id; facilityId?: Id; name?: string; courtNumber?: number; courtType?: string; basePricePerHour?: number
  surfaceType?: string; description?: string; status?: string
}
export interface FacilityDto {
  id: Id; ownerId?: Id; slug?: string; name?: string; status?: string; openTime?: string; closeTime?: string
  galleryImages?: string[]; imageUrl?: string; logoUrl?: string; latitude?: number; longitude?: number
  normalizedAddress?: string; streetAddress?: string; ward?: string; district?: string; city?: string; address?: string
  distanceKm?: number; openHours?: string; mapsEmbedUrl?: string; mapsDirectionsUrl?: string; sportType?: string
  rating?: number; reviewCount?: number; minPrice?: number; maxPrice?: number; pricePerHour?: number; amenities?: string[]
  phone?: string; messengerUrl?: string; description?: string; isApproved?: boolean; courts?: CourtDto[]
}
export interface PriceRuleDto {
  id: Id; facilityId?: Id; courtId?: Id; courtName?: string; name?: string; dayType?: string; customerType?: string
  dayOfWeek?: number; startTime?: string; endTime?: string; pricePerSlot?: number; pricePerHour?: number
  slotDurationMinutes?: number; effectiveFrom?: string; effectiveTo?: string
}
export interface MaintenanceDto {
  id: Id; facilityId?: Id; facilityName?: string; courtId?: Id; courtName?: string; date: string
  startTime?: string; endTime?: string; reason?: string; status?: string; createdAt?: string
}
export interface OwnerBookingDto {
  id: Id; facilityId?: Id; courtId?: Id; bookingCode?: string; facilityName?: string; courtName?: string
  customerName?: string; customerPhone?: string; customerEmail?: string; bookingDate: string; startTime?: string; endTime?: string
  totalAmount?: number; status?: OwnerBookingItem['status']; holdExpiresAt?: string; createdAt?: string
}
export interface FacilityDetailDto { facility: FacilityDto; courts: CourtDto[]; priceRules: PriceRuleDto[]; activeMaintenanceBlocks: MaintenanceDto[] }
export interface OwnerDashboardDto {
  facilityId?: Id; facilityName: string; fromDate: string; toDate: string; totalRevenue: number; todayRevenue: number
  confirmedBookingsCount: number; completedBookingsCount: number; heldBookingsCount: number; cancelledBookingsCount: number
  occupancyRatePercent: number; activeCourtsCount: number; maintenanceCourtsCount: number; totalCourtsCount: number
  dailyRevenue: OwnerDashboardData['dailyRevenueSeries']
  courtRevenues: Array<Omit<OwnerDashboardData['courtRevenues'][number], 'courtId'> & { courtId: Id }>
  hourlyBands: Array<{ bandLabel: string; occupancyPercent: number; bookingCount: number }>
  liveCourts: Array<{ courtId: Id; courtName: string; courtType: string; currentStatus: OwnerDashboardData['liveCourtStatuses'][number]['liveStatus']; currentSlotInfo: string }>
  todayCheckInQueue: OwnerBookingDto[]
}
