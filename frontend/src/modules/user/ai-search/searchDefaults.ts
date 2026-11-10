import type { SearchCriteria } from '../../types/user'

const vietnamTomorrow = () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const date = new Date(`${today}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

export const defaultCriteria: SearchCriteria = {
  locationText: 'Hà Nội',
  district: '',
  date: vietnamTomorrow(),
  startTime: '19:00',
  endTime: '21:00',
  maxPricePerHour: undefined,
  amenities: [],
  sortBy: 'distance_asc',
}
