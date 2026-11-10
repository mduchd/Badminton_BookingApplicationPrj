import { useApiQuery } from '../../../hooks/useApiQuery'
import { ProfileForm } from '../profile/ProfileForm'
import { IntegrationSettings } from './IntegrationSettings'
import { EmptyState } from '../../../components/shared/EmptyState'
import { Button } from '../../../components/shared/Button'
import { buildBookingIcs } from '../../booking/calendarExport'
import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Info,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Download,
  Clock,
  MapPin,
  Users,
  Trophy,
  Crown,
  Ticket,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Check,
  GraduationCap,
  User as UserIcon,
  ChevronDown,
  Building,
  Bell,
} from 'lucide-react'
import type { User } from '../../types/user'
import { toast } from 'sonner'
import { UserAvatar } from '../../../components/shared/UserAvatar'
import { ROUTES } from '../../../app/router'
import { bookingApi } from '../../booking/services/bookingApi'

export interface UserBooking {
  id: string
  facilityName: string
  courtName: string
  address: string
  date: string
  dayLabel: string
  timeRange: string
  totalPrice: number
  status: 'HELD' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  sportType: string
  statusMessage?: string
}

interface AccountViewProps {
  currentUser: User | null
  onOpenAuth: (tab?: 'login' | 'register') => void
  onUpdateUser: (updated: User) => void
  onLogout: () => void
  onNavigateHome: () => void
  onOpenAIChat?: () => void
}

export type ActiveAccountSection =
  | 'bookings'
  | 'profile'
  | 'membership'
  | 'groups'
  | 'classes'
  | 'vouchers'
  | 'settings'
  | 'terms'
  | 'version'

export const AccountView: React.FC<AccountViewProps> = ({
  currentUser,
  onOpenAuth,
  onUpdateUser,
  onLogout,
  onNavigateHome,
}) => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const sectionParam = searchParams.get('section') as ActiveAccountSection | null
  const validSections: ActiveAccountSection[] = [
    'bookings',
    'profile',
    'membership',
    'groups',
    'classes',
    'vouchers',
    'settings',
    'terms',
    'version',
  ]
  const activeSection: ActiveAccountSection =
    sectionParam && validSections.includes(sectionParam) ? sectionParam : 'bookings'
  const isSectionSelected = Boolean(sectionParam && validSections.includes(sectionParam))

  const setActiveSection = (section: ActiveAccountSection) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('section', section)
        return next
      },
      { replace: true }
    )
  }

  // Booking filters
  const [bookingStatusFilter, setBookingStatusFilter] = useState<'all' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('all')
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all')

  const { data: bookingItems = [], isPending: bookingsLoading, isError: bookingsError, refetch: reloadBookings } = useApiQuery({
    queryKey: ['myBookings', currentUser?.id], queryFn: bookingApi.getMyBookings, enabled: !!currentUser,
  })
  const bookings: UserBooking[] = currentUser ? bookingItems.map(b => ({
    id: String(b.id), facilityName: b.facilityName, courtName: b.courtName,
    address: '', date: b.bookingDate, dayLabel: '', timeRange: `${b.startTime.slice(0, 5)} - ${b.endTime.slice(0, 5)}`,
    totalPrice: b.totalAmount, status: b.status === 'EXPIRED' ? 'CANCELLED' : b.status, sportType: 'Cầu lông',
  })) : []

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) {
      return false
    }
    if (selectedDateFilter === 'month' && !b.date.startsWith(new Date().toISOString().slice(0, 7))) {
      return false
    }
    return true
  })

  const handleDownloadIcs = (booking: UserBooking) => {
    const blob = new Blob([buildBookingIcs(booking)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `smashcourt-${booking.id}.ics`
    document.body.appendChild(link); link.click(); link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-[calc(100vh-64px)] flex flex-col md:flex-row bg-[#f8fafc] text-slate-900">
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className={`w-full md:w-80 lg:w-[360px] max-w-full shrink-0 bg-[#eef8f2] border-r border-emerald-200/60 flex flex-col ${isSectionSelected ? 'hidden md:flex' : 'flex'}`}>
        {/* 1. Top Green User Profile & Membership Card */}
        <div className="bg-[#168039] p-4 sm:p-5 text-white flex flex-col gap-3">
          {/* User Profile Row */}
          <button
            type="button"
            onClick={() => {
              if (currentUser) {
                setActiveSection('profile')
              } else {
                onOpenAuth('login')
              }
            }}
            className="w-full flex items-center justify-between text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              {currentUser ? (
                <UserAvatar
                  src={currentUser.avatarUrl}
                  name={currentUser.fullName}
                  className="w-12 h-12"
                  ringClassName="ring-2 ring-white/90 shrink-0"
                  fallbackBgColor="bg-emerald-800 text-white"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white text-[#168039] flex items-center justify-center shrink-0 shadow-xs">
                  <UserIcon className="w-6 h-6 text-[#168039]" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-white truncate">
                  {currentUser ? currentUser.fullName : 'Đăng nhập / Đăng ký'}
                </div>
                <div className="text-xs text-emerald-100 font-medium truncate mt-0.5">
                  {currentUser
                    ? currentUser.email || currentUser.phone || 'Chưa cập nhật email'
                    : 'Chạm để xác thực tài khoản'}
                </div>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-white/80 group-hover:text-white group-hover:translate-x-0.5 transition-transform shrink-0 ml-2" />
          </button>

          {/* Membership Info Row */}
          <button
            type="button"
            onClick={() => setActiveSection('membership')}
            className={`w-full px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer border ${
              activeSection === 'membership'
                ? 'bg-[#0f5326] border-amber-300 text-amber-300 font-bold'
                : 'bg-[#12652e] hover:bg-[#0f5326] border-emerald-500/40 text-white font-medium'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Crown className="w-4 h-4 text-[#e5a92c] shrink-0" />
              <span className="text-xs truncate">Hạng thành viên</span>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-200 shrink-0" />
          </button>
        </div>

        {/* 2. Four Quick Action Shortcut Buttons & Grouped Functional Blocks */}
        <div className="p-3 sm:p-4 bg-[#f0f7f3] space-y-4 flex-1 overflow-y-auto">
          {/* Card containing the 4 Quick Shortcuts (Flat buttons inside card, no nested box borders) */}
          <div className="bg-white rounded-2xl p-2.5 sm:p-3 border border-slate-200/90 shadow-2xs">
            <div className="grid grid-cols-4 gap-1.5">
              {/* Calendar */}
              <button
                type="button"
                onClick={() => setActiveSection('bookings')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer text-center ${
                  activeSection === 'bookings'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-semibold'
                }`}
              >
                <Calendar className={`w-5 h-5 mb-1 ${activeSection === 'bookings' ? 'text-[#168039]' : 'text-emerald-700'}`} />
                <span className="text-[11px] font-bold">Đặt sân</span>
              </button>

              {/* Notification */}
              <button
                type="button"
                onClick={() => setActiveSection('settings')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer text-center ${
                  activeSection === 'settings'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-semibold'
                }`}
              >
                <Bell className={`w-5 h-5 mb-1 ${activeSection === 'settings' ? 'text-[#168039]' : 'text-amber-600'}`} />
                <span className="text-[11px] font-bold">Thông báo</span>
              </button>

              {/* Course */}
              <button
                type="button"
                onClick={() => setActiveSection('classes')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer text-center ${
                  activeSection === 'classes'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-semibold'
                }`}
              >
                <Trophy className={`w-5 h-5 mb-1 ${activeSection === 'classes' ? 'text-[#168039]' : 'text-emerald-600'}`} />
                <span className="text-[11px] font-bold">Lớp học</span>
              </button>

              {/* Voucher */}
              <button
                type="button"
                onClick={() => setActiveSection('vouchers')}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all cursor-pointer text-center ${
                  activeSection === 'vouchers'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-semibold'
                }`}
              >
                <Ticket className={`w-5 h-5 mb-1 ${activeSection === 'vouchers' ? 'text-[#168039]' : 'text-rose-600'}`} />
                <span className="text-[11px] font-bold">Voucher</span>
              </button>
            </div>
          </div>

          {/* Group 1: Hoạt động */}
          <div className="space-y-1.5">
            <h3 className="text-xs sm:text-[13px] font-bold text-[#168039] px-1 flex items-center justify-between">
              <span>Hoạt động</span>
            </h3>
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100 shadow-2xs">
              {/* My group */}
              <button
                type="button"
                onClick={() => setActiveSection('groups')}
                className={`w-full px-3.5 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  activeSection === 'groups'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-800 hover:bg-slate-50 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className={`w-4 h-4 ${activeSection === 'groups' ? 'text-[#168039]' : 'text-emerald-700'}`} />
                  <span>Nhóm câu lạc bộ</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Class schedule list */}
              <button
                type="button"
                onClick={() => setActiveSection('classes')}
                className={`w-full px-3.5 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  activeSection === 'classes'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-800 hover:bg-slate-50 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className={`w-4 h-4 ${activeSection === 'classes' ? 'text-[#168039]' : 'text-emerald-700'}`} />
                  <span>Lịch thi đấu & Lớp học</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Membership package */}
              <button
                type="button"
                onClick={() => setActiveSection('membership')}
                className={`w-full px-3.5 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  activeSection === 'membership'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-800 hover:bg-slate-50 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Crown className={`w-4 h-4 ${activeSection === 'membership' ? 'text-[#168039]' : 'text-amber-500'}`} />
                  <span>Gói hội viên</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Group 2: Hệ thống */}
          <div className="space-y-1.5">
            <h3 className="text-xs sm:text-[13px] font-bold text-[#168039] px-1 flex items-center justify-between">
              <span>Hệ thống</span>
            </h3>
            <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100 shadow-2xs">
              {/* Settings */}
              <button
                type="button"
                onClick={() => setActiveSection('settings')}
                className={`w-full px-3.5 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  activeSection === 'settings'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-800 hover:bg-slate-50 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <SettingsIcon className={`w-4 h-4 ${activeSection === 'settings' ? 'text-[#168039]' : 'text-slate-600'}`} />
                  <span>Cài đặt hệ thống</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Version info */}
              <button
                type="button"
                onClick={() => setActiveSection('version')}
                className={`w-full px-3.5 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  activeSection === 'version'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-800 hover:bg-slate-50 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Info className={`w-4 h-4 ${activeSection === 'version' ? 'text-[#168039]' : 'text-slate-600'}`} />
                  <span>Thông tin phiên bản</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Terms and conditions */}
              <button
                type="button"
                onClick={() => setActiveSection('terms')}
                className={`w-full px-3.5 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  activeSection === 'terms'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-800 hover:bg-slate-50 font-semibold'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`w-4 h-4 ${activeSection === 'terms' ? 'text-[#168039]' : 'text-slate-600'}`} />
                  <span>Điều khoản & quy chế</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Đăng xuất tài khoản */}
              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout()
                    toast.info('Đã đăng xuất khỏi SmashCourt')
                  }}
                  className="w-full px-3.5 py-3 flex items-center justify-between text-xs text-rose-700 hover:bg-rose-50 font-bold transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Đăng xuất tài khoản</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </button>
              )}
            </div>
          </div>

          {/* Group 3: Quản lý nâng cao (Role-based for Court Owner & System Admin) */}
          {currentUser && (currentUser.role === 'COURT_OWNER' || currentUser.role === 'SYSTEM_ADMIN') && (
            <div className="space-y-1.5">
              <h3 className="text-xs sm:text-[13px] font-bold text-[#168039] px-1">Quản lý nâng cao</h3>
              <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden divide-y divide-slate-100 shadow-2xs">
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.OWNER_DASHBOARD)}
                  className="w-full px-3.5 py-3 flex items-center justify-between text-xs text-slate-800 hover:bg-slate-50 font-semibold transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Building className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-slate-900 group-hover:text-emerald-800">Kênh Quản lý Chủ sân</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
                </button>

                {currentUser.role === 'SYSTEM_ADMIN' && (
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.ADMIN_PORTAL)}
                    className="w-full px-3.5 py-3 flex items-center justify-between text-xs text-slate-800 hover:bg-slate-50 font-semibold transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-slate-900" />
                      <span className="font-bold text-slate-900">Cổng Quản trị viên</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ================= RIGHT MAIN PANEL ================= */}
      <main className={`flex-1 w-full max-w-full overflow-x-hidden bg-[#f8fafc] min-h-[calc(100vh-64px)] flex flex-col relative ${isSectionSelected ? 'flex' : 'hidden md:flex'}`}>
        {/* Top Header Bar across the Right Main Panel */}
        <div className="bg-[#168039] text-white h-14 sm:h-16 px-4 sm:px-8 flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => navigate(ROUTES.ACCOUNT)}
              className="md:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors cursor-pointer mr-2 shrink-0"
              title="Quay lại danh mục"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
              <span>Menu</span>
            </button>
            <h1 className="text-base sm:text-lg font-extrabold tracking-normal text-white truncate">
              {activeSection === 'bookings' && 'Danh sách sân đã đặt'}
              {activeSection === 'profile' && 'Cập nhật thông tin cá nhân'}
              {activeSection === 'membership' && 'Hạng hội viên SmashCourt'}
              {activeSection === 'groups' && 'Nhóm câu lạc bộ & Giao lưu'}
              {activeSection === 'classes' && 'Lịch thi đấu & Lớp học'}
              {activeSection === 'vouchers' && 'Ví Voucher & Khuyến mãi'}
              {activeSection === 'settings' && 'Cài đặt & Thông báo'}
              {activeSection === 'terms' && 'Điều khoản sử dụng & Quy chế'}
              {activeSection === 'version' && 'Thông tin phiên bản SmashCourt'}
            </h1>
          </div>
        </div>

        {/* Sub-bar Filter for Bookings Section */}
        {activeSection === 'bookings' && (
          <div className="px-4 sm:px-8 py-3 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold overflow-x-auto no-scrollbar max-w-full shrink-0">
              <button
                type="button"
                onClick={() => setBookingStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  bookingStatusFilter === 'all'
                    ? 'bg-white text-[#168039] font-bold '
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Tất cả ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setBookingStatusFilter('CONFIRMED')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  bookingStatusFilter === 'CONFIRMED'
                    ? 'bg-white text-[#168039] font-bold '
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Đã xác nhận
              </button>
              <button
                type="button"
                onClick={() => setBookingStatusFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  bookingStatusFilter === 'COMPLETED'
                    ? 'bg-white text-[#168039] font-bold '
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Hoàn thành
              </button>
              <button
                type="button"
                onClick={() => setBookingStatusFilter('CANCELLED')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  bookingStatusFilter === 'CANCELLED'
                    ? 'bg-white text-rose-600 font-bold '
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Đã hủy
              </button>
            </div>

            {/* Date Filter Dropdown Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setDateFilterOpen(!dateFilterOpen)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-xs font-semibold text-slate-800 flex items-center gap-2 transition-colors cursor-pointer "
              >
                <span>{selectedDateFilter === 'month' ? 'Tháng này' : 'Tất cả'}</span>
                <Calendar className="w-3.5 h-3.5 text-[#168039]" />
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </button>

              {dateFilterOpen && (
                <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl border border-slate-200 shadow-md py-1 z-30">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDateFilter('all')
                      setDateFilterOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Tất cả ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDateFilter('month')
                      setDateFilterOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Tháng này
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Main Content Body */}
        <div
          key={activeSection}
          className="p-4 sm:p-6 lg:p-8 pb-32 flex-1 flex flex-col w-full max-w-full overflow-x-hidden tab-slide-from-right"
        >
          {/* 1. SECTION: RESERVED BOOKINGS */}
          {activeSection === 'bookings' && (
            <div className="space-y-6 flex-1 w-full">
              {currentUser && bookingsLoading ? <p role="status" className="py-12 text-sm text-slate-600">Đang tải lịch đặt sân…</p> : bookingsError ? <EmptyState title="Không thể tải lịch đặt sân" action={<Button variant="secondary" onClick={() => void reloadBookings()}>Thử lại</Button>} /> : filteredBookings.length === 0 ? (
                <EmptyState title={currentUser ? 'Chưa có lịch đặt sân trong mục này' : 'Đăng nhập để xem lịch đặt sân'} description={currentUser ? 'Chọn sân và khung giờ phù hợp để bắt đầu.' : undefined} action={<Button onClick={currentUser ? onNavigateHome : () => onOpenAuth('login')}>{currentUser ? 'Đặt sân ngay' : 'Đăng nhập'}</Button>} />
              ) : (
                <div className="space-y-3.5 w-full">
                  {filteredBookings.map((b, idx) => (
                    <div
                      key={b.id}
                      style={{ '--stagger-delay': `${Math.min(idx * 45, 300)}ms` } as React.CSSProperties}
                      className="fade-in-item bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 hover:border-slate-300 shadow-xs transition-all space-y-3"
                    >
                      {/* Top Header Row: Green Day Tag + Facility Name + Status Pill */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 break-words">
                            {b.facilityName}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(b.status === 'HELD' || b.status === 'PENDING_PAYMENT') && <span className="text-xs font-bold text-amber-900">Chờ thanh toán</span>}
                          {b.status === 'CONFIRMED' && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#168039] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                              <span>Đã xác nhận</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#168039]" />
                            </span>
                          )}
                          {b.status === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                              <span>{b.statusMessage || 'Đã hủy'}</span>
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            </span>
                          )}
                          {b.status === 'COMPLETED' && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
                              <span>Hoàn thành</span>
                              <Check className="w-3.5 h-3.5 text-slate-600" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Details */}
                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div className="flex items-center gap-2 font-medium flex-wrap">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span className="text-slate-500">Chi tiết:</span>
                          <span className="text-slate-900 font-semibold">{b.courtName} - {b.timeRange}</span>
                          <span className="text-slate-300 hidden sm:inline">|</span>
                          <span className="text-slate-600">{b.date}</span>
                        </div>

                        {b.address && <div className="flex items-start gap-2 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span className="text-slate-500 shrink-0">Địa chỉ:</span>
                          <span className="text-slate-800">{b.address}</span>
                        </div>}
                      </div>

                      {/* Bottom Action Row: Lưu .ics + Total Price */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-3">
                        <button
                          type="button"
                          onClick={() => b.status !== 'CONFIRMED' && b.status !== 'COMPLETED' ? navigate(`/checkout/${b.id}`) : handleDownloadIcs(b)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {b.status !== 'CONFIRMED' && b.status !== 'COMPLETED' ? <ChevronRight className="w-3.5 h-3.5 text-[#168039]" /> : <Download className="w-3.5 h-3.5 text-[#168039]" />}
                          <span>{b.status !== 'CONFIRMED' && b.status !== 'COMPLETED' ? 'Xem đơn' : 'Lưu .ics'}</span>
                        </button>

                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-slate-500 font-medium">Tổng tiền:</span>
                          <span className="text-base sm:text-lg font-black text-[#168039]">
                            {b.totalPrice.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. SECTION: EDIT PROFILE (Full Width Workplace) */}
          {activeSection === 'profile' && (
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 sm:p-8 space-y-6">
              {currentUser ? <>
                <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                  <UserAvatar src={currentUser.avatarUrl} name={currentUser.fullName} className="h-14 w-14" />
                  <div className="min-w-0"><h3 className="break-words text-lg font-bold text-slate-900">{currentUser.fullName}</h3><p className="break-words text-sm text-slate-600">{currentUser.email}</p></div>
                </div>
                <ProfileForm key={currentUser.id} user={currentUser} onSaved={onUpdateUser} />
                <Button variant="danger" onClick={onLogout}>Đăng xuất</Button>
              </> : <EmptyState title="Đăng nhập để xem hồ sơ" action={<Button onClick={() => onOpenAuth('login')}>Đăng nhập</Button>} />}
            </div>
          )}

          {/* 3. SECTION: MEMBERSHIP */}
          {activeSection === 'membership' && (
            <div className="w-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Crown className="w-6 h-6 text-[#e5a92c]" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Gói hội viên SmashCourt</h3>
                  <p className="text-xs text-slate-500 font-medium">Tích điểm đổi quà & ưu đãi đặt sân thể thao</p>
                </div>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Chương trình hội viên và tích điểm hiện chưa được hỗ trợ. Bạn vẫn có thể đặt sân theo ngày và theo dõi đơn trong mục Lịch đặt.
              </p>
            </div>
          )}

          {/* 4. SECTION: GROUPS */}
          {activeSection === 'groups' && (
            <div className="w-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Users className="w-6 h-6 text-[#168039]" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Nhóm câu lạc bộ & Giao lưu</h3>
                  <p className="text-xs text-slate-500 font-medium">Kết nối cùng các câu lạc bộ thể thao lân cận</p>
                </div>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Tính năng nhóm câu lạc bộ và tìm bạn giao lưu hiện chưa được hỗ trợ.
              </p>
            </div>
          )}

          {/* 5. SECTION: CLASSES */}
          {activeSection === 'classes' && (
            <div className="w-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <GraduationCap className="w-6 h-6 text-[#168039]" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Lịch thi đấu & Lớp học</h3>
                  <p className="text-xs text-slate-500 font-medium">Đăng ký lớp huấn luyện kỹ thuật & giải đấu</p>
                </div>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Đăng ký khóa học và giải đấu hiện chưa được hỗ trợ.
              </p>
            </div>
          )}

          {/* 6. SECTION: VOUCHERS */}
          {activeSection === 'vouchers' && (
            <div className="w-full bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <Ticket className="w-6 h-6 text-rose-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900">Ví Voucher & Mã ưu đãi</h3>
                  <p className="text-xs text-slate-500 font-medium">Quản lý mã giảm giá đặt sân và dịch vụ</p>
                </div>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed">
                Ví voucher hiện chưa được hỗ trợ. Giá thanh toán hiển thị theo đơn đặt sân của bạn.
              </p>
            </div>
          )}

          {/* 7. SECTION: SETTINGS */}
          {activeSection === 'settings' && (
            <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 sm:p-8">
              {currentUser ? <IntegrationSettings user={currentUser} onUpdated={onUpdateUser} /> : <EmptyState title="Đăng nhập để quản lý kết nối" action={<Button onClick={() => onOpenAuth('login')}>Đăng nhập</Button>} />}
            </div>
          )}

          {/* 8. SECTION: TERMS */}
          {activeSection === 'terms' && (
            <div className="w-full">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-4 text-xs text-slate-800 leading-relaxed font-normal w-full">
                <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">Quy chế sử dụng & Đặt sân thể thao SmashCourt</h3>
                <p>
                  1. Người chơi cam kết đến đúng giờ đã đăng ký trong đơn đặt sân. Đơn vị chủ sân có quyền từ chối hoàn tiền nếu người chơi đến trễ quá 30 phút mà không thông báo trước.
                </p>
                <p>
                  2. Mọi giao dịch đặt sân trực tuyến qua hệ thống đều được đảm bảo giữ chỗ tức thì. Thời gian giữ chỗ trực tuyến trước khi thanh toán tối đa 10 phút.
                </p>
                <p>
                  3. Người tham gia các buổi chơi giao lưu (Khám phá) cần tuân thủ văn hóa thể thao lành mạnh, trang phục phù hợp với tiêu chuẩn thi đấu tại cơ sở thể thao.
                </p>
              </div>
            </div>
          )}

          {/* 9. SECTION: VERSION */}
          {activeSection === 'version' && (
            <div className="w-full">
              <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-xs space-y-4 w-full">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-[#168039] text-white flex items-center justify-center font-bold">
                    SC
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      SmashCourt Badminton Booking Platform
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">Phiên bản ổn định: v1.0.0 (Build 2026)</p>
                  </div>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  SmashCourt là nền tảng quản lý và đặt sân thể thao thông minh, hỗ trợ đa bộ môn (Cầu lông, Pickleball, v.v.) với định vị bản đồ trực quan, tìm bạn ghép cặp giao lưu và hỗ trợ xác nhận đặt chỗ thời gian thực.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

