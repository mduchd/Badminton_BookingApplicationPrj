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
  Flag,
  Clock,
  ChevronRight,
  CircleDot,
  Activity,
  Flame,
} from 'lucide-react'
import type { CourtResult, User } from '../../types/user'
import type { BadmintonCourtItem } from '../../types/court'
import { CourtCardItem } from './CourtCardItem'
import { Pagination } from '../../../components/shared/Pagination'
import { useQuery } from '@tanstack/react-query'
import { courtApi, facilityToCourtItem } from '../../court/services/courtApi'

export interface KhamPhaViewProps {
  onOpenAIChat: () => void
  currentUser?: User | null
  onOpenAuth?: (tab?: 'login' | 'register') => void
  onSelectCourt?: (court: BadmintonCourtItem) => void
  onBookCourtDirect?: (court: BadmintonCourtItem | CourtResult) => void
}

export const KhamPhaView: React.FC<KhamPhaViewProps> = ({
  onOpenAIChat,
  onSelectCourt,
  onBookCourtDirect,
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [pagination, setPagination] = useState({ category: '', page: 0 })
  const catFromUrl = searchParams.get('category')
  const activeCategory = catFromUrl === 'Social' ? 'Social' : 'CumSan'

  const [onlyHighRating, setOnlyHighRating] = useState(catFromUrl === 'NoiBat')

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
    { id: 'CumSan', label: 'Cụm sân', icon: <Building2 className="w-4 h-4" /> },
    { id: 'Social', label: 'Buổi chơi giao lưu', icon: <Sparkles className="w-4 h-4" /> },
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
    { id: 'badminton', label: 'Cầu lông', icon: <Activity className="w-3.5 h-3.5 text-[#168039]" /> },
    { id: 'pickleball', label: 'Pickleball', icon: <CircleDot className="w-3.5 h-3.5" /> },
  ]

  const isCourtView = activeCategory === 'CumSan'
  const currentPage = pagination.category === activeCategory ? pagination.page : 0
  const { data: courtPage, isLoading, isError } = useQuery({
    queryKey: ['exploreFacilitiesPage', onlyHighRating, currentPage],
    enabled: isCourtView,
    queryFn: () => courtApi.searchFacilitiesPage({ page: currentPage, minRating: onlyHighRating ? 4.8 : undefined }),
  })
  const visibleCourts = (courtPage?.content ?? []).map(facilityToCourtItem)

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
              Khám phá các cụm sân cầu lông chất lượng và buổi chơi giao lưu cộng đồng.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenAIChat}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs sm:text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-100" />
              <span>Hỏi AI gợi ý</span>
            </button>
          </div>
        </div>

        {/* Category Tab Strip: Tinh gọn 2 tabs phẳng hiện đại, trực tiếp trên layout */}
        <div className="flex items-center gap-2 pt-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id)
                  setPagination({ category: cat.id, page: 0 })
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-colors flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-[#168039] text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Unified Workplace Canvas */}
      {isCourtView ? (
        <div className="space-y-6">
          {/* Section 1: Cụm sân */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Flame className="w-5 h-5 text-amber-600 shrink-0" />
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {onlyHighRating ? 'Cụm sân được đánh giá cao nhất (từ 4.8★)' : 'Danh sách cụm sân'}
                </h2>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Chip lọc nhanh Nổi bật 4.8★ */}
                <button
                  type="button"
                  onClick={() => {
                    setOnlyHighRating((prev) => !prev)
                    setPagination({ category: activeCategory, page: 0 })
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer border ${
                    onlyHighRating
                      ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${onlyHighRating ? 'text-white' : 'text-amber-500'}`} />
                  <span>Nổi bật (≥ 4.8★)</span>
                </button>

                <span className="text-xs font-semibold text-slate-600">
                  {courtPage?.totalElements ?? 0} cụm sân
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {visibleCourts.map((court, index) => (
                <CourtCardItem
                  key={court.id}
                  court={court}
                  index={index}
                  onSelectCourt={onSelectCourt}
                  onBook={onBookCourtDirect}
                />
              ))}
            </div>
            {isLoading && <p className="text-sm text-slate-600">Đang tải danh sách sân...</p>}
            {isError && <p className="text-sm text-red-700">Không thể tải danh sách sân. Vui lòng thử lại.</p>}
            <Pagination page={currentPage} pageSize={24} total={courtPage?.totalElements ?? 0} onChange={(page) => setPagination({ category: activeCategory, page })} />
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
                onClick={() => {
                  setActiveCategory('Social')
                  setPagination({ category: 'Social', page: 0 })
                }}
                className="text-xs font-bold text-[#168039] hover:underline cursor-pointer self-start sm:self-auto"
              >
                Xem tất cả lịch giao lưu →
              </button>
            </div>

            <p className="text-sm text-slate-600">Chưa có lịch giao lưu được công bố.</p>
          </div>
        </div>
      ) : (
        /* Unified Workplace Container: Chia 2 phân vùng liền mạch trong MỘT Canvas duy nhất */
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

              {/* Section: Môn thể thao (tập trung Cầu lông & Pickleball) */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <h3 className="text-xs font-bold text-slate-900">Môn thể thao</h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {sportsList.map((sport) => {
                    const isSelected = selectedSport === sport.id
                    return (
                      <button
                        key={sport.id}
                        type="button"
                        onClick={() => setSelectedSport(sport.id)}
                        className={`py-2 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
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
                <span>Chưa có dữ liệu lịch giao lưu</span>
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
              <p className="col-span-full py-8 text-center text-sm text-slate-600">
                Chưa có lịch giao lưu được công bố.
              </p>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
