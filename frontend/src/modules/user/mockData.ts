import type { SearchCriteria } from '../types/user'

export interface BadmintonCourtItem {
  id: string
  name: string
  logoUrl: string
  imageUrl: string
  distance: string
  address: string
  openHours: string
  rating?: number
  reviewCount?: number
  tags: ('Đơn ngày' | 'Sự kiện')[]
  district: string
  pricePerHour: number
  amenities: string[]
  isFavorite?: boolean
  latitude: number
  longitude: number
  sportType: 'badminton' | 'pickleball' | 'football' | 'basketball' | 'tennis'
}

export interface SessionMatch {
  id: string
  clubName: string
  clubLogo: string
  distance: string
  schedulesToday: number
  activeSlotIndex: number
  slots: {
    time: string
    subtext: string
    available: boolean
  }[]
  detail: {
    levelText: string
    isLive: boolean
    timeRange: string
    ticketType: string
    courtNumbers: string
    capacityText: string
    pricePerTicket: number
  }
}

export const mockBadmintonCourts: BadmintonCourtItem[] = []

export const mockSessions: SessionMatch[] = []

export const defaultCriteria: SearchCriteria = {
  locationText: 'Hà Nội',
  district: '',
  date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  startTime: '19:00',
  endTime: '21:00',
  maxPricePerHour: undefined,
  amenities: [],
  sortBy: 'distance_asc',
}

export const availableDistricts = [
  'Tất cả quận/huyện',
  'Đống Đa',
  'Hoàn Kiếm',
  'Cầu Giấy',
  'Nam Từ Liêm',
  'Ba Đình',
  'Hai Bà Trưng',
  'Thanh Xuân',
]

export const availableAmenities = [
  'Máy lạnh',
  'Bãi đỗ ô tô',
  'Tắm nóng lạnh',
  'Thuê vợt',
  'Bán nước & cầu',
  'Phòng xông hơi',
]
