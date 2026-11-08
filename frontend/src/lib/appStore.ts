import type { BookingOrder } from '../modules/types/booking'
import type { Facility, PriceRule, MaintenanceBlock } from '../modules/types/court'

const STORAGE_KEYS = {
  BOOKINGS: 'smashcourt_bookings_v1',
  FACILITIES: 'smashcourt_facilities_v1',
  PRICE_RULES: 'smashcourt_price_rules_v1',
  MAINTENANCE_BLOCKS: 'smashcourt_blocks_v1',
}

export const initialFacilities: Facility[] = []
export const initialPriceRules: PriceRule[] = []

export const initialMaintenanceBlocks: MaintenanceBlock[] = []

export const initialBookings: BookingOrder[] = []

// Storage Helper Functions
export const appStore = {
  getFacilities: (): Facility[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FACILITIES)
      if (data) {
        const parsed: Facility[] = JSON.parse(data)
        return parsed.filter((f) => !(
          /^court_\d+$/.test(f.id) &&
          (f.ownerId === 'usr_owner_1' || f.ownerId === 'usr_owner_2') &&
          f.description === `${f.name} sở hữu sàn thảm tiêu chuẩn BWF chống trơn trượt, hệ thống chiếu sáng led chống chói hiện đại, khu vực ngồi chờ rộng rãi có máy lạnh và căng tin giải khát. Thích hợp cho cả tập luyện chuyên nghiệp lẫn giao lưu phong trào.`
        ))
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
