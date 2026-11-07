import type { BookingOrder } from '../modules/types/booking'
import type { Facility, PriceRule, MaintenanceBlock } from '../modules/types/court'
import { mockBadmintonCourts } from '../modules/user/mockData'

const STORAGE_KEYS = {
  BOOKINGS: 'smashcourt_bookings_v1',
  FACILITIES: 'smashcourt_facilities_v1',
  PRICE_RULES: 'smashcourt_price_rules_v1',
  MAINTENANCE_BLOCKS: 'smashcourt_blocks_v1',
}

// Convert existing mock courts to full Facility objects
export const initialFacilities: Facility[] = mockBadmintonCourts.map((c, idx) => ({
  id: c.id,
  name: c.name,
  logoUrl: c.logoUrl,
  imageUrl: c.imageUrl,
  galleryImages: [
    c.imageUrl,
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&auto=format&fit=crop&q=80',
  ],
  distance: c.distance,
  address: c.address,
  district: c.district,
  city: 'Hà Nội',
  openHours: c.openHours || '05:30 - 23:00',
  rating: c.rating || 4.8,
  reviewCount: c.reviewCount || 120,
  pricePerHour: c.pricePerHour || 120000,
  amenities: c.amenities || ['Máy lạnh', 'Bãi đỗ ô tô', 'Tắm nóng lạnh', 'Thuê vợt', 'Bán nước & cầu'],
  latitude: c.latitude || 21.0285,
  longitude: c.longitude || 105.8542,
  phone: '0988 234 567',
  description: `${c.name} sở hữu sàn thảm tiêu chuẩn BWF chống trơn trượt, hệ thống chiếu sáng led chống chói hiện đại, khu vực ngồi chờ rộng rãi có máy lạnh và căng tin giải khát. Thích hợp cho cả tập luyện chuyên nghiệp lẫn giao lưu phong trào.`,
  ownerId: idx % 2 === 0 ? 'usr_owner_1' : 'usr_owner_2',
  isApproved: true,
  status: 'active',
  subCourts: [
    { id: `${c.id}_c1`, facilityId: c.id, name: 'Sân 1 (Thảm tiêu chuẩn BWF)', courtType: 'standard', status: 'active' },
    { id: `${c.id}_c2`, facilityId: c.id, name: 'Sân 2 (Thảm tiêu chuẩn BWF)', courtType: 'standard', status: 'active' },
    { id: `${c.id}_c3`, facilityId: c.id, name: 'Sân 3 (Thảm cao cấp)', courtType: 'vip', status: 'active' },
    { id: `${c.id}_c4`, facilityId: c.id, name: 'Sân 4 (Thảm tập luyện)', courtType: 'training', status: 'active' },
  ],
}))

export const initialPriceRules: PriceRule[] = [
  {
    id: 'pr_1',
    facilityId: 'court_1',
    name: 'Khung giờ sáng & chiều thường',
    dayOfWeek: 'ALL',
    startTime: '06:00',
    endTime: '17:00',
    pricePerHour: 90000,
  },
  {
    id: 'pr_2',
    facilityId: 'court_1',
    name: 'Khung giờ vàng tối (Cao điểm)',
    dayOfWeek: 'ALL',
    startTime: '17:00',
    endTime: '22:00',
    pricePerHour: 140000,
  },
  {
    id: 'pr_3',
    facilityId: 'court_1',
    name: 'Khung giờ muộn',
    dayOfWeek: 'ALL',
    startTime: '22:00',
    endTime: '23:30',
    pricePerHour: 80000,
  },
]

export const initialMaintenanceBlocks: MaintenanceBlock[] = []

export const initialBookings: BookingOrder[] = []

// Storage Helper Functions
export const appStore = {
  getFacilities: (): Facility[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FACILITIES)
      if (data) {
        const parsed: Facility[] = JSON.parse(data)
        const existingIds = new Set(parsed.map((f) => f.id))
        const missing = initialFacilities.filter((f) => !existingIds.has(f.id))
        if (missing.length > 0) {
          return [...parsed, ...missing]
        }
        return parsed
      }
    } catch {
      // fallback
    }
    return initialFacilities
  },

  getFacilityById: (id: string): Facility | undefined => {
    const list = appStore.getFacilities()
    const cleanId = String(id || '').trim()
    return (
      list.find((f) => f.id === cleanId) ||
      list.find((f) => f.id === `court_${cleanId}`) ||
      list.find((f) => f.id.replace('court_', '') === cleanId) ||
      initialFacilities.find(
        (f) =>
          f.id === cleanId ||
          f.id === `court_${cleanId}` ||
          f.id.replace('court_', '') === cleanId
      )
    )
  },

  saveFacilities: (list: Facility[]) => {
    localStorage.setItem(STORAGE_KEYS.FACILITIES, JSON.stringify(list))
  },

  updateFacility: (facility: Facility) => {
    const list = appStore.getFacilities()
    const idx = list.findIndex((f) => f.id === facility.id)
    if (idx >= 0) {
      list[idx] = facility
    } else {
      list.push(facility)
    }
    appStore.saveFacilities(list)
  },

  getBookings: (): BookingOrder[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS)
      if (data) {
        const bookings: BookingOrder[] = JSON.parse(data)
        return bookings.filter((booking) => !(
          (booking.id === 'bk_1001' && booking.bookingCode === 'SC-82914') ||
          (booking.id === 'bk_1002' && booking.bookingCode === 'SC-55201')
        ))
      }
    } catch {
      // fallback
    }
    return initialBookings
  },

  getBookingById: (id: string): BookingOrder | undefined => {
    const list = appStore.getBookings()
    return list.find((b) => b.id === id || b.bookingCode === id)
  },

  saveBookings: (list: BookingOrder[]) => {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list))
  },

  createBooking: (order: BookingOrder) => {
    const list = appStore.getBookings()
    list.unshift(order)
    appStore.saveBookings(list)
    return order
  },

  updateBookingStatus: (id: string, status: BookingOrder['status'], paymentMethod?: BookingOrder['paymentMethod']) => {
    const list = appStore.getBookings()
    const item = list.find((b) => b.id === id)
    if (item) {
      item.status = status
      if (paymentMethod) item.paymentMethod = paymentMethod
      if (status === 'CONFIRMED') item.paidAt = new Date().toISOString()
      appStore.saveBookings(list)
    }
  },

  getPriceRules: (facilityId?: string): PriceRule[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRICE_RULES)
      const list: PriceRule[] = data ? JSON.parse(data) : initialPriceRules
      return facilityId ? list.filter((r) => r.facilityId === facilityId) : list
    } catch {
      return initialPriceRules
    }
  },

  savePriceRules: (list: PriceRule[]) => {
    localStorage.setItem(STORAGE_KEYS.PRICE_RULES, JSON.stringify(list))
  },

  getMaintenanceBlocks: (facilityId?: string): MaintenanceBlock[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MAINTENANCE_BLOCKS)
      const list: MaintenanceBlock[] = (data ? JSON.parse(data) as MaintenanceBlock[] : initialMaintenanceBlocks).filter (block => !(block.id === 'blk_1' && block.courtId === 'court_1_c4' && block.reason === 'Bảo dưỡng định kỳ sàn thảm & thay bóng đèn led'))
      return facilityId ? list.filter((b) => b.facilityId === facilityId) : list
    } catch {
      return initialMaintenanceBlocks
    }
  },

  saveMaintenanceBlocks: (list: MaintenanceBlock[]) => {
    localStorage.setItem(STORAGE_KEYS.MAINTENANCE_BLOCKS, JSON.stringify(list))
  },
}
