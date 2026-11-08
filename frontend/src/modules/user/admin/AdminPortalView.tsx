import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  ArrowLeft,
  Search,
  XCircle,
  Eye,
  RefreshCw,
  TrendingUp,
  Calendar,
  Plus,
  Trash2,
  Save,
} from 'lucide-react'
import type { Facility } from '../../types/court'
import type { UserRole } from '../../types/user'
import { toast } from 'sonner'
import { ROUTES } from '../../../app/router'
import {
  adminApi,
  type AdminDashboardMetrics,
  type AdminFacilityItem,
  type AloBookingFacilityProfile,
  type AdminUserItem,
  type AdminTransaction,
  type AdminSystemSettings,
} from './adminApi'

type AdminTab = 'dashboard' | 'facilities' | 'users' | 'transactions' | 'settings'

export const AdminPortalView: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard')
  const [loading, setLoading] = useState<boolean>(false)

  const [facilities, setFacilities] = useState<Facility[]>([])
  const [aloProfiles, setAloProfiles] = useState<Record<string, AloBookingFacilityProfile>>({})
  const [metrics, setMetrics] = useState<AdminDashboardMetrics | null>(null)
  const [transactions, setTransactions] = useState<AdminTransaction[]>([])
  const [settings, setSettings] = useState<AdminSystemSettings>({
    commissionRatePercent: 5.0,
    holdMinutes: 10,
    platformName: 'SmashCourt Badminton Booking Platform',
    supportHotline: '1900 6868',
    supportEmail: 'support@smashcourt.vn',
    broadcastAnnouncement: 'Chào mừng bạn đến với Nền tảng Đặt sân Cầu lông Toàn quốc SmashCourt!',
    maintenanceMode: false,
    systemAmenities: [
      'Đèn chiếu sáng tiêu chuẩn BWF',
      'Điều hòa nhiệt độ',
      'Bãi đỗ xe ô tô & xe máy',
      'Căn tin giải khát & quầy đồ ăn',
      'Dịch vụ cho thuê vợt & bán quả cầu',
      'Wifi tốc độ cao miễn phí',
      'Tủ đồ cá nhân an toàn',
      'Phòng tắm & thay đồ nóng lạnh',
    ],
  })

  const [users, setUsers] = useState<AdminUserItem[]>([])

  // Filters
  const [facSearch, setFacSearch] = useState<string>('')
  const [facStatusFilter, setFacStatusFilter] = useState<string>('ALL')
  const [facDistrictFilter, setFacDistrictFilter] = useState<string>('ALL')

  const [userSearch, setUserSearch] = useState<string>('')
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL')
  const [userStatusFilter, setUserStatusFilter] = useState<string>('ALL')

  const [txSearch, setTxSearch] = useState<string>('')
  const [txProviderFilter, setTxProviderFilter] = useState<string>('ALL')
  const [txStatusFilter, setTxStatusFilter] = useState<string>('ALL')

  // Selected Facility Modal
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null)
  const selectedFacility = facilities.find((facility) => facility.id === selectedFacilityId)
  const selectedAloProfile = selectedFacility ? aloProfiles[selectedFacility.id] : undefined
  const [rejectionReason, setRejectionReason] = useState<string>('')
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false)
  const [newAmenityInput, setNewAmenityInput] = useState<string>('')

  const toFacility = (f: AdminFacilityItem): Facility => ({
    id: String(f.id), name: f.name, logoUrl: f.logoUrl || '', imageUrl: f.imageUrl || '', galleryImages: [],
    distance: '', address: f.address || '', district: f.district || '', city: f.city || '',
    openHours: f.openTime && f.closeTime ? `${f.openTime.slice(0, 5)} – ${f.closeTime.slice(0, 5)}` : '', rating: 0, reviewCount: 0,
    pricePerHour: 0, amenities: [], latitude: 0, longitude: 0, phone: f.ownerPhone || '',
    description: '', ownerId: String(f.ownerId || ''), isApproved: f.isApproved,
    status: f.status === 'ACTIVE' ? 'active' : 'paused',
    subCourts: Array.from({ length: f.subCourtCount }, (_, i) => ({
      id: String(i), facilityId: String(f.id), name: `Sân ${i + 1}`, courtType: 'standard' as const, status: 'active' as const,
    })),
  })

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [dashboard, facilityData, userData, transactionData, settingsData] = await Promise.all([
        adminApi.getDashboardMetrics(), adminApi.getFacilities(), adminApi.getUsers(),
        adminApi.getTransactions(), adminApi.getSystemSettings(),
      ])
      setMetrics(dashboard)
      setFacilities(facilityData.map(toFacility))
      setUsers(userData)
      setTransactions(transactionData)
      setSettings(settingsData)
    } catch {
      toast.error('Không thể tải dữ liệu quản trị. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDashboardData()
    void adminApi.getAloBookingProfiles()
      .then((profiles) => setAloProfiles(Object.fromEntries(profiles.map((profile) => [String(profile.facilityId), profile]))))
      .catch(() => toast.error('Không thể tải thông tin công khai của cụm sân.'))
  }, [])

  useEffect(() => {
    if (activeTab !== 'facilities') return
    let active = true
    const refreshFacilities = () => {
      void adminApi.getFacilities()
        .then((items) => { if (active) setFacilities(items.map(toFacility)) })
        .catch(() => { if (active) toast.error('Không thể làm mới danh sách cụm sân.') })
    }
    refreshFacilities()
    window.addEventListener('focus', refreshFacilities)
    return () => {
      active = false
      window.removeEventListener('focus', refreshFacilities)
    }
  }, [activeTab])

  // Moderation Handlers
  const handleApproveFacility = async (fac: Facility) => {
    try {
      await adminApi.approveFacility(fac.id, 'APPROVE')
    } catch {
      toast.error('Không thể cập nhật. Vui lòng thử lại.')
      return
    }
    const updated = facilities.map((f) => {
      if (f.id === fac.id) {
        return { ...f, isApproved: true, status: 'active' as const }
      }
      return f
    })
    setFacilities(updated)
    toast.success(`Đã phê duyệt cụm sân: ${fac.name}`)
    setSelectedFacilityId(null)
    loadDashboardData()
  }

  const handleRejectFacility = async () => {
    if (!selectedFacility) return
    const reason = rejectionReason.trim() || 'Hồ sơ cơ sở chưa đạt tiêu chuẩn kỹ thuật hoặc thiếu thông tin'
    try {
      await adminApi.approveFacility(selectedFacility.id, 'REJECT', reason)
    } catch {
      toast.error('Không thể cập nhật. Vui lòng thử lại.')
      return
    }
    const updated = facilities.map((f) => {
      if (f.id === selectedFacility.id) {
        return { ...f, isApproved: false, status: 'paused' as const, rejectionReason: reason }
      }
      return f
    })
    setFacilities(updated)
    toast.info(`Đã từ chối kiểm duyệt cụm sân: ${selectedFacility.name}`)
    setShowRejectModal(false)
    setSelectedFacilityId(null)
    setRejectionReason('')
    loadDashboardData()
  }

  const handleToggleLockFacility = async (fac: Facility) => {
    const nextStatus = fac.status === 'active' ? 'paused' : 'active'
    try {
      await adminApi.updateFacilityStatus(fac.id, nextStatus)
    } catch {
      toast.error('Không thể cập nhật. Vui lòng thử lại.')
      return
    }
    const updated = facilities.map((f) => {
      if (f.id === fac.id) {
        return { ...f, status: nextStatus as any }
      }
      return f
    })
    setFacilities(updated)
    toast.success(
      nextStatus === 'active'
        ? `Đã mở lại hoạt động cho cụm sân: ${fac.name}`
        : `Đã tạm khóa cụm sân: ${fac.name}`
    )
    loadDashboardData()
  }

  // User RBAC Handlers
  const handleChangeUserRole = async (userId: string | number, newRole: UserRole) => {
    try {
      await adminApi.updateUserRole(userId, newRole)
    } catch {
      toast.error('Không thể cập nhật. Vui lòng thử lại.')
      return
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    )
    toast.success(`Đã cập nhật vai trò người dùng sang: ${newRole}`)
    loadDashboardData()
  }

  const handleToggleLockUser = async (user: AdminUserItem) => {
    const nextStatus = user.status === 'ACTIVE' || user.status === 'active' ? 'LOCKED' : 'ACTIVE'
    try {
      await adminApi.updateUserStatus(user.id, nextStatus)
    } catch {
      toast.error('Không thể cập nhật. Vui lòng thử lại.')
      return
    }
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u))
    )
    toast.info(
      nextStatus === 'ACTIVE'
        ? `Đã mở khóa tài khoản: ${user.fullName}`
        : `Đã khóa tài khoản: ${user.fullName}`
    )
    loadDashboardData()
  }

  // Filtered Facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter((f) => {
      if (facSearch) {
        const q = facSearch.toLowerCase()
        const matchName = f.name.toLowerCase().includes(q)
        const matchAddr = f.address.toLowerCase().includes(q)
        if (!matchName && !matchAddr) return false
      }
      if (facStatusFilter === 'APPROVED' && !f.isApproved) return false
      if (facStatusFilter === 'PENDING' && f.isApproved) return false
      if (facStatusFilter === 'ACTIVE' && f.status !== 'active') return false
      if (facStatusFilter === 'PAUSED' && f.status !== 'paused') return false
      if (facDistrictFilter !== 'ALL' && f.district !== facDistrictFilter) return false
      return true
    })
  }, [facilities, facSearch, facStatusFilter, facDistrictFilter])

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (userSearch) {
        const q = userSearch.toLowerCase()
        const matchName = u.fullName.toLowerCase().includes(q)
        const matchEmail = u.email.toLowerCase().includes(q)
        const matchPhone = u.phone?.toLowerCase().includes(q)
        if (!matchName && !matchEmail && !matchPhone) return false
      }
      if (userRoleFilter !== 'ALL' && u.role !== userRoleFilter) return false
      if (userStatusFilter === 'ACTIVE' && u.status !== 'ACTIVE' && u.status !== 'active') return false
      if (userStatusFilter === 'LOCKED' && u.status !== 'LOCKED' && u.status !== 'locked') return false
      return true
    })
  }, [users, userSearch, userRoleFilter, userStatusFilter])

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (txSearch) {
        const q = txSearch.toLowerCase()
        const matchCust = t.customerName.toLowerCase().includes(q)
        const matchFac = t.facilityName.toLowerCase().includes(q)
        const matchRef = t.transactionRef?.toLowerCase().includes(q)
        const matchOrder = String(t.orderCode || '').toLowerCase().includes(q)
        if (!matchCust && !matchFac && !matchRef && !matchOrder) return false
      }
      if (txProviderFilter !== 'ALL' && t.provider !== txProviderFilter) return false
      if (txStatusFilter !== 'ALL' && t.status !== txStatusFilter) return false
      return true
    })
  }, [transactions, txSearch, txProviderFilter, txStatusFilter])

  // Districts list for filter
  const districts = useMemo(() => {
    const set = new Set(facilities.map((f) => f.district).filter(Boolean))
    return Array.from(set)
  }, [facilities])

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  // Settings Handlers
  const handleSaveSettings = async () => {
    try {
      setSettings(await adminApi.updateSystemSettings(settings))
      toast.success('Đã cập nhật cấu hình cho phiên hoạt động hiện tại.')
    } catch {
      toast.error('Không thể cập nhật cấu hình. Vui lòng thử lại.')
    }
  }

  const handleAddAmenity = () => {
    const val = newAmenityInput.trim()
    if (!val) return
    if (settings.systemAmenities.includes(val)) {
      toast.error('Tiện ích này đã tồn tại trong danh mục!')
      return
    }
    setSettings((prev) => ({
      ...prev,
      systemAmenities: [...prev.systemAmenities, val],
    }))
    setNewAmenityInput('')
    toast.info('Đã thêm vào danh sách. Hãy lưu cấu hình để áp dụng.')
  }

  const handleRemoveAmenity = (item: string) => {
    setSettings((prev) => ({
      ...prev,
      systemAmenities: prev.systemAmenities.filter((a) => a !== item),
    }))
    toast.info('Đã cập nhật danh sách. Hãy lưu cấu hình để áp dụng.')
  }

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-900 pb-24">
      {/* 1. Seamless Unified Workplace Top Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-[#1b7a42] text-white">
                Platform Admin
              </span>
              <span className="text-xs text-slate-600 font-medium">Hệ thống SmashCourt</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Bảng điều khiển Quản trị viên Ứng dụng
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              Giám sát vận hành toàn hệ thống, kiểm duyệt cơ sở thể thao, phân quyền người dùng và đối soát tài chính
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              type="button"
              onClick={loadDashboardData}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              <span>Cập nhật</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(ROUTES.HOME)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Về trang người dùng</span>
            </button>
          </div>
        </div>

        {/* 2. Unified Navigation Tabs Bar (5 Phân hệ) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'dashboard'
                ? 'border-[#1b7a42] text-[#1b7a42]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tổng quan Nền tảng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('facilities')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'facilities'
                ? 'border-[#1b7a42] text-[#1b7a42]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Kiểm duyệt Cụm sân ({facilities.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'users'
                ? 'border-[#1b7a42] text-[#1b7a42]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Quản lý Tài khoản ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'transactions'
                ? 'border-[#1b7a42] text-[#1b7a42]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Giao dịch & Đối soát ({transactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap transition-colors ${
              activeTab === 'settings'
                ? 'border-[#1b7a42] text-[#1b7a42]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Cấu hình Hệ thống</span>
          </button>
        </div>
      </div>

      {/* 3. Main Workplace Content Canvas */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ==================== TAB 1: TỔNG QUAN NỀN TẢNG ==================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards Row (Solid Flat Color Style) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Tổng GMV & Phí sàn */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-xs font-bold">Tổng GMV toàn sàn</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#1b7a42] flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {formatVND(metrics?.totalGmv ?? 0)}
                </div>
                <div className="text-xs font-medium text-slate-600 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>Hoa hồng sàn ({settings.commissionRatePercent}%):</span>
                  <strong className="text-[#1b7a42] font-bold">
                    {formatVND(metrics?.platformRevenue ?? 0)}
                  </strong>
                </div>
              </div>

              {/* Card 2: Lượt đặt sân */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-xs font-bold">Tổng lượt đặt sân</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {metrics?.totalBookings ?? 0} đơn
                </div>
                <div className="text-xs font-medium text-slate-600 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>Thành công:</span>
                  <span className="text-emerald-700 font-bold">
                    {metrics?.confirmedBookings ?? 0} đơn
                  </span>
                </div>
              </div>

              {/* Card 3: Cụm sân thể thao */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-xs font-bold">Cơ sở Cụm sân</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {metrics?.totalFacilities || facilities.length} cơ sở
                </div>
                <div className="text-xs font-medium text-slate-600 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>Chờ kiểm duyệt:</span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900">
                    {facilities.filter((f) => !f.isApproved).length} chờ duyệt
                  </span>
                </div>
              </div>

              {/* Card 4: Người dùng & Vai trò */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-xs font-bold">Tài khoản toàn sàn</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">
                  {metrics?.totalUsers || users.length} người
                </div>
                <div className="text-xs font-medium text-slate-600 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>Chủ sân: {users.filter((u) => u.role === 'COURT_OWNER').length}</span>
                  <span>Khách: {users.filter((u) => u.role === 'CUSTOMER').length}</span>
                </div>
              </div>
            </div>

            {/* Middle Section: Regional Distribution & Recent Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Regional Bookings Card (1 Col) */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Phân bổ đơn theo Quận / Huyện</h3>
                  <span className="text-xs text-slate-500 font-medium">Hà Nội</span>
                </div>

                <div className="space-y-3">
                  {Object.entries(metrics?.bookingsByDistrict ?? {}).map(
                    ([district, count]) => (
                      <div key={district} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{district}</span>
                          <span className="font-bold text-slate-900">{count} lượt</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-[#1b7a42] rounded-full"
                            style={{ width: `${Math.min(100, (count / 20) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Recent Transactions Card (2 Cols) */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Giao dịch thanh toán gần nhất</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs font-bold text-[#1b7a42] hover:text-[#156335] cursor-pointer"
                  >
                    Xem tất cả ({transactions.length})
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 font-bold">
                        <th className="pb-2.5">Mã đơn</th>
                        <th className="pb-2.5">Khách hàng</th>
                        <th className="pb-2.5">Cụm sân</th>
                        <th className="pb-2.5">Phương thức</th>
                        <th className="pb-2.5 text-right">Số tiền</th>
                        <th className="pb-2.5 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.slice(0, 5).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 font-mono font-bold text-slate-900">
                            {tx.orderCode || tx.bookingId}
                          </td>
                          <td className="py-2.5 font-medium text-slate-800">{tx.customerName}</td>
                          <td className="py-2.5 text-slate-600 truncate max-w-[140px]">
                            {tx.facilityName}
                          </td>
                          <td className="py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                              {tx.provider}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-bold text-[#1b7a42]">
                            {formatVND(tx.amount)}
                          </td>
                          <td className="py-2.5 text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.status === 'SUCCESS'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : tx.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-rose-100 text-rose-900'
                              }`}
                            >
                              {tx.status === 'SUCCESS'
                                ? 'Thành công'
                                : tx.status === 'PENDING'
                                ? 'Đang giữ chỗ'
                                : 'Thất bại'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: KIỂM DUYỆT CỤM SÂN ==================== */}
        {activeTab === 'facilities' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden space-y-0">
            {/* Toolbar & Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Danh sách Cụm sân Thể thao</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Phê duyệt cụm sân mới, đình chỉ cơ sở vi phạm hoặc kiểm tra số lượng sân con
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={facSearch}
                    onChange={(e) => setFacSearch(e.target.value)}
                    placeholder="Tìm tên cụm sân, địa chỉ..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder-slate-500 focus:outline-none focus:border-[#1b7a42]"
                  />
                </div>

                <select
                  value={facStatusFilter}
                  onChange={(e) => setFacStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="APPROVED">Đã phê duyệt</option>
                  <option value="PENDING">Chờ kiểm duyệt</option>
                  <option value="ACTIVE">Đang mở cửa</option>
                  <option value="PAUSED">Đang tạm khóa</option>
                </select>

                <select
                  value={facDistrictFilter}
                  onChange={(e) => setFacDistrictFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Tất cả quận/huyện</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Facilities Table */}
            <div className="md:overflow-x-auto" role="region" aria-label="Danh sách cụm sân">
              <table className="block w-full text-left text-xs sm:text-sm md:table md:min-w-[58rem]">
                <thead className="hidden md:table-header-group">
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="whitespace-nowrap p-3.5">Cụm sân</th>
                    <th className="whitespace-nowrap p-3.5">Khu vực</th>
                    <th className="whitespace-nowrap p-3.5">Quy mô</th>
                    <th className="whitespace-nowrap p-3.5">Giờ mở cửa</th>
                    <th className="whitespace-nowrap p-3.5">Kiểm duyệt</th>
                    <th className="whitespace-nowrap p-3.5">Vận hành</th>
                    <th className="p-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="block divide-y divide-slate-100 md:table-row-group">
                  {filteredFacilities.length === 0 && (
                    <tr className="block md:table-row">
                      <td colSpan={7} className="block px-4 py-8 text-center text-sm text-slate-600 md:table-cell">
                        Không tìm thấy cụm sân phù hợp với bộ lọc.
                      </td>
                    </tr>
                  )}
                  {filteredFacilities.map((fac) => (
                    <tr key={fac.id} className="grid grid-cols-2 gap-x-3 gap-y-2 p-4 transition-colors hover:bg-slate-50/50 md:table-row md:p-0">
                      <td className="col-span-2 min-w-0 md:p-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="w-11 h-11 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                            <img
                              src={fac.logoUrl || fac.imageUrl || '/images/logos/badminton-club-logo.svg'}
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.onerror = null
                                if (!event.currentTarget.src.endsWith('/images/logos/badminton-club-logo.svg')) {
                                  event.currentTarget.src = '/images/logos/badminton-club-logo.svg'
                                }
                              }}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <strong className="block break-words text-sm font-bold text-slate-900">
                              {fac.name}
                            </strong>
                            <span className="text-[11px] text-slate-600 font-medium">
                              {aloProfiles[fac.id]?.publicContact?.split('|')[0].trim() || (fac.phone && fac.phone !== 'N/A' ? fac.phone : 'Chưa có liên hệ')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="col-span-2 min-w-0 font-medium text-slate-700 md:p-3.5">
                        <div>{fac.district}, {fac.city}</div>
                        <span className="block break-words text-[11px] text-slate-600 md:max-w-[200px]">
                          {fac.address}
                        </span>
                      </td>
                      <td className="min-w-0 font-bold text-slate-900 md:p-3.5">
                        {(fac as any).subCourtCount ?? fac.subCourts?.length ?? 0} sân đã cấu hình
                        {aloProfiles[fac.id]?.publishedCourtCount != null && (
                          <span className="block text-[11px] font-medium text-slate-600">
                            Công bố {aloProfiles[fac.id].publishedCourtCount} sân
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap font-medium tabular-nums text-slate-700 md:p-3.5">
                        <span className="block text-[11px] text-slate-600 md:hidden">Giờ mở cửa</span>
                        {fac.openHours || 'Chưa cập nhật'}
                      </td>
                      <td className="min-w-0 md:p-3.5">
                        {fac.status === 'REJECTED' || (fac as any).status === 'REJECTED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-rose-50 text-rose-900 border-rose-200">
                            Bị từ chối
                          </span>
                        ) : fac.isApproved || fac.status === 'ACTIVE' || fac.status === 'active' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-900 border-emerald-200">
                            Đã duyệt
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-900 border-amber-200">
                            Chờ kiểm duyệt
                          </span>
                        )}
                      </td>
                      <td className="min-w-0 md:p-3.5">
                        {fac.status === 'active' || fac.status === 'ACTIVE' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-blue-50 text-blue-900 border-blue-200">
                            Đang mở
                          </span>
                        ) : fac.status === 'paused' || fac.status === 'PAUSED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-rose-50 text-rose-900 border-rose-200">
                            Đang khóa
                          </span>
                        ) : fac.status === 'REJECTED' || (fac as any).status === 'REJECTED' ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-slate-100 text-slate-700 border-slate-200">
                            Ngừng HĐ
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-900 border-amber-200">
                            Chờ mở
                          </span>
                        )}
                      </td>
                      <td className="col-span-2 space-x-1.5 whitespace-nowrap border-t border-slate-100 pt-2 text-right md:border-0 md:p-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedFacilityId(fac.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-3.5 h-3.5 inline mr-1 text-slate-600" />
                          <span>Chi tiết</span>
                        </button>

                        {!fac.isApproved ? (
                          <button
                            type="button"
                            onClick={() => handleApproveFacility(fac)}
                            className="px-3 py-1.5 rounded-lg bg-[#1b7a42] hover:bg-[#156335] text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Duyệt
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleLockFacility(fac)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                              fac.status === 'active'
                                ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {fac.status === 'active' ? 'Tạm khóa' : 'Mở lại'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 3: QUẢN LÝ TÀI KHOẢN ==================== */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden space-y-0">
            {/* Toolbar & Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Danh sách Tài khoản Toàn sàn</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Phân quyền vai trò người dùng (Khách hàng, Chủ sân, Quản trị viên) và quản lý trạng thái khóa
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Tìm tên, email, sđt..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder-slate-500 focus:outline-none focus:border-[#1b7a42]"
                  />
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Tất cả vai trò</option>
                  <option value="CUSTOMER">Khách hàng (CUSTOMER)</option>
                  <option value="COURT_OWNER">Chủ sân (COURT_OWNER)</option>
                  <option value="SYSTEM_ADMIN">Admin (SYSTEM_ADMIN)</option>
                </select>

                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="LOCKED">Bị khóa</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-3.5">Họ và tên</th>
                    <th className="p-3.5">Thông tin liên hệ</th>
                    <th className="p-3.5">Vai trò hiện tại (RBAC)</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5">Ngày tham gia</th>
                    <th className="p-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5">
                        <strong className="text-slate-900 font-bold block">{u.fullName}</strong>
                        <span className="text-[11px] font-mono text-slate-500">ID: #{u.id}</span>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        <div>{u.email}</div>
                        <span className="text-[11px] text-slate-500">{u.phone || 'Chưa cập nhật SĐT'}</span>
                      </td>
                      <td className="p-3.5">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeUserRole(u.id, e.target.value as UserRole)}
                          className="px-2.5 py-1.5 rounded-xl border border-slate-200 font-bold text-xs bg-slate-50 text-slate-900 cursor-pointer focus:outline-none"
                        >
                          <option value="CUSTOMER">Khách hàng (CUSTOMER)</option>
                          <option value="COURT_OWNER">Chủ sân (COURT_OWNER)</option>
                          <option value="SYSTEM_ADMIN">Admin (SYSTEM_ADMIN)</option>
                        </select>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex w-fit items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold leading-none ${
                            u.status === 'ACTIVE' || u.status === 'active'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              : 'bg-rose-50 text-rose-900 border-rose-200'
                          }`}
                        >
                          {u.status === 'ACTIVE' || u.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'Chưa có thông tin'}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleLockUser(u)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                            u.status === 'ACTIVE' || u.status === 'active'
                              ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {u.status === 'ACTIVE' || u.status === 'active' ? 'Khóa' : 'Mở khóa'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: GIAO DỊCH & ĐỐI SOÁT ==================== */}
        {activeTab === 'transactions' && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden space-y-0">
            {/* Toolbar & Filter Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Giao dịch & Dòng tiền Toàn sàn</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Đối soát dòng tiền thanh toán qua VietQR payOS và tại quầy sân, tự động trích hoa hồng sàn
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Tìm mã đơn, tên khách, sân..."
                    className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder-slate-500 focus:outline-none focus:border-[#1b7a42]"
                  />
                </div>

                <select
                  value={txProviderFilter}
                  onChange={(e) => setTxProviderFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Tất cả phương thức</option>
                  <option value="PAYOS">payOS (VietQR)</option>
                  <option value="ON_SITE">Tại quầy sân</option>
                  <option value="MOCK">Thử nghiệm Mock</option>
                </select>

                <select
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white cursor-pointer focus:outline-none"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="SUCCESS">Thành công</option>
                  <option value="PENDING">Đang giữ chỗ</option>
                  <option value="FAILED">Thất bại / Hủy</option>
                </select>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="p-3.5">Mã đơn / GD</th>
                    <th className="p-3.5">Khách hàng</th>
                    <th className="p-3.5">Cụm sân thụ hưởng</th>
                    <th className="p-3.5">Phương thức</th>
                    <th className="p-3.5 text-right">Tổng tiền</th>
                    <th className="p-3.5 text-right">Phí sàn (5%)</th>
                    <th className="p-3.5 text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5">
                        <strong className="font-mono font-bold text-slate-900 block">
                          {tx.orderCode || tx.bookingId}
                        </strong>
                        <span className="text-[11px] font-mono text-slate-500">
                          {tx.transactionRef || 'N/A'}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-800">
                        <div>{tx.customerName}</div>
                        <span className="text-[11px] text-slate-500">{tx.customerPhone}</span>
                      </td>
                      <td className="p-3.5 text-slate-700 font-medium">
                        {tx.facilityName}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {tx.provider}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-black text-slate-900">
                        {formatVND(tx.amount)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-[#1b7a42]">
                        {formatVND(tx.platformFee || Math.round(tx.amount * 0.05))}
                      </td>
                      <td className="p-3.5 text-right">
                        <span
                          className={`inline-flex w-fit items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold leading-none ${
                            tx.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                              : tx.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-900 border-amber-200'
                              : 'bg-rose-50 text-rose-900 border-rose-200'
                          }`}
                        >
                          {tx.status === 'SUCCESS'
                            ? 'Thành công'
                            : tx.status === 'PENDING'
                            ? 'Đang giữ chỗ'
                            : 'Thất bại'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 5: CẤU HÌNH HỆ THỐNG ==================== */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Policy Settings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Chính sách Phí & Giữ chỗ</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Quy định các thông số vận hành chung cho toàn bộ giao dịch trên sàn
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tỷ lệ phí hoa hồng nền tảng (% GMV mỗi đơn):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="30"
                      value={settings.commissionRatePercent}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          commissionRatePercent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-32 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:border-[#1b7a42]"
                    />
                    <span className="text-sm font-bold text-slate-700">%</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Phần trăm doanh thu sàn tự động khấu trừ từ mỗi lượt thanh toán của khách.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Thời gian giữ chỗ thanh toán (Hold Duration):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="3"
                      max="30"
                      value={settings.holdMinutes}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          holdMinutes: parseInt(e.target.value) || 10,
                        }))
                      }
                      className="w-32 px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 bg-white focus:outline-none focus:border-[#1b7a42]"
                    />
                    <span className="text-sm font-bold text-slate-700">phút</span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Khoảng thời gian khách hàng được khóa sân để hoàn tất thanh toán trước khi nhả lại cho người khác.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Thông báo toàn hệ thống (Broadcast Announcement):
                  </label>
                  <textarea
                    rows={3}
                    value={settings.broadcastAnnouncement}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        broadcastAnnouncement: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-[#1b7a42]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-4 py-2.5 rounded-xl bg-[#1b7a42] hover:bg-[#156335] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu cài đặt chính sách</span>
                </button>
              </div>
            </div>

            {/* Platform Amenities Standards */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Danh mục Tiện ích Chuẩn</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Các tiêu chí tiện ích được phép khai báo và hiển thị trong bộ lọc tìm kiếm
                </p>
              </div>

              {/* Add new amenity */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAmenityInput}
                  onChange={(e) => setNewAmenityInput(e.target.value)}
                  placeholder="Nhập tên tiện ích mới..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder-slate-500 focus:outline-none focus:border-[#1b7a42]"
                />
                <button
                  type="button"
                  onClick={handleAddAmenity}
                  className="px-3.5 py-2 rounded-xl bg-[#1b7a42] hover:bg-[#156335] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm</span>
                </button>
              </div>

              {/* Amenities list */}
              <div className="space-y-2">
                {settings.systemAmenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800"
                  >
                    <span className="font-medium">{amenity}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAmenity(amenity)}
                      className="p-1 text-slate-500 hover:text-rose-700 cursor-pointer"
                      title="Gỡ tiện ích"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ==================== MODAL CHI TIẾT CỤM SÂN ==================== */}
      {selectedFacility &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
            <div className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-200 overflow-hidden max-h-[min(90vh,700px)] flex flex-col">
              {/* Modal Header */}
              <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {selectedFacility.name}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedFacilityId(null)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                <div className="w-full h-52 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                  <img
                    src={selectedFacility.imageUrl || selectedFacility.logoUrl || '/images/logos/badminton-club-logo.svg'}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">Địa chỉ:</span>
                    <span className="text-slate-900 font-bold text-right max-w-[280px]">
                      {selectedFacility.address}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">Khu vực:</span>
                    <span className="text-slate-900 font-bold">
                      {selectedFacility.district}, {selectedFacility.city}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">Số lượng sân con:</span>
                    <span className="text-slate-900 font-bold">
                      {(selectedFacility as any).subCourtCount ?? selectedFacility.subCourts?.length ?? 0} sân đã cấu hình
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">Giờ hoạt động:</span>
                    <span className="text-slate-900 font-bold">
                      {selectedFacility.openHours || 'Chưa cập nhật'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-600 font-semibold">Trạng thái duyệt:</span>
                    <span
                      className={`font-bold ${
                        selectedFacility.status === 'REJECTED' || (selectedFacility as any).status === 'REJECTED'
                          ? 'text-rose-700'
                          : selectedFacility.isApproved || selectedFacility.status === 'ACTIVE' || selectedFacility.status === 'active'
                          ? 'text-emerald-700'
                          : 'text-amber-800'
                      }`}
                    >
                      {selectedFacility.status === 'REJECTED' || (selectedFacility as any).status === 'REJECTED'
                        ? 'Đã từ chối'
                        : selectedFacility.isApproved || selectedFacility.status === 'ACTIVE' || selectedFacility.status === 'active'
                        ? 'Đã phê duyệt'
                        : 'Chờ kiểm duyệt'}
                    </span>
                  </div>
                </div>

                {(selectedFacility as any).rejectionReason && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900">
                    <strong className="block font-bold mb-0.5">Lý do từ chối kiểm duyệt trước đó:</strong>
                    <span>{(selectedFacility as any).rejectionReason}</span>
                  </div>
                )}

                {selectedAloProfile && (
                  <section className="space-y-2 rounded-xl border border-slate-200 p-3 text-xs" aria-label="Thông tin công khai của cụm sân">
                    <h3 className="font-bold text-slate-900">Thông tin công khai của cụm sân</h3>
                    <p className="break-words">Mã cụm sân {selectedAloProfile.alobookingCode}</p>
                    <p>Số sân công bố {selectedAloProfile.publishedCourtCount ?? 'chưa có dữ liệu'}</p>
                    <div>
                      <p className="font-semibold">Liên hệ công khai</p>
                      {selectedAloProfile.publicContact ? (
                        <ul className="mt-1 space-y-1 text-slate-700">
                          {selectedAloProfile.publicContact.split('|').map((contact, index) => (
                            <li key={index} className="break-words">{contact.trim()}</li>
                          ))}
                        </ul>
                      ) : <p>Chưa có thông tin liên hệ.</p>}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {selectedAloProfile.bookingUrl ? (
                        <a className="font-semibold text-emerald-700 underline" href={selectedAloProfile.bookingUrl} target="_blank" rel="noreferrer">Mở trang đặt sân</a>
                      ) : <p>Chưa xác minh được liên kết đặt sân.</p>}
                      {selectedAloProfile.bookingSourceUrl && (
                        <a className="text-slate-700 underline" href={selectedAloProfile.bookingSourceUrl} target="_blank" rel="noreferrer">Bài viết nguồn</a>
                      )}
                    </div>
                  </section>
                )}

                {/* Tiện ích sân */}
                <div>
                  <span className="text-xs font-bold text-slate-800 block mb-1.5">
                    Tiện ích đã đăng ký:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedFacility.amenities?.map((item) => (
                      <span
                        key={item}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        {item}
                      </span>
                    )) || (
                      <span className="text-xs text-slate-500">Đèn BWF, Điều hòa, Bãi xe</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedFacilityId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>

                {!selectedFacility.isApproved ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      className="px-4 py-2 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Từ chối duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveFacility(selectedFacility)}
                      className="px-4 py-2 rounded-xl bg-[#1b7a42] hover:bg-[#156335] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Phê duyệt cụm sân
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleLockFacility(selectedFacility)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
                      selectedFacility.status === 'active'
                        ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {selectedFacility.status === 'active' ? 'Tạm khóa cơ sở' : 'Mở lại hoạt động'}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ==================== MODAL TỪ CHỐI DUYỆT ==================== */}
      {showRejectModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Từ chối kiểm duyệt cơ sở</h3>
              <p className="text-xs text-slate-600">
                Vui lòng nhập lý do từ chối để hệ thống gửi phản hồi hướng dẫn cho chủ sân hoàn thiện hồ sơ:
              </p>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ví dụ: Thiếu ảnh thực tế các sân con, giấy phép kinh doanh chưa rõ ràng..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white placeholder-slate-500 focus:outline-none focus:border-[#1b7a42]"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleRejectFacility}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                >
                  Xác nhận từ chối
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
