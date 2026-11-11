import type { Facility } from '../types/court'

export function canOwnerChangeFacilityStatus(facility: Pick<Facility, 'status' | 'isApproved'>): boolean {
  return facility.isApproved && ['ACTIVE', 'MAINTENANCE', 'INACTIVE'].includes(facility.status.toUpperCase())
}

export function facilityStatusLabel(facility: Pick<Facility, 'status' | 'isApproved'>): string {
  const status = facility.status.toUpperCase()
  if (status === 'REJECTED') return 'Bị từ chối'
  if (!facility.isApproved || status === 'PENDING_APPROVAL') return 'Chờ duyệt'
  if (status === 'PAUSED' || status === 'SUSPENDED') return 'Bị quản trị viên tạm khóa'
  if (status === 'ACTIVE') return 'Đang hoạt động'
  if (status === 'MAINTENANCE') return 'Đang bảo trì'
  return 'Tạm ngưng'
}
