import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  SlidersHorizontal,
  Compass,
  RotateCcw,
  Radar,
  Building2,
  Calendar,
  Sparkles,
  Ticket,
  Users,
  Flag,
  Clock,
  ChevronRight,
  Plus,
  Crown,
  BookOpen,
  Bell,
  Gift,
  RefreshCw,
  CircleDot,
  Activity,
  Trophy,
  Target,
  Waves,
  Layers,
  LogIn,
  Flame,
} from 'lucide-react'
import type { CourtResult, User } from '../../types/user'
import { formatPrice } from '../../../lib/utils'
import {
  mockSessions,
  mockBadmintonCourts,
  type SessionMatch,
  type BadmintonCourtItem,
} from '../mockData'
import { CourtCardItem } from './CourtCardItem'
import { toast } from 'sonner'

export interface KhamPhaViewProps {
  onBookCourt: (court: CourtResult) => void
  onOpenAIChat: () => void
  currentUser?: User | null
  onOpenAuth?: (tab?: 'login' | 'register') => void
  onSelectCourt?: (court: BadmintonCourtItem) => void
  onBookCourtDirect?: (court: BadmintonCourtItem | CourtResult) => void
}

export const KhamPhaView: React.FC<KhamPhaViewProps> = ({
  onBookCourt,
  onOpenAIChat,
  currentUser = null,
  onOpenAuth,
  onSelectCourt,
  onBookCourtDirect,
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const catFromUrl = searchParams.get('category')
  const activeCategory = catFromUrl || 'Social'

  const setActiveCategory = (category: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('category', category)
        return next
      },
      { replace: true }
    )
  }

  const categories = [
    { id: 'Social', label: 'Buổi chơi giao lưu', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'NoiBat', label: 'Nổi bật hôm nay', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'SuKien', label: 'Sự kiện', icon: <Ticket className="w-3.5 h-3.5" /> },
    { id: 'GoiHoiVien', label: 'Gói hội viên', icon: <Crown className="w-3.5 h-3.5" /> },
    { id: 'KhoaHoc', label: 'Khóa học', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'ThongBao', label: 'Thông báo', icon: <Bell className="w-3.5 h-3.5" /> },
    { id: 'UuDai', label: 'Ưu đãi', icon: <Gift className="w-3.5 h-3.5" /> },
    { id: 'PassSan', label: 'Pass sân', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  ]

  // Filter state
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [areaMode, setAreaMode] = useState<'radius' | 'city'>('radius')
  const [selectedRadius, setSelectedRadius] = useState('20km')
  const [selectedSport, setSelectedSport] = useState('all')
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  // Date selection
  const daysList = Array.from({ length: 14 }, (_, offset) => {
    const date = new Date()
    date.setDate(date.getDate() + offset)
    return {
      label: offset === 0 ? 'Hôm nay' : new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(date),
      date: String(date.getDate()).padStart(2, '0'),
      isToday: offset === 0,
    }
  })
  const [selectedDay, setSelectedDay] = useState(daysList[0].date)

  const sportsList = [
    { id: 'all', label: 'Tất cả môn', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { id: 'pickleball', label: 'Pickleball', icon: <CircleDot className="w-3.5 h-3.5" /> },
    { id: 'badminton', label: 'Cầu lông', icon: <Activity className="w-3.5 h-3.5 text-[#168039]" /> },
    { id: 'football', label: 'Bóng đá', icon: <Trophy className="w-3.5 h-3.5" /> },
    { id: 'basketball', label: 'Bóng rổ', icon: <CircleDot className="w-3.5 h-3.5" /> },
    { id: 'tennis', label: 'Quần vợt', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'multi', label: 'Đa năng', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'swimming', label: 'Bơi lội', icon: <Waves className="w-3.5 h-3.5" /> },
    { id: 'volleyball', label: 'Bóng chuyền', icon: <CircleDot className="w-3.5 h-3.5" /> },
    { id: 'golf', label: 'Golf', icon: <Flag className="w-3.5 h-3.5" /> },
  ]

  const handleBookSession = (session: SessionMatch) => {
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để đăng ký buổi chơi giao lưu!', {
        description: 'Đăng nhập giúp bạn nhận vé check-in và liên hệ ban tổ chức.',
      })
      onOpenAuth?.('login')
      return
    }

    const court: CourtResult = {
      courtId: session.id,
      facilityId: 'fac_' + session.id,
      facilityName: session.clubName,
      courtName: session.detail.courtNumbers + ' (' + session.detail.levelText + ')',
      address: session.clubName + ', Hà Nội',
      district: 'Hà Nội',
      imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80',
      rating: 4.9,
      reviewCount: 150,
      startTime: session.detail.timeRange.split(' - ')[0] || '19:00',
      endTime: session.detail.timeRange.split(' - ')[1] || '21:00',
      durationHours: 2,
      pricePerHour: session.detail.pricePerTicket,
      calculatedTotalPrice: session.detail.pricePerTicket,
      amenities: ['Máy lạnh', 'Bãi đỗ ô tô', 'Xé vé theo buổi'],
      availabilityCheckedAt: 'Vừa xong',
      isAvailable: true,
      googleMapsUrl: 'https://maps.google.com/?q=' + encodeURIComponent(session.clubName),
    }
    onBookCourt(court)
  }

  const trendingCourts = mockBadmintonCourts.filter((c) => (c.rating || 0) >= 4.8)

  return (
    <div className="w-full space-y-5">
      {/* 1. Page Header phẳng, trực tiếp theo quy tắc Anti AI-Slop (Không bọc vào khối hộp lơ lửng) */}
      <div className="pb-4 border-b border-slate-200 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Khám phá & Nổi bật
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-0.5">
              Khám phá các buổi chơi giao lưu cộng đồng và cụm sân đạt chuẩn đánh giá từ 4.8★.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onOpenAIChat}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-100" />
              <span>Hỏi AI gợi ý</span>
            </button>

            {currentUser ? (
              <div className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#168039]" />
                <span className="truncate max-w-[140px]">{currentUser.fullName}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth?.('login')}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-900 text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Tab Strip: Dạng thanh tabs phẳng hiện đại, trực tiếp trên layout */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pt-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-[#168039] text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Unified Workplace Canvas (Toàn bộ thao tác nằm trong MỘT khung làm việc thống nhất, không chia vụn thành cục lơ lửng) */}
      {activeCategory === 'NoiBat' ? (
        <div className="space-y-6">
          {/* Section 1: Cụm sân đánh giá cao */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-amber-600 shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Cụm sân được đánh giá cao nhất (Từ 4.8★ trở lên)
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-600">
                {trendingCourts.length} cụm sân tiêu chuẩn
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {trendingCourts.map((court, index) => (
                <CourtCardItem
                  key={court.id}
                  court={court}
                  index={index}
                  onSelectCourt={onSelectCourt || (() => {})}
                  onBook={(c) => {
                    if (onBookCourtDirect) {
                      onBookCourtDirect(c)
                    } else {
                      const courtResult: CourtResult = {
                        courtId: c.id,
                        facilityId: 'fac_' + c.id,
                        facilityName: c.name,
                        courtName: c.name,
                        address: c.address,
                        district: c.district,
                        imageUrl: c.imageUrl,
                        rating: c.rating,
                        reviewCount: c.reviewCount,
                        startTime: c.openHours.split(' - ')[0] || '06:00',
                        endTime: c.openHours.split(' - ')[1] || '23:00',
                        durationHours: 1,
                        pricePerHour: c.pricePerHour,
                        calculatedTotalPrice: c.pricePerHour,
                        amenities: c.amenities,
                        availabilityCheckedAt: 'Vừa xong',
                        isAvailable: true,
                        googleMapsUrl: 'https://maps.google.com/?q=' + encodeURIComponent(c.name),
                      }
                      onBookCourt(courtResult)
                    }
                  }}
                />
              ))}
            </div>
          </div>

          {/* Section 2: Buổi chơi giao lưu nổi bật */}
          <div className="space-y-3.5 pt-4 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#168039] shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Buổi chơi giao lưu đông thành viên tham gia
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveCategory('Social')}
                className="text-xs font-bold text-[#168039] hover:underline cursor-pointer self-start sm:self-auto"
              >
                Xem tất cả lịch giao lưu →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockSessions.slice(0, 4).map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={session.clubLogo}
                        alt={session.clubName}
                        className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0"
                      />
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {session.clubName}
                        </h3>
                        <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                          Cách bạn {session.distance} | {session.schedulesToday} lịch hôm nay
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBookSession(session)}
                      className="text-[11px] font-bold text-[#168039] hover:underline px-2.5 py-1 rounded-md bg-emerald-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Chi tiết
                    </button>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{session.detail.levelText}</span>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-600 text-white flex items-center gap-1">
                        <Flame className="w-3 h-3 text-white" />
                        Nổi bật
                      </span>
                      <span className="font-bold text-amber-900 text-xs">
                        {session.detail.timeRange}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-amber-200/60 text-xs">
                      <span className="flex items-center gap-1 text-slate-700 text-[11px] font-medium">
                        <Users className="w-3.5 h-3.5" />
                        <span>{session.detail.capacityText}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#ea580c] text-xs sm:text-sm">
                          {formatPrice(session.detail.pricePerTicket)}
                          <span className="text-[10px] font-normal text-slate-600"> / vé</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleBookSession(session)}
                          className="px-3 py-1.5 rounded-lg bg-[#168039] hover:bg-[#136c30] text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Đặt chỗ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Unified Workspace Container: Chia 2 phân vùng liền mạch trong MỘT Canvas duy nhất */
        <div className="bg-white rounded-2xl border border-slate-200 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Phân vùng 1 (Trái): BỘ LỌC TÌM KIẾM LIỀN MẠCH */}
          <aside className="lg:col-span-4 p-4 sm:p-5 space-y-4 bg-slate-50/40">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm sm:text-base">
                <SlidersHorizontal className="w-4 h-4 text-[#168039]" />
                <span>Bộ lọc tìm kiếm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedRadius('5km')}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#168039] hover:bg-emerald-50 border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Compass className="w-3 h-3" />
                  <span>Gần tôi</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSport('all')
                    setSelectedRadius('20km')
                    setOnlyAvailable(false)
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đặt lại</span>
                </button>
              </div>
            </div>

            {/* Mobile Filter Toggle */}
            <div className="lg:hidden">
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <span>{isMobileFilterOpen ? 'Thu gọn bộ lọc' : 'Tùy chỉnh khoảng cách & môn chơi'}</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${isMobileFilterOpen ? 'rotate-90' : ''}`} />
              </button>
            </div>

            <div className={`space-y-4 ${isMobileFilterOpen ? 'block' : 'hidden lg:block'}`}>
              {/* Toggle: Chỉ hiện buổi còn chỗ */}
              <div className="flex items-center justify-between py-1">
                <span className="text-xs font-bold text-slate-700">Chỉ hiện buổi còn chỗ</span>
                <button
                  type="button"
                  onClick={() => setOnlyAvailable(!onlyAvailable)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    onlyAvailable ? 'bg-[#168039] justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 bg-white rounded-full" />
                </button>
              </div>

              {/* Section: Khu vực */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-900">Khu vực tìm kiếm</h3>
                <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setAreaMode('radius')}
                    className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                      areaMode === 'radius' ? 'bg-white text-emerald-800 font-bold' : 'text-slate-600'
                    }`}
                  >
                    <Radar className="w-3.5 h-3.5" />
                    <span>Theo bán kính</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAreaMode('city')}
                    className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                      areaMode === 'city' ? 'bg-white text-emerald-800 font-bold' : 'text-slate-600'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Theo tỉnh/thành</span>
                  </button>
                </div>

                {areaMode === 'radius' ? (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {['Trong 5 km', 'Trong 10 km', 'Trong 20 km', 'Trong 30 km'].map((radius) => {
                      const val = radius.replace('Trong ', '')
                      const isActive = selectedRadius === val
                      return (
                        <button
                          key={radius}
                          type="button"
                          onClick={() => setSelectedRadius(val)}
                          className={`py-1.5 px-2.5 rounded-xl text-xs font-bold text-center border transition-colors cursor-pointer ${
                            isActive
                              ? 'border-[#168039] bg-emerald-50 text-[#168039]'
                              : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                          }`}
                        >
                          {radius}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <select className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none bg-white">
                    <option value="HN">Hà Nội</option>
                    <option value="HCM">TP. Hồ Chí Minh</option>
                    <option value="DN">Đà Nẵng</option>
                  </select>
                )}
              </div>

              {/* Section: Môn thể thao */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-900">Môn thể thao</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {sportsList.map((sport) => {
                    const isSelected = selectedSport === sport.id
                    return (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => setSelectedSport(sport.id)}
                        className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[#168039] bg-emerald-50 text-[#168039]'
                            : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <span>{sport.icon}</span>
                        <span className="truncate">{sport.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Phân vùng 2 (Phải): DẢI NGÀY & DANH SÁCH BUỔI CHƠI LIỀN MẠCH */}
          <section className="lg:col-span-8 p-4 sm:p-5 space-y-4">
            {/* Top Toolbar: Dải chọn ngày liền mạch */}
            <div className="pb-3 border-b border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#168039]" />
                  <h2 className="text-sm font-bold text-slate-900">Lịch các buổi giao lưu</h2>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                  <span>06/11 - 19/11/2026</span>
                </div>
              </div>

              {/* Horizontal scrollable date pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {daysList.map((day) => {
                  const isSelected = selectedDay === day.date
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => setSelectedDay(day.date)}
                      className={`flex flex-col items-center justify-center min-w-[52px] py-1.5 px-2 rounded-xl transition-colors cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-[#168039] text-white font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold border border-slate-200'
                      }`}
                    >
                      <span className="text-[10px] opacity-80">{day.label}</span>
                      <span className="text-sm font-extrabold">{day.date}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Subheader info bar */}
            <div className="flex items-center justify-between px-1">
              <div className="text-xs font-bold text-slate-800">
                <span>{mockSessions.length} buổi chơi tìm thấy</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Lọc theo vị trí"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                >
                  <Flag className="w-4 h-4 text-[#168039]" />
                </button>
                <button
                  type="button"
                  title="Lọc theo thời gian"
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                >
                  <Clock className="w-4 h-4 text-[#168039]" />
                </button>
              </div>
            </div>

            {/* Session Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {mockSessions.length === 0 && (
                <p className="text-sm text-slate-600 font-medium col-span-2 py-8 text-center">
                  Chưa có buổi chơi nào trong khung giờ này.
                </p>
              )}
              {mockSessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={session.clubLogo}
                        alt={session.clubName}
                        className="w-10 h-10 rounded-full border border-slate-200 object-cover shrink-0"
                      />
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {session.clubName}
                        </h3>
                        <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                          Cách bạn {session.distance} | {session.schedulesToday} lịch hôm nay
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleBookSession(session)}
                      className="text-[11px] font-bold text-[#168039] hover:underline px-2.5 py-1 rounded-md bg-emerald-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Chi tiết
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    {session.slots.map((slot, sIdx) => {
                      const isActive = sIdx === session.activeSlotIndex
                      return (
                        <div
                          key={sIdx}
                          className={`p-1.5 rounded-xl text-center border transition-colors cursor-pointer ${
                            isActive
                              ? 'border-[#168039] bg-emerald-50 text-[#168039] font-bold'
                              : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-xs font-bold">{slot.time}</div>
                          <div className={`text-[10px] ${slot.available ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'}`}>
                            {slot.subtext}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{session.detail.levelText}</span>
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-600 text-white flex items-center gap-1">
                        LIVE
                      </span>
                      <span className="font-bold text-rose-900 text-xs">
                        {session.detail.timeRange}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-700 font-medium">
                      <span className="flex items-center gap-1">
                        <Ticket className="w-3.5 h-3.5 text-rose-600" />
                        <span>{session.detail.ticketType}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-[#168039]" />
                        <span>{session.detail.courtNumbers}</span>
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-rose-200/60 text-xs">
                      <span className="flex items-center gap-1 text-slate-700 text-[11px] font-medium">
                        <Users className="w-3.5 h-3.5" />
                        <span>{session.detail.capacityText}</span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#ea580c] text-xs sm:text-sm">
                          {formatPrice(session.detail.pricePerTicket)}
                          <span className="text-[10px] font-normal text-slate-600"> / vé</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleBookSession(session)}
                          className="px-3 py-1.5 rounded-lg bg-[#168039] hover:bg-[#136c30] text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Đặt chỗ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
