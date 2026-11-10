import type { TimeSlot } from './types'

const seconds = (time: string) => {
  const [hours, minutes, seconds = 0] = time.split(':').map(Number)
  return hours * 3600 + minutes * 60 + seconds
}

export function isSlotInRange(slot: TimeSlot, range: TimeSlot | null): boolean {
  return !!range && seconds(slot.startTime) < seconds(range.endTime)
    && seconds(slot.endTime) > seconds(range.startTime)
}

// Clicking outside the range extends it; clicking inside trims it at that cell.
export function selectTimeRange(current: TimeSlot | null, clicked: TimeSlot, slots: TimeSlot[]): TimeSlot | null {
  let startTime = clicked.startTime
  let endTime = clicked.endTime
  if (current) {
    startTime = seconds(current.startTime) < seconds(clicked.startTime) ? current.startTime : clicked.startTime
    endTime = seconds(current.endTime) > seconds(clicked.endTime) ? current.endTime : clicked.endTime
    if (isSlotInRange(clicked, current)) {
      if (seconds(clicked.startTime) <= seconds(current.startTime)) startTime = clicked.endTime
      else endTime = clicked.startTime
      if (seconds(startTime) >= seconds(endTime)) return null
    }
  }

  const range = { ...clicked, startTime, endTime }
  const covered = slots.filter(slot => isSlotInRange(slot, range))
    .sort((a, b) => seconds(a.startTime) - seconds(b.startTime))
  let cursor = seconds(startTime)
  let price = 0
  for (const slot of covered) {
    if (!slot.available || seconds(slot.startTime) > cursor) {
      throw new Error('Khoảng giờ có ô đã đặt, đang giữ chỗ hoặc không khả dụng. Vui lòng chọn các giờ trống liên tiếp.')
    }
    const end = Math.min(seconds(slot.endTime), seconds(endTime))
    price += slot.price * (end - cursor) / (seconds(slot.endTime) - seconds(slot.startTime))
    cursor = end
  }
  if (cursor !== seconds(endTime)) throw new Error('Lịch sân chưa đầy đủ. Vui lòng chọn lại khoảng giờ.')
  return { ...range, price }
}
