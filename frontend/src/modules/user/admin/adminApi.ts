import axios from 'axios'
import type { UserRole } from '../../types/user'
import { API_BASE_URL } from '../../../lib/apiConfig'
import { authStorage } from '../auth/authApi'

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  const token = authStorage.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export interface AdminDashboardMetrics {
  totalUsers: number
  totalCustomers: number
  totalCourtOwners: number
  totalAdmins: number
  totalFacilities: number
  activeFacilities: number
  pendingFacilities: number
  pausedFacilities: number
  totalBookings: number
  confirmedBookings: number
  cancelledBookings: number
  totalGmv: number
  platformRevenue: number
  platformCommissionPercent: number
  recentTransactions: AdminTransaction[]
  bookingsByDistrict: Record<string, number>
}

export interface AloBookingFacilityProfile {
  facilityId: number
  alobookingCode: string
  publishedCourtCount: number | null
  publicContact: string | null
  bookingUrl: string | null
  bookingSourceUrl: string | null
}

export interface AdminFacilityItem {
  id: number | string
  ownerId?: number | string
  ownerName: string
  ownerEmail: string
  ownerPhone: string
  name: string
  city: string
  district: string
  ward: string
  address: string
  openTime?: string
  closeTime?: string
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'PAUSED' | 'REJECTED' | string
  isApproved: boolean
  subCourtCount: number
  imageUrl?: string | null
  logoUrl?: string | null
  createdAt?: string
}

export interface AdminUserItem {
  id: number | string
  fullName: string
  email: string
  phone?: string
  role: UserRole
  status: 'ACTIVE' | 'LOCKED' | 'active' | 'locked'
  provider?: string
  joinedDate?: string
  createdAt?: string
}

export interface AdminTransaction {
  id: number | string
  bookingId: number | string
  orderCode?: number | string
  customerName: string
  customerPhone: string
  facilityName: string
  provider: 'PAYOS' | 'ON_SITE' | 'MOCK' | string
  amount: number
  platformFee: number
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED' | string
  transactionRef?: string
  createdAt: string
  paidAt?: string
}

export interface AdminSystemSettings {
  commissionRatePercent: number
  holdMinutes: number
  platformName: string
  supportHotline: string
  supportEmail: string
  broadcastAnnouncement: string
  maintenanceMode: boolean
  systemAmenities: string[]
}

export const adminApi = {
  // 1. Dashboard metrics
  async getDashboardMetrics(): Promise<AdminDashboardMetrics> {
    const res = await client.get('/v1/admin/dashboard')
    return res.data.data
  },

  // 2. Facilities
  async getAloBookingProfiles(): Promise<AloBookingFacilityProfile[]> {
    const res = await client.get('/v1/admin/facilities/alobooking-profiles')
    return res.data.data
  },

  async getFacilities(params?: { search?: string; status?: string; district?: string }): Promise<AdminFacilityItem[]> {
    const res = await client.get('/v1/admin/facilities', { params })
    return res.data.data
  },

  async approveFacility(id: number | string, action: 'APPROVE' | 'REJECT', reason?: string): Promise<AdminFacilityItem> {
    const res = await client.patch(`/v1/admin/facilities/${id}/approval`, {
      action,
      rejectionReason: reason,
    })
    return res.data.data
  },

  async updateFacilityStatus(id: number | string, status: string, reason?: string): Promise<AdminFacilityItem> {
    const res = await client.patch(`/v1/admin/facilities/${id}/status`, {
      status,
      reason,
    })
    return res.data.data
  },

  // 3. Users
  async getUsers(params?: { search?: string; role?: string; status?: string }): Promise<AdminUserItem[]> {
    const res = await client.get('/v1/admin/users', { params })
    return res.data.data
  },

  async updateUserRole(id: number | string, role: UserRole): Promise<AdminUserItem> {
    const res = await client.patch(`/v1/admin/users/${id}/role`, { role })
    return res.data.data
  },

  async updateUserStatus(id: number | string, status: 'ACTIVE' | 'LOCKED', reason?: string): Promise<AdminUserItem> {
    const res = await client.patch(`/v1/admin/users/${id}/status`, { status, reason })
    return res.data.data
  },

  // 4. Transactions
  async getTransactions(params?: { search?: string; provider?: string; status?: string }): Promise<AdminTransaction[]> {
    const res = await client.get('/v1/admin/transactions', { params })
    return res.data.data
  },

  // 5. System settings
  async getSystemSettings(): Promise<AdminSystemSettings> {
    const res = await client.get('/v1/admin/settings')
    return res.data.data
  },

  async updateSystemSettings(payload: Partial<AdminSystemSettings>): Promise<AdminSystemSettings> {
    const res = await client.put('/v1/admin/settings', payload)
    return res.data.data
  },
}
