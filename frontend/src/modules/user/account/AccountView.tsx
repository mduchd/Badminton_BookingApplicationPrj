import React, { useState } from 'react'
import {
  Calendar,
  Info,
  ShieldCheck,
  Award,
  Languages,
  ChevronRight,
  LogOut,
  Sparkles,
  Download,
  Clock,
  MapPin,
  Bell,
  Edit3,
  Save,
} from 'lucide-react'
import type { User } from '../../types/user'
import { toast } from 'sonner'
import { AppLogo } from '../../../components/shared/AppLogo'

export interface UserBooking {
  id: string
  facilityName: string
  courtName: string
  address: string
  date: string
  timeRange: string
  totalPrice: number
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
  sportType: string
}

interface AccountViewProps {
  currentUser: User | null
  onOpenAuth: (tab?: 'login' | 'register') => void
  onUpdateUser: (updated: User) => void
  onLogout: () => void
  onNavigateHome: () => void
  onOpenAIChat: () => void
}

type ActiveSection = 'bookings' | 'profile' | 'version' | 'terms' | 'whatsnew'

export const AccountView: React.FC<AccountViewProps> = ({
  currentUser,
  onOpenAuth,
  onUpdateUser,
  onLogout,
  onNavigateHome,
  onOpenAIChat,
}) => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('bookings')
  const [bookingFilter, setBookingFilter] = useState<'all' | 'upcoming' | 'completed'>('all')

  // Edit profile state
  const [editName, setEditName] = useState(currentUser?.fullName || '')
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '')

  // Bookings list state
  const [bookings, setBookings] = useState<UserBooking[]>([
    {
      id: 'bk_101',
      facilityName: 'Phúc Long Badminton Arena',
      courtName: 'Sân số 2 (Thảm tiêu chuẩn BWF)',
      address: '460 Trần Quý Cáp, Đống Đa, Hà Nội',
      date: 'Tối mai - 07/11/2026',
      timeRange: '19:00 - 21:00 (2 giờ)',
      totalPrice: 140000,
      status: 'CONFIRMED',
      sportType: 'Cầu lông',
    },
    {
      id: 'bk_102',
      facilityName: 'CLB Cầu Giấy Star Sport',
      courtName: 'Sân số 1 (Sàn gỗ thi đấu)',
      address: '35 Trần Thái Tông, Cầu Giấy, Hà Nội',
      date: '05/11/2026',
      timeRange: '18:00 - 20:00 (2 giờ)',
      totalPrice: 160000,
      status: 'COMPLETED',
      sportType: 'Cầu lông',
    },
  ])

  // Filtered bookings
  const filteredBookings = bookings.filter((b) => {
    if (bookingFilter === 'upcoming') return b.status === 'CONFIRMED'
    if (bookingFilter === 'completed') return b.status === 'COMPLETED'
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
      toast.success('Đã kích hoạt FCM Web Push! 🔔')
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
      toast.success('Đã liên kết Google Calendar thành công! 📅')
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT SIDEBAR (Profile & Menu Items) ================= */}
        <aside className="lg:col-span-4 space-y-5">
          {/* 1. Profile / Brand Card */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-4">
              {currentUser ? (
                <img
                  src={
                    currentUser.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser.fullName}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#168039]/20"
                />
              ) : (
                <AppLogo size="lg" variant="dark" showText={false} />
              )}

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-black text-slate-900 truncate">
                  {currentUser ? currentUser.fullName : 'SmashCourt - Sports Booking'}
                </h2>
                <p className="text-xs sm:text-sm text-amber-700 font-bold mt-0.5">
                  {currentUser
                    ? currentUser.phone || currentUser.email
                    : 'Tạo tài khoản để quản lý đặt sân dễ dàng.'}
                </p>
              </div>
            </div>

            {/* Auth Buttons or Quick Profile Action */}
            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center gap-2">
              {currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSection('profile')
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Thông tin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onLogout()
                      toast.info('Đã đăng xuất khỏi SmashCourt')
                    }}
                    className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-500" />
                    <span>Thoát</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                  >
                    Đăng ký
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 2. Activities Section */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 px-1 uppercase tracking-wider">
              Hoạt động (Activities)
            </span>
            <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setActiveSection('bookings')}
                className={`w-full px-4 py-3.5 flex items-center justify-between text-xs font-semibold transition-all cursor-pointer ${
                  activeSection === 'bookings'
                    ? 'bg-emerald-50 text-[#168039]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#168039]" />
                  <span>Danh sách sân đã đặt (Reserved bookings)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#168039] text-[10px] font-bold flex items-center justify-center">
                    {bookings.length}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            </div>
          </div>

          {/* 3. System Section */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 px-1 uppercase tracking-wider">
              Hệ thống (System)
            </span>
            <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-xs">
              {/* Version info */}
              <button
                type="button"
                onClick={() => setActiveSection('version')}
                className={`w-full px-4 py-3 flex items-center justify-between text-xs transition-all cursor-pointer ${
                  activeSection === 'version'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Info className="w-4 h-4 text-[#168039]" />
                  <span>Thông tin phiên bản: 1.0.0 SmashCourt</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Terms and conditions */}
              <button
                type="button"
                onClick={() => setActiveSection('terms')}
                className={`w-full px-4 py-3 flex items-center justify-between text-xs transition-all cursor-pointer ${
                  activeSection === 'terms'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#168039]" />
                  <span>Điều khoản & Chính sách (Terms & Conditions)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* What's new */}
              <button
                type="button"
                onClick={() => setActiveSection('whatsnew')}
                className={`w-full px-4 py-3 flex items-center justify-between text-xs transition-all cursor-pointer ${
                  activeSection === 'whatsnew'
                    ? 'bg-emerald-50 text-[#168039] font-bold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Award className="w-4 h-4 text-[#168039]" />
                  <span>Có gì mới trong ứng dụng? (What's new)</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Language */}
              <div className="px-4 py-3 flex items-center justify-between text-xs text-slate-700">
                <div className="flex items-center gap-3">
                  <Languages className="w-4 h-4 text-[#168039]" />
                  <span>Ngôn ngữ - Tiếng Việt / English</span>
                </div>
                <span className="text-[11px] font-semibold text-[#168039] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  VIE
                </span>
              </div>
            </div>
          </div>

          {/* 4. Notification & Sync settings */}
          {currentUser && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 px-1 uppercase tracking-wider">
                Đồng bộ & Thông báo
              </span>
              <div className="bg-white rounded-2xl border border-slate-200/90 divide-y divide-slate-100 overflow-hidden shadow-xs">
                {/* FCM Web Push toggle */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-[#168039]" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Thông báo Web Push</div>
                      <div className="text-[10px] text-slate-500">Nhận báo giờ thi đấu & nhắc lịch</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleFcm}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      currentUser.fcmEnabled ? 'bg-[#168039]' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        currentUser.fcmEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Google Calendar sync toggle */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-[#168039]" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Google Calendar</div>
                      <div className="text-[10px] text-slate-500">Tự động thêm vào lịch cá nhân</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleCalendar}
                    className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      currentUser.calendarConnected ? 'bg-[#168039]' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        currentUser.calendarConnected ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* ================= RIGHT MAIN PANEL ================= */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col min-h-[520px]">
          {/* Green Sub-Header */}
          <div className="bg-[#168039] text-white px-5 py-3.5 flex items-center justify-between shadow-xs">
            <h1 className="text-base sm:text-lg font-bold tracking-tight">
              {activeSection === 'bookings' && 'Reserved booking (Lịch đặt sân)'}
              {activeSection === 'profile' && 'Thông tin tài khoản cá nhân'}
              {activeSection === 'version' && 'Thông tin phiên bản SmashCourt'}
              {activeSection === 'terms' && 'Điều khoản sử dụng & Quy chế'}
              {activeSection === 'whatsnew' && 'Tính năng mới trên SmashCourt'}
            </h1>

            {/* Filter buttons for Reserved Bookings */}
            {activeSection === 'bookings' && (
              <div className="flex items-center gap-1.5 bg-white/15 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setBookingFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    bookingFilter === 'all'
                      ? 'bg-white text-[#168039] shadow-xs'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setBookingFilter('upcoming')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    bookingFilter === 'upcoming'
                      ? 'bg-white text-[#168039] shadow-xs'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  Sắp tới
                </button>
                <button
                  type="button"
                  onClick={() => setBookingFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    bookingFilter === 'completed'
                      ? 'bg-white text-[#168039] shadow-xs'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  Đã xong
                </button>
              </div>
            )}
          </div>

          {/* Panel Body Content */}
          <div className="p-5 flex-1 flex flex-col relative">
            {/* 1. SECTION: RESERVED BOOKINGS */}
            {activeSection === 'bookings' && (
              <div className="space-y-4 flex-1">
                {filteredBookings.length === 0 ? (
                  /* Empty state matching the reference layout */
                  <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-semibold text-slate-600">
                      You don't have any bookings yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      Bạn chưa có lịch đặt sân nào. Hãy khám phá và đặt sân cầu lông hoặc pickleball ngay hôm nay!
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                      <span>Hiển thị {filteredBookings.length} lịch đặt sân</span>
                      <button
                        type="button"
                        onClick={() => setBookings([])}
                        className="text-slate-400 hover:text-slate-600 text-[11px] underline cursor-pointer"
                      >
                        (Thử trạng thái trống)
                      </button>
                    </div>

                    <div className="space-y-3">
                      {filteredBookings.map((b) => (
                        <div
                          key={b.id}
                          className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200/80 p-4 transition-all space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900">
                                  {b.facilityName}
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-[#168039]">
                                  {b.sportType}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{b.address}</span>
                              </p>
                            </div>

                            <span
                              className={`self-start sm:self-auto text-xs font-bold px-2.5 py-1 rounded-full ${
                                b.status === 'CONFIRMED'
                                  ? 'bg-emerald-100 text-[#168039]'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {b.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Đã hoàn thành'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="flex items-center gap-2 text-slate-700">
                              <Calendar className="w-4 h-4 text-[#168039]" />
                              <span>{b.date}</span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-700">
                              <Clock className="w-4 h-4 text-[#168039]" />
                              <span>{b.timeRange}</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-bold text-[#168039]">
                              <span>Tổng tiền: {b.totalPrice.toLocaleString('vi-VN')}đ</span>
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between border-t border-slate-200/60 text-xs">
                            <span className="text-slate-500 font-medium">Vị trí: {b.courtName}</span>
                            <button
                              type="button"
                              onClick={() => handleDownloadIcs(b)}
                              className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-[#168039]" />
                              <span>Lưu lịch (.ics)</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. SECTION: EDIT PROFILE */}
            {activeSection === 'profile' && currentUser && (
              <div className="max-w-md mx-auto w-full py-4 space-y-5">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
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
                      value={currentUser.email}
                      disabled
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

                  <div className="pt-2 flex items-center gap-2">
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
                      className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      Quay lại
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* 3. SECTION: VERSION INFO */}
            {activeSection === 'version' && (
              <div className="space-y-4 max-w-xl">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-2xl bg-[#168039] text-white flex items-center justify-center font-bold">
                    SC
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      SmashCourt Badminton Booking Platform
                    </h3>
                    <p className="text-xs text-slate-500">Phiên bản ổn định: v1.0.0 (Build 2026)</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  SmashCourt là nền tảng quản lý và đặt sân thể thao thông minh, hỗ trợ đa bộ môn (Cầu lông, Pickleball, v.v.) với định vị bản đồ trực quan, tìm bạn ghép cặp giao lưu và hỗ trợ xác nhận đặt chỗ thời gian thực.
                </p>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1.5">
                  <div className="font-bold">Nhóm phát triển SmashCourt</div>
                  <div className="text-slate-500">Hỗ trợ kỹ thuật & đóng góp: support@smashcourt.vn</div>
                </div>
              </div>
            )}

            {/* 4. SECTION: TERMS & CONDITIONS */}
            {activeSection === 'terms' && (
              <div className="space-y-3.5 text-xs text-slate-700 max-w-2xl leading-relaxed">
                <h3 className="font-bold text-slate-900 text-sm">Quy chế sử dụng & Đặt sân</h3>
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
            )}

            {/* 5. SECTION: WHAT'S NEW */}
            {activeSection === 'whatsnew' && (
              <div className="space-y-3 text-xs max-w-xl">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <div className="font-bold text-[#168039]">Tính năng bản đồ tương tác Court Map</div>
                  <p className="text-slate-600">
                    Tìm kiếm sân xung quanh theo vị trí thực tế, gom cụm các sân gần nhau và đặt sân nhanh chóng.
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                  <div className="font-bold text-slate-900">Mục Khám phá & Lịch xé vé giao lưu</div>
                  <p className="text-slate-600">
                    Cập nhật danh sách câu lạc bộ, ca thi đấu mở để ghép cặp và tìm bạn cùng chơi.
                  </p>
                </div>
              </div>
            )}

            {/* Floating AI Helper Button in corner (matching the reference sparkle icon) */}
            <button
              type="button"
              onClick={onOpenAIChat}
              className="absolute bottom-4 right-4 w-11 h-11 rounded-full bg-white border border-slate-200 shadow-md text-[#168039] hover:bg-[#168039] hover:text-white transition-all flex items-center justify-center cursor-pointer group"
              title="Trợ lý AI SmashCourt"
            >
              <Sparkles className="w-5 h-5 text-amber-500 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
