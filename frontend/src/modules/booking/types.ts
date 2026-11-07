export type BookingStatus = 
  | 'HELD'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type SlotStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'MAINTENANCE';

export interface TimeSlot {
  startTime: string; // "05:00:00"
  endTime: string;   // "06:00:00"
  price: number;
  available: boolean;
  slotStatus: SlotStatus;
  reason?: string;
}

export interface CourtAvailability {
  courtId: number;
  courtName: string;
  facilityId: number;
  facilityName: string;
  date: string;
  openTime: string;
  closeTime: string;
  slots: TimeSlot[];
}

export interface BookingCreateRequest {
  courtId: number;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:mm:ss
  endTime: string;     // HH:mm:ss
  note?: string;
  customerId?: number;
}

export interface BookingResponse {
  id: number;
  customerId: number;
  facilityId: number;
  facilityName: string;
  courtId: number;
  courtName: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  currency: string;
  status: BookingStatus;
  holdExpiresAt?: string;
  note?: string;
  createdAt: string;
  googleCalendarUrl?: string;
}

export interface CheckoutRequest {
  paymentMethod: 'PAYOS' | 'MOCK';
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResponse {
  bookingId: number;
  orderCode: number;
  amount: number;
  paymentMethod: string;
  checkoutUrl: string;
  qrCode?: string;
  status: string;
  holdExpiresAt?: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}
