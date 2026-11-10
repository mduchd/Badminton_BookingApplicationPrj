import React from 'react'
import {
  Crosshair,
  SlidersHorizontal,
  Compass,
  Map,
  CalendarCheck,
  Heart,
  Search,
} from 'lucide-react'

interface CourtSearchBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onOpenFilter: () => void
  onOpenSocial?: () => void
  onSelectTab: (tab: 'all' | 'map' | 'booked' | 'favorite') => void
  activeTab: 'all' | 'map' | 'booked' | 'favorite'
  activeFilterCount: number
}

export const CourtSearchBar: React.FC<CourtSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  onOpenFilter,
  onOpenSocial,
  onSelectTab,
  activeTab,
  activeFilterCount,
}) => {
  const handleLocateMe = () => onSelectTab('map')

  return (
    <div className="w-full bg-white rounded-xl border border-slate-300/90 px-4 sm:px-5 py-2.5 sm:py-3 transition-all focus-within:border-[#1b7a42] focus-within:ring-2 focus-within:ring-[#1b7a42]/20 shadow-[0_4px_8px_-2px_rgba(15,23,42,0.1),0_16px_32px_-6px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/10">
      <div className="flex flex-col lg:flex-row items-center gap-3 sm:gap-4">
        {/* Unified Search Input Area (Completely flat & airy, no nested border/box) */}
        <div className="relative flex-1 w-full flex items-center min-w-0">
          {/* Search Icon */}
          <Search className="w-5 h-5 text-[#1b7a42] mr-3 flex-shrink-0 select-none" />

          {/* Search Input */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm cụm sân, địa chỉ, quận huyện..."
            className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-500 font-medium focus:outline-none py-1"
          />

          {/* Quick Clear */}
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-slate-500 hover:text-slate-800 text-xs px-2 py-1 cursor-pointer transition-colors"
              title="Xóa tìm kiếm"
            >
              ✕
            </button>
          )}

          {/* GPS crosshair */}
          <button
            type="button"
            onClick={handleLocateMe}
            className={`p-2 text-slate-500 hover:text-[#1b7a42] hover:bg-slate-100 rounded-lg transition-colors ml-1 cursor-pointer `}
            title="Mở bản đồ để định vị"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Sliders filter button */}
          <button
            type="button"
            onClick={onOpenFilter}
            className="relative p-2 text-slate-500 hover:text-[#1b7a42] hover:bg-slate-100 rounded-lg transition-colors ml-1 cursor-pointer"
            title="Bộ lọc Smart Filter chi tiết"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#1b7a42] text-white rounded-full text-[9px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Vertical divider on desktop */}
        <div className="hidden lg:block w-px h-6 bg-slate-300 mx-1 flex-shrink-0" />

        {/* Quick Nav Action Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-0.5 lg:pb-0 no-scrollbar flex-shrink-0">
          {/* Giao lưu & Ghép đội (Chuyển sang Khám phá) */}
          {onOpenSocial && (
            <button
              type="button"
              onClick={onOpenSocial}
              className="px-3.5 py-2 rounded-lg bg-[#1b7a42] hover:bg-[#156335] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-emerald-200" />
              <span>Giao lưu & Ghép đội</span>
            </button>
          )}

          {/* Bản đồ */}
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'map' ? 'all' : 'map')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'map'
                ? 'bg-emerald-100 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Map className="w-3.5 h-3.5 text-emerald-700" />
            <span>Bản đồ</span>
          </button>

          {/* Sân đã đặt */}
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'booked' ? 'all' : 'booked')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'booked'
                ? 'bg-emerald-100 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Sân đã đặt</span>
          </button>

          {/* Yêu thích */}
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'favorite' ? 'all' : 'favorite')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'favorite'
                ? 'bg-emerald-100 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-emerald-700" />
            <span>Yêu thích</span>
          </button>
        </div>
      </div>
    </div>
  )
}
