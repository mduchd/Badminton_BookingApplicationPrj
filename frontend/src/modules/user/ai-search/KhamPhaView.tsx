import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, Sparkles, Flame } from 'lucide-react'
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
        <section className="py-12 text-center space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Chưa có buổi giao lưu được công bố</h2>
          <p className="text-sm text-slate-600">Bạn có thể xem các cụm sân và chọn giờ chơi phù hợp.</p>
          <button type="button" onClick={() => setActiveCategory('CumSan')} className="cursor-pointer rounded-lg bg-[#168039] px-4 py-2 text-sm font-semibold text-white">Xem cụm sân</button>
        </section>
      )}
    </div>
  )
}
