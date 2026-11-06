import { useState } from 'react'
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
} from 'lucide-react'
import type { CourtResult } from '../../types/user'
import { formatPrice } from '../../../lib/utils'
import { mockSessions, type SessionMatch } from '../mockData'

interface KhamPhaViewProps {
  onBookCourt: (court: CourtResult) => void
  onOpenAIChat: () => void
}

export const KhamPhaView: React.FC<KhamPhaViewProps> = ({ onBookCourt, onOpenAIChat }) => {
  // Category tabs inside green header (using official lucide-react icons)
  const [activeCategory, setActiveCategory] = useState('Social')
  const categories = [
    { id: 'Social', label: 'Social', icon: <Sparkles className="w-3.5 h-3.5" /> },
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

  // Date selection
  const [selectedDay, setSelectedDay] = useState('06')
  const daysList = [
    { label: 'Hôm nay', date: '06', isToday: true },
    { label: 'Th 7', date: '07' },
    { label: 'CN', date: '08' },
    { label: 'Th 2', date: '09' },
    { label: 'Th 3', date: '10' },
    { label: 'Th 4', date: '11' },
    { label: 'Th 5', date: '12' },
    { label: 'Th 6', date: '13' },
    { label: 'Th 7', date: '14' },
    { label: 'CN', date: '15' },
    { label: 'Th 2', date: '16' },
    { label: 'Th 3', date: '17' },
    { label: 'Th 4', date: '18' },
    { label: 'Th 5', date: '19' },
  ]

  const sportsList = [
    { id: 'all', label: 'Tất cả môn', icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { id: 'pickleball', label: 'Pickleball', icon: <CircleDot className="w-3.5 h-3.5" /> },
    { id: 'badminton', label: 'Cầu lông', icon: <Activity className="w-3.5 h-3.5 text-[#1b7a42]" /> },
    { id: 'football', label: 'Bóng đá', icon: <Trophy className="w-3.5 h-3.5" /> },
    { id: 'basketball', label: 'Bóng rổ', icon: <CircleDot className="w-3.5 h-3.5" /> },
    { id: 'tennis', label: 'Quần vợt', icon: <Target className="w-3.5 h-3.5" /> },
    { id: 'multi', label: 'Đa năng', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'swimming', label: 'Bơi lội', icon: <Waves className="w-3.5 h-3.5" /> },
    { id: 'volleyball', label: 'B.Chuyền', icon: <CircleDot className="w-3.5 h-3.5" /> },
    { id: 'golf', label: 'Golf', icon: <Flag className="w-3.5 h-3.5" /> },
  ]

  const handleBookSession = (session: SessionMatch) => {
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

  return (
    <div className="w-full space-y-6">
      {/* 1. Green Sub-Header: KHÁM PHÁ + Category Pills */}
      <div className="bg-[#1b7a42] text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-emerald-600/60">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black italic tracking-wide text-white">
              KHÁM PHÁ BUỔI CHƠI
            </h1>
          </div>

          <button
            type="button"
            onClick={onOpenAIChat}
            className="self-start md:self-auto px-4.5 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Hỏi AI gợi ý buổi chơi</span>
          </button>
        </div>

        {/* Category horizontal scrollable pills */}
        <div className="flex items-center gap-2.5 pt-4 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 sm:px-4.5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-white text-[#1b7a42] shadow-sm'
                  : 'bg-emerald-800/40 hover:bg-emerald-800/80 text-white border border-emerald-600/50'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Main Two-Column Layout (Left: Bộ lọc | Right: Ngày tổ chức & Sessions) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: BỘ LỌC (Sidebar Filter) */}
        <aside className="lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5 h-fit">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-extrabold text-base">
              <SlidersHorizontal className="w-5 h-5 text-[#1b7a42]" />
              <span>Bộ lọc</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedRadius('5km')}
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#1b7a42] hover:bg-emerald-50 border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
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
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            </div>
          </div>

          {/* Toggle: Chỉ hiện buổi còn chỗ */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-semibold text-slate-700">Chỉ hiện buổi còn chỗ</span>
            <button
              type="button"
              onClick={() => setOnlyAvailable(!onlyAvailable)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                onlyAvailable ? 'bg-[#1b7a42] justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
            </button>
          </div>

          {/* Section: Khu vực */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700">Khu vực</h3>
            {/* Tabs Theo bán kính vs Theo tỉnh/thành */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAreaMode('radius')}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  areaMode === 'radius' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500'
                }`}
              >
                <Radar className="w-3.5 h-3.5" />
                <span>Theo bán kính</span>
              </button>
              <button
                type="button"
                onClick={() => setAreaMode('city')}
                className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  areaMode === 'city' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-500'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Theo tỉnh/thành</span>
              </button>
            </div>

            {/* Radius Options */}
            {areaMode === 'radius' ? (
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                {['Trong 5 km', 'Trong 10 km', 'Trong 20 km', 'Trong 30 km'].map((radius) => {
                  const isActive = selectedRadius === radius.replace('Trong ', '')
                  return (
                    <button
                      key={radius}
                      type="button"
                      onClick={() => setSelectedRadius(radius.replace('Trong ', ''))}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold text-center border transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#1b7a42] bg-emerald-50 text-[#1b7a42] font-bold ring-1 ring-[#1b7a42]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {radius}
                    </button>
                  )
                })}
              </div>
            ) : (
              <select className="w-full mt-1 p-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none">
                <option value="HN">Hà Nội</option>
                <option value="HCM">TP. Hồ Chí Minh</option>
                <option value="DN">Đà Nẵng</option>
              </select>
            )}
          </div>

          {/* Section: Môn thể thao */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-700">Môn thể thao</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {sportsList.map((sport) => {
                const isSelected = selectedSport === sport.id
                return (
                  <button
                    key={sport.id}
                    type="button"
                    onClick={() => setSelectedSport(sport.id)}
                    className={`py-2 px-2.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1b7a42] bg-emerald-50 text-[#1b7a42] ring-1 ring-[#1b7a42]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{sport.icon}</span>
                    <span className="truncate">{sport.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Right Column: Ngày tổ chức & Session Cards Grid */}
        <section className="lg:col-span-8 space-y-4">
          {/* Ngày tổ chức Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800">Ngày tổ chức</h2>
              <div className="flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer hover:bg-slate-200/70">
                <span>06/11 - 19/11/2026</span>
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              </div>
            </div>

            {/* Horizontal scrollable date pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {daysList.map((day) => {
                const isSelected = selectedDay === day.date
                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDay(day.date)}
                    className={`flex flex-col items-center justify-center min-w-[50px] py-2 px-1.5 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#1b7a42] text-white shadow-xs font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200/60'
                    }`}
                  >
                    <span className="text-[10px] opacity-80">{day.label}</span>
                    <span className="text-sm font-extrabold">{day.date}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Subheader summary */}
          <div className="flex items-center justify-between px-1">
            <div className="text-xs font-bold text-slate-800">
              <span>168 sân • 826 buổi chơi</span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer">
                <Flag className="w-4 h-4 text-emerald-700" />
              </button>
              <button type="button" className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 cursor-pointer">
                <Clock className="w-4 h-4 text-emerald-700" />
              </button>
            </div>
          </div>

          {/* Session Cards Grid (2 columns on tablet/desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all p-4 space-y-3 flex flex-col justify-between"
              >
                {/* Club Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={session.clubLogo}
                      alt={session.clubName}
                      className="w-10 h-10 rounded-full border border-slate-200 object-cover flex-shrink-0"
                    />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {session.clubName}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        📍 {session.distance} • {session.schedulesToday} lịch hôm nay
                      </p>
                    </div>
                  </div>
                  <button type="button" className="text-[11px] font-semibold text-emerald-700 hover:underline px-2 py-1 rounded-md bg-emerald-50 whitespace-nowrap flex-shrink-0 cursor-pointer">
                    Xem thêm
                  </button>
                </div>

                {/* Time Slot Tabs Row */}
                <div className="grid grid-cols-4 gap-1.5 pt-1">
                  {session.slots.map((slot, idx) => {
                    const isActive = idx === session.activeSlotIndex
                    return (
                      <div
                        key={idx}
                        className={`p-1.5 rounded-xl text-center border transition-all cursor-pointer ${
                          isActive
                            ? 'border-[#1b7a42] bg-emerald-50 text-[#1b7a42] font-bold'
                            : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs font-bold">{slot.time}</div>
                        <div className={`text-[10px] ${slot.available ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {slot.subtext}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Ticket & Match Detail Box */}
                <div className="p-3 rounded-2xl border-2 border-rose-200/80 bg-rose-50/20 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">{session.detail.levelText}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>

                  {/* Live + details */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      LIVE
                    </span>
                    <span className="font-bold text-rose-600 text-xs">
                      {session.detail.timeRange}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1">
                      <Ticket className="w-3.5 h-3.5 text-rose-500" />
                      <span>{session.detail.ticketType}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-[#1b7a42]" />
                      <span>{session.detail.courtNumbers}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-rose-100 text-xs">
                    <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                      <Users className="w-3.5 h-3.5" />
                      <span>{session.detail.capacityText}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#ea580c] text-xs sm:text-sm">
                        {formatPrice(session.detail.pricePerTicket)}
                        <span className="text-[10px] font-normal text-slate-500"> / vé</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleBookSession(session)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
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
    </div>
  )
}
