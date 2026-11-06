import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Calendar,
  Info,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Download,
  Clock,
  MapPin,
  Bell,
  Save,
  Users,
  Trophy,
  Crown,
  Ticket,
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Check,
  GraduationCap,
  Copy,
  UserCheck,
  User as UserIcon,
  ChevronDown,
  Building,
} from 'lucide-react'
import type { User } from '../../types/user'
import { toast } from 'sonner'
import { ROUTES } from '../../../app/router'

export interface UserBooking {
  id: string
  facilityName: string
  courtName: string
  address: string
  date: string
  dayLabel: string
  timeRange: string
  totalPrice: number
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
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

  // Edit profile state
  const [editName, setEditName] = useState(currentUser?.fullName || '')
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '')

  // Bookings list state inspired by the reference design
  const [bookings] = useState<UserBooking[]>([
    {
      id: 'bk_101',
      facilityName: 'Phúc Long Badminton Arena',
      courtName: 'Yard 5',
      address: 'đường Tân Triều Mới, Tân Triều, Thanh Trì, Hà Nội',
      date: 'May 30, 2026',
      dayLabel: 'Day',
      timeRange: '22h00 - 24h00',
      totalPrice: 280000,
      status: 'CONFIRMED',
      sportType: 'Cầu lông',
    },
    {
      id: 'bk_102',
      facilityName: 'Thắng Lĩnh Sport',
      courtName: 'Yard 2',
      address: 'đường Tân Triều Mới, Tân Triều, Thanh Trì, Hà Nội',
      date: 'May 29, 2026',
      dayLabel: 'Day',
      timeRange: '22h00 - 24h00',
      totalPrice: 240000,
      status: 'CANCELLED',
      sportType: 'Cầu lông',
      statusMessage: 'Cancel due to payment timeout',
    },
    {
      id: 'bk_103',
      facilityName: 'Thắng Lĩnh Sport',
      courtName: 'C.Lông 2',
      address: '948 Quang Trung, Hà Đông, Hà Nội',
      date: 'May 21, 2026',
      dayLabel: 'Day',
      timeRange: '17h30 - 18h00, C.Lông 2: 18h00 - 19h30',
      totalPrice: 210000,
      status: 'CONFIRMED',
      sportType: 'Cầu lông',
    },
    {
      id: 'bk_104',
      facilityName: 'CLB Cầu Giấy Star Sport',
      courtName: 'Yard 5',
      address: 'đường Tân Triều Mới, Tân Triều, Thanh Trì, Hà Nội',
      date: 'May 3, 2026',
      dayLabel: 'Day',
      timeRange: '22h00 - 23h30',
      totalPrice: 195000,
      status: 'COMPLETED',
      sportType: 'Cầu lông',
    },
  ])

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    if (bookingStatusFilter !== 'all' && b.status !== bookingStatusFilter) {
      return false
    }
    if (selectedDateFilter === 'may' && !b.date.includes('May')) {
      return false
    }
    return true
  })

  // Save profile changes
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    onUpdateUser({
      ...currentUser,
      fullName: editName,
      phone: editPhone,
    })
    setActiveSection('bookings')
    toast.success('Cập nhật thông tin thành công!')
  }

  // Toggle FCM Web Push
  const handleToggleFcm = () => {
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để bật thông báo!')
      return
    }
    const nextState = !currentUser.fcmEnabled
    onUpdateUser({ ...currentUser, fcmEnabled: nextState })
    if (nextState) {
      toast.success('Đã kích hoạt thông báo Web Push!')
    } else {
      toast.info('Đã tắt thông báo Web Push.')
    }
  }

  // Toggle Google Calendar
  const handleToggleCalendar = () => {
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để đồng bộ lịch!')
      return
    }
    const next = !currentUser.calendarConnected
    onUpdateUser({ ...currentUser, calendarConnected: next, calendarEmail: next ? currentUser.email : undefined })
    if (next) {
      toast.success('Đã liên kết Google Calendar thành công!')
    } else {
      toast.info('Đã hủy liên kết Google Calendar.')
    }
  }

  // Download .ics sample
  const handleDownloadIcs = (booking: UserBooking) => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SmashCourt//Badminton Booking VN//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
SUMMARY:Đặt sân: ${booking.facilityName} (${booking.courtName})
DESCRIPTION:Lịch đặt sân thể thao qua hệ thống SmashCourt. Khung giờ: ${booking.timeRange}
LOCATION:${booking.address}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `smashcourt-${booking.id}.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Đã tải file lịch .ics về máy!')
  }

  return (
    <div className="w-full min-h-[calc(100vh-64px)] flex flex-col md:flex-row bg-[#f8fafc] text-slate-900">
      {/* ================= LEFT SIDEBAR (Reference inspired) ================= */}
      <aside className="w-full md:w-80 lg:w-[360px] shrink-0 bg-[#eef8f2] border-r border-emerald-200/60 flex flex-col">
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
                <img
                  src={
                    currentUser.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser.fullName}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white/90 shrink-0"
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
              <span className="text-xs truncate">Hạng thành viên: Thành viên Bạc</span>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-200 shrink-0" />
          </button>
        </div>

        {/* 2. Four Quick Action Shortcut Buttons */}
        <div className="grid grid-cols-4 gap-2 p-3 sm:p-4 bg-[#eef8f2] border-b border-emerald-200/60">
          {/* Calendar */}
          <button
            type="button"
            onClick={() => setActiveSection('bookings')}
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-colors cursor-pointer text-center ${
              activeSection === 'bookings'
                ? 'bg-emerald-100/90 border-[#168039] text-[#168039] shadow-xs'
                : 'bg-white hover:bg-emerald-50/70 border-emerald-200/60 text-slate-800 shadow-xs'
            }`}
          >
            <Calendar
              className={`w-5 h-5 mb-1.5 transition-colors ${
                activeSection === 'bookings' ? 'text-[#168039]' : 'text-slate-700'
              }`}
            />
            <span className="text-[11px] font-semibold leading-tight">Đặt sân</span>
          </button>

          {/* Notification */}
          <button
            type="button"
            onClick={() => setActiveSection('settings')}
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-colors cursor-pointer text-center ${
              activeSection === 'settings'
                ? 'bg-emerald-100/90 border-[#168039] text-[#168039] shadow-xs'
                : 'bg-white hover:bg-emerald-50/70 border-emerald-200/60 text-slate-800 shadow-xs'
            }`}
          >
            <Bell
              className={`w-5 h-5 mb-1.5 transition-colors ${
                activeSection === 'settings' ? 'text-[#168039]' : 'text-slate-700'
              }`}
            />
            <span className="text-[11px] font-semibold leading-tight">Thông báo</span>
          </button>

          {/* Course / Giao lưu */}
          <button
            type="button"
            onClick={() => setActiveSection('classes')}
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-colors cursor-pointer text-center ${
              activeSection === 'classes'
                ? 'bg-emerald-100/90 border-[#168039] text-[#168039] shadow-xs'
                : 'bg-white hover:bg-emerald-50/70 border-emerald-200/60 text-slate-800 shadow-xs'
            }`}
          >
            <Trophy
              className={`w-5 h-5 mb-1.5 transition-colors ${
                activeSection === 'classes' ? 'text-[#168039]' : 'text-slate-700'
              }`}
            />
            <span className="text-[11px] font-semibold leading-tight">Lớp học</span>
          </button>

          {/* Voucher */}
          <button
            type="button"
            onClick={() => setActiveSection('vouchers')}
            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-colors cursor-pointer text-center ${
              activeSection === 'vouchers'
                ? 'bg-emerald-100/90 border-[#168039] text-[#168039] shadow-xs'
                : 'bg-white hover:bg-emerald-50/70 border-emerald-200/60 text-slate-800 shadow-xs'
            }`}
          >
            <Ticket
              className={`w-5 h-5 mb-1.5 transition-colors ${
                activeSection === 'vouchers' ? 'text-[#168039]' : 'text-slate-700'
              }`}
            />
            <span className="text-[11px] font-semibold leading-tight">Voucher</span>
          </button>
        </div>

        {/* 3. Activities Group */}
        <div className="py-2 border-b border-emerald-200/60">
          <div className="px-4 py-2 text-xs font-bold text-slate-900">Hoạt động</div>

          <div className="space-y-0.5">
            {/* My group */}
            <button
              type="button"
              onClick={() => setActiveSection('groups')}
              className={`w-full px-4 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                activeSection === 'groups'
                  ? 'bg-white text-[#168039] font-bold border-l-4 border-[#168039] shadow-xs'
                  : 'text-slate-800 hover:bg-white/70 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-[#168039]" />
                <span>Nhóm giao lưu</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Class schedule list */}
            <button
              type="button"
              onClick={() => setActiveSection('classes')}
              className={`w-full px-4 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                activeSection === 'classes'
                  ? 'bg-white text-[#168039] font-bold border-l-4 border-[#168039] shadow-xs'
                  : 'text-slate-800 hover:bg-white/70 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <GraduationCap className="w-4 h-4 text-[#168039]" />
                <span>Lịch lớp học</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Membership package */}
            <button
              type="button"
              onClick={() => setActiveSection('membership')}
              className={`w-full px-4 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                activeSection === 'membership'
                  ? 'bg-white text-[#168039] font-bold border-l-4 border-[#168039] shadow-xs'
                  : 'text-slate-800 hover:bg-white/70 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <Crown className="w-4 h-4 text-[#168039]" />
                <span>Gói thành viên</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* 4. System Group */}
        <div className="py-2 flex-1 flex flex-col justify-between">
          <div>
            <div className="px-4 py-2 text-xs font-bold text-slate-900">Hệ thống</div>

            <div className="space-y-0.5">
              {/* Settings */}
              <button
                type="button"
                onClick={() => setActiveSection('settings')}
                className={`w-full px-4 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  activeSection === 'settings'
                    ? 'bg-white text-[#168039] font-bold border-l-4 border-[#168039] shadow-xs'
                    : 'text-slate-800 hover:bg-white/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <SettingsIcon className="w-4 h-4 text-[#168039]" />
                  <span>Cài đặt hệ thống</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Terms and conditions */}
              <button
                type="button"
                onClick={() => setActiveSection('terms')}
                className={`w-full px-4 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  activeSection === 'terms'
                    ? 'bg-white text-[#168039] font-bold border-l-4 border-[#168039] shadow-xs'
                    : 'text-slate-800 hover:bg-white/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#168039]" />
                  <span>Điều khoản & chính sách</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Version info */}
              <button
                type="button"
                onClick={() => setActiveSection('version')}
                className={`w-full px-4 py-3 flex items-center justify-between text-xs transition-colors cursor-pointer ${
                  activeSection === 'version'
                    ? 'bg-white text-[#168039] font-bold border-l-4 border-[#168039] shadow-xs'
                    : 'text-slate-800 hover:bg-white/70 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Info className="w-4 h-4 text-[#168039]" />
                  <span>Thông tin phiên bản: 1.0.0 SmashCourt</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {/* Quản lý nâng cao: Phân quyền theo vai trò (Chỉ hiển thị cho Chủ sân hoặc Quản trị viên) */}
            {currentUser && (currentUser.role === 'COURT_OWNER' || currentUser.role === 'SYSTEM_ADMIN') && (
              <div className="mt-3 pt-3 border-t border-emerald-200/60">
                <div className="px-4 py-1 text-xs font-bold text-slate-900">Quản lý nâng cao</div>
                <div className="space-y-0.5 mt-1">
                  <button
                    type="button"
                    onClick={() => navigate(ROUTES.OWNER_DASHBOARD)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-800 hover:bg-white/80 font-medium transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-slate-900 group-hover:text-emerald-800">Kênh Quản lý Chủ sân</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
                  </button>

                  {currentUser.role === 'SYSTEM_ADMIN' && (
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.ADMIN_PORTAL)}
                      className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-800 hover:bg-white/80 font-medium transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
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

          {/* Authentication Actions at Bottom of Sidebar */}
          <div className="p-4 border-t border-emerald-200/60 bg-[#e4f3e9]">
            {currentUser ? (
              <button
                type="button"
                onClick={() => {
                  onLogout()
                  toast.info('Đã đăng xuất khỏi SmashCourt')
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <LogOut className="w-4 h-4 text-slate-500" />
                <span>Đăng xuất</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth('login')}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register')}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ================= RIGHT MAIN PANEL ================= */}
      <main className="flex-1 bg-[#f8fafc] min-h-[calc(100vh-64px)] flex flex-col relative">
        {/* Top Header Bar across the Right Main Panel */}
        <div className="bg-[#168039] text-white h-14 sm:h-16 px-4 sm:px-8 flex items-center justify-between relative shrink-0">
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-normal text-white">
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
          <div className="hidden sm:flex items-center gap-2 text-xs text-emerald-100 font-medium">
            <span>SmashCourt</span>
            <span>•</span>
            <span className="text-white font-semibold">Tài khoản</span>
          </div>
        </div>

        {/* Sub-bar Filter for Bookings Section */}
        {activeSection === 'bookings' && (
          <div className="px-4 sm:px-8 py-3 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBookingStatusFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  bookingStatusFilter === 'all'
                    ? 'bg-white text-[#168039] font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Tất cả ({bookings.length})
              </button>
              <button
                type="button"
                onClick={() => setBookingStatusFilter('CONFIRMED')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  bookingStatusFilter === 'CONFIRMED'
                    ? 'bg-white text-[#168039] font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Đã xác nhận
              </button>
              <button
                type="button"
                onClick={() => setBookingStatusFilter('COMPLETED')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  bookingStatusFilter === 'COMPLETED'
                    ? 'bg-white text-[#168039] font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Hoàn thành
              </button>
              <button
                type="button"
                onClick={() => setBookingStatusFilter('CANCELLED')}
                className={`px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  bookingStatusFilter === 'CANCELLED'
                    ? 'bg-white text-rose-600 font-bold shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                Đã hủy
              </button>
            </div>

            {/* Date Filter Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDateFilterOpen(!dateFilterOpen)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-xs font-semibold text-slate-800 flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <span>{selectedDateFilter === 'may' ? 'Tháng 5/2026' : 'Tất cả'}</span>
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
                      setSelectedDateFilter('may')
                      setDateFilterOpen(false)
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-800 font-medium cursor-pointer"
                  >
                    Tháng 5/2026
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Main Content Body */}
        <div
          key={activeSection}
          className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col tab-slide-from-right"
        >
          {/* 1. SECTION: RESERVED BOOKINGS */}
          {activeSection === 'bookings' && (
            <div className="space-y-6 flex-1">
              {filteredBookings.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
                    <Calendar className="w-8 h-8" />
                  </div>
                  <p className="text-base font-bold text-slate-900">
                    Bạn chưa có lịch đặt sân nào
                  </p>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm font-medium">
                    Chưa có lịch đặt sân nào trong mục này. Hãy tìm sân gần nhất và đặt sân ngay!
                  </p>
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Đặt sân ngay
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5 max-w-4xl">
                  {filteredBookings.map((b, idx) => (
                    <div
                      key={b.id}
                      style={{ '--stagger-delay': `${Math.min(idx * 45, 300)}ms` } as React.CSSProperties}
                      className="fade-in-item bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 hover:border-slate-300 shadow-xs transition-all space-y-3"
                    >
                      {/* Top Header Row: Green Day Tag + Facility Name + Status Pill */}
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="bg-[#168039] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-md shrink-0">
                            Ngày
                          </span>
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                            {b.facilityName}
                          </h3>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-1.5 shrink-0">
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
                          <span className="text-slate-900 font-semibold">{b.courtName} • {b.timeRange}</span>
                          <span className="text-slate-300 hidden sm:inline">|</span>
                          <span className="text-slate-600">{b.date}</span>
                        </div>

                        <div className="flex items-start gap-2 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                          <span className="text-slate-500 shrink-0">Địa chỉ:</span>
                          <span className="text-slate-800">{b.address}</span>
                        </div>
                      </div>

                      {/* Bottom Action Row: Lưu .ics + Total Price */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 gap-3">
                        <button
                          type="button"
                          onClick={() => handleDownloadIcs(b)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-[#168039]" />
                          <span>Lưu .ics</span>
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

          {/* 2. SECTION: EDIT PROFILE */}
          {activeSection === 'profile' && (
            <div className="max-w-md mx-auto w-full py-4">
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-5">
                <div className="pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Thông tin cá nhân</h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Cập nhật họ tên và số điện thoại liên hệ nhận thông báo</p>
                </div>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nhập họ và tên..."
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#168039]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email đăng ký
                    </label>
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      disabled
                      placeholder="Chưa đăng ký email"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 text-xs sm:text-sm cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số điện thoại liên hệ
                    </label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="0988 xxx xxx"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#168039]"
                    />
                  </div>

                  <div className="pt-3 flex items-center gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>Lưu thay đổi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection('bookings')}
                      className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 3. SECTION: MEMBERSHIP */}
          {activeSection === 'membership' && (
            <div className="max-w-2xl mx-auto w-full py-4 space-y-5">
              <div className="p-5 rounded-2xl bg-[#168039] text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Crown className="w-6 h-6 text-[#e5a92c]" />
                    <div>
                      <div className="text-xs text-emerald-100 font-semibold">Hạng hội viên hiện tại</div>
                      <div className="text-lg font-extrabold text-white">Thành viên Bạc</div>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold">2.450 / 5.000 điểm</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#e5a92c] h-2 rounded-full w-[49%]" />
                </div>
                <div className="text-xs text-emerald-100 flex justify-between font-medium">
                  <span>Hạng Bạc</span>
                  <span>Còn 2.550 điểm để lên Hạng Vàng</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold text-slate-900 text-sm">Đặc quyền hạng thành viên SmashCourt</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="font-bold text-xs text-[#168039]">Ưu tiên giữ chỗ 15 phút</div>
                    <p className="text-xs text-slate-700 font-normal">Thêm 5 phút thanh toán giữ chỗ so với người dùng thông thường.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="font-bold text-xs text-[#168039]">Tặng 2 Voucher giảm 10% mỗi tháng</div>
                    <p className="text-xs text-slate-700 font-normal">Áp dụng cho mọi đơn đặt sân trên toàn hệ thống SmashCourt.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="font-bold text-xs text-[#168039]">Tích 5% giá trị đơn đặt sân</div>
                    <p className="text-xs text-slate-700 font-normal">Đổi điểm thưởng lấy phụ kiện cầu lông hoặc giờ chơi miễn phí.</p>
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                    <div className="font-bold text-xs text-[#168039]">Hỗ trợ hoàn đổi linh hoạt</div>
                    <p className="text-xs text-slate-700 font-normal">Được đổi lịch chơi trước 4 tiếng mà không mất phí dịch vụ.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. SECTION: MY GROUPS */}
          {activeSection === 'groups' && (
            <div className="max-w-2xl mx-auto w-full py-4 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Câu lạc bộ & Nhóm giao lưu của bạn</h3>
                <button
                  type="button"
                  onClick={() => toast.info('Tính năng tạo nhóm mới sẽ sớm khả dụng!')}
                  className="px-3 py-1.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  + Tạo nhóm mới
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#168039] text-white flex items-center justify-center font-bold">
                      CLB
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">CLB Cầu Lông Tân Triều Sport</div>
                      <div className="text-xs text-slate-600 font-medium">28 thành viên • Lịch cố định Thứ 3, 5, 7 (20:00 - 22:00)</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.success('Đã mở trang nhóm!')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Xem nhóm
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                      PK
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-900">Hội Pickleball & Badminton Hà Đông</div>
                      <div className="text-xs text-slate-600 font-medium">42 thành viên • Giao lưu cuối tuần Sân Thắng Lĩnh</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toast.success('Đã mở trang nhóm!')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                  >
                    Xem nhóm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 5. SECTION: CLASS SCHEDULE LIST */}
          {activeSection === 'classes' && (
            <div className="max-w-2xl mx-auto w-full py-4 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Lịch học kỹ thuật & Ca thi đấu giao lưu</h3>
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">Khóa huấn luyện Smash & Di chuyển nâng cao</span>
                    <span className="text-xs font-bold text-[#168039] bg-emerald-50 px-2.5 py-0.5 rounded-md">Đang tham gia</span>
                  </div>
                  <div className="text-xs text-slate-700 font-medium flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Thứ Hai, Thứ Tư (18:00 - 19:30) • HLV Nguyễn Văn An</span>
                  </div>
                  <div className="text-xs text-slate-600 font-medium flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sân Phúc Long Badminton Arena, Đống Đa, Hà Nội</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 6. SECTION: VOUCHERS */}
          {activeSection === 'vouchers' && (
            <div className="max-w-2xl mx-auto w-full py-4 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">Mã ưu đãi khả dụng của bạn</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-[#168039]">SMASH10</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('SMASH10')
                        toast.success('Đã sao chép mã SMASH10')
                      }}
                      className="text-xs font-semibold text-[#168039] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Sao chép</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 font-semibold">Giảm 10% tối đa 50.000đ cho đơn đặt sân cuối tuần</p>
                  <p className="text-[11px] text-slate-600 font-medium">Hạn dùng: Đến 31/12/2026</p>
                </div>

                <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-amber-800">CHAOBANMOI</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('CHAOBANMOI')
                        toast.success('Đã sao chép mã CHAOBANMOI')
                      }}
                      className="text-xs font-semibold text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Sao chép</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-800 font-semibold">Giảm ngay 30.000đ cho đơn đặt sân đầu tiên qua PayOS</p>
                  <p className="text-[11px] text-slate-600 font-medium">Hạn dùng: Đến 30/06/2026</p>
                </div>
              </div>
            </div>
          )}

          {/* 7. SECTION: SETTINGS */}
          {activeSection === 'settings' && (
            <div className="max-w-xl mx-auto w-full py-4 space-y-5">
              <h3 className="font-bold text-slate-900 text-sm">Cài đặt thông báo & Đồng bộ lịch</h3>

              <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white">
                {/* FCM Push */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-[#168039] shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Thông báo trình duyệt Web Push</div>
                      <div className="text-[11px] text-slate-600 font-medium">Nhận nhắc giờ thi đấu & thông báo duyệt đơn đặt sân</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleFcm}
                    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      currentUser?.fcmEnabled ? 'bg-[#168039]' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full transform transition-transform ${
                        currentUser?.fcmEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Google Calendar */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-[#168039] shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Đồng bộ Google Calendar</div>
                      <div className="text-[11px] text-slate-600 font-medium">Tự động thêm lịch thi đấu đã đặt vào Google Calendar</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleCalendar}
                    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      currentUser?.calendarConnected ? 'bg-[#168039]' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full transform transition-transform ${
                        currentUser?.calendarConnected ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 8. SECTION: TERMS */}
          {activeSection === 'terms' && (
            <div className="max-w-2xl mx-auto w-full py-4">
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-4 text-xs text-slate-800 leading-relaxed font-normal">
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
            <div className="max-w-xl mx-auto w-full py-4">
              <div className="bg-white p-6 sm:p-7 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
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
