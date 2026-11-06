export type BookingStatus = 'HELD' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

export type PaymentMethod = 'PAYOS' | 'ON_SITE' | 'MOCK'

export interface BookingSlot {
  slotId: string
  courtId: string
  courtName: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  price: number
}

export interface BookingOrder {
  id: string
  bookingCode: string // e.g. "SC-82914"
  facilityId: string
  facilityName: string
  facilityAddress: string
  facilityLogo?: string
  slots: BookingSlot[]
  totalAmount: number
  status: BookingStatus
  holdExpiresAt: string // ISO string or timestamp (10 mins hold)
  paymentMethod?: PaymentMethod
  paidAt?: string
  customerName: string
  customerPhone: string
  customerEmail: string
  notes?: string
  createdAt: string
  googleEventId?: string
}
