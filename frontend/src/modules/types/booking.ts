export interface BookingSlot {
  slotId: string
  courtId: string
  courtName: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  endTime: string // HH:mm
  price: number
}
