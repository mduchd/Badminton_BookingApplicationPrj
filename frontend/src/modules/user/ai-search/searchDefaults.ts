import type { SearchCriteria } from '../../types/user'

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
