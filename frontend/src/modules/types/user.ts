export type UserRole = 'CUSTOMER' | 'COURT_OWNER' | 'SYSTEM_ADMIN'

export interface User {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  role: UserRole
  provider: 'LOCAL' | 'GOOGLE'
  phone?: string
  fcmEnabled?: boolean
  calendarConnected?: boolean
  calendarEmail?: string
}

export interface SearchCriteria {
  city?: string
  maxTotalPrice?: number
  durationMinutes?: number
  sportType?: 'badminton' | 'pickleball'
  locationText: string
  district: string
  date: string
  startTime: string
  endTime: string
  maxPricePerHour?: number
  amenities: string[]
  sortBy?: 'price_asc' | 'price_desc' | 'rating_desc' | 'distance_asc'
}

export interface CourtResult {
  courtId: string
  facilityId: string
  facilityName: string
  courtName: string
  address: string
  district: string
  imageUrl: string
  rating: number
  reviewCount: number
  startTime: string
  endTime: string
  durationHours: number
  pricePerHour: number
  calculatedTotalPrice: number
  amenities: string[]
  availabilityCheckedAt: string
  isAvailable: boolean
  googleMapsUrl: string
}

export interface NotificationItem {
  id: string
  type: 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'REMINDER_DUE' | 'PAYMENT_SUCCESS' | 'SYSTEM'
  title: string
  body: string
  isRead: boolean
  createdAt: string
  link?: string
}

export interface AIMessage {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: string
  extractedCriteria?: Partial<SearchCriteria>
  matchedCount?: number
  isError?: boolean
  recommendedCourts?: AiCourtRecommendation[]
  followUpChips?: string[]
}

export interface AiCourtRecommendation {
  facilityId: number
  facilityName: string
  address: string
  openHours: string
  minPricePerHour?: number
  matchReason: string
  courtId?: number
  courtName?: string
  date?: string
  startTime?: string
  endTime?: string
  totalPrice?: number
  checkedAt?: string
}
