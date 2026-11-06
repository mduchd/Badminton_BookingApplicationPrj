import { useState } from 'react'
import {
  Crosshair,
  SlidersHorizontal,
  Compass,
  Map,
  CalendarCheck,
  Heart,
  Sparkles,
  Search,
} from 'lucide-react'

interface CourtSearchBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onOpenFilter: () => void
  onOpenAIChat: () => void
  onSelectTab: (tab: 'all' | 'map' | 'booked' | 'favorite') => void
  activeTab: 'all' | 'map' | 'booked' | 'favorite'
  activeFilterCount: number
}

export const CourtSearchBar: React.FC<CourtSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  onOpenFilter,
  onOpenAIChat,
  onSelectTab,
  activeTab,
  activeFilterCount,
}) => {
  const [gpsLoading, setGpsLoading] = useState(false)

  const handleLocateMe = () => {
    setGpsLoading(true)
    setTimeout(() => {
      setGpsLoading(false)
      onSearchChange('Văn Miếu - Quốc Tử Giám')
    }, 400)
  }

  return (
    <div className="w-full bg-white rounded-2xl shadow-xs border border-slate-200/80 p-2 sm:p-2.5">
      <div className="flex flex-col lg:flex-row items-center gap-2.5">
        {/* Search input with icons */}
        <div className="relative flex-1 w-full flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:border-[#1b7a42] focus-within:bg-white transition-all">
          {/* Search Icon */}
          <div className="w-6 h-6 rounded-full bg-[#1b7a42] text-white flex items-center justify-center font-bold text-xs mr-2 flex-shrink-0 shadow-2xs">
            <Search className="w-3.5 h-3.5 text-white" />
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm cụm sân, địa chỉ, quận huyện..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />

          {/* Quick Clear */}
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
            >
              ✕
            </button>
          )}

          {/* GPS crosshair */}
          <button
            type="button"
            onClick={handleLocateMe}
            className={`p-1.5 text-slate-500 hover:text-[#1b7a42] hover:bg-slate-200/50 rounded-lg transition-colors ml-1 cursor-pointer ${
              gpsLoading ? 'animate-spin text-emerald-600' : ''
            }`}
            title="Định vị vị trí hiện tại của tôi"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Sliders filter button */}
          <button
            type="button"
            onClick={onOpenFilter}
            className="relative p-1.5 text-slate-600 hover:text-[#1b7a42] hover:bg-slate-200/50 rounded-lg transition-colors ml-0.5 cursor-pointer"
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

        {/* Quick Nav Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 no-scrollbar">
          {/* Social gần đây / AI Button */}
          <button
            type="button"
            onClick={onOpenAIChat}
            className="px-3.5 py-2 rounded-full bg-[#1b7a42] hover:bg-[#156335] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4 text-emerald-200" />
            <span>Social gần đây</span>
            <Sparkles className="w-3 h-3 text-amber-300 ml-0.5" />
          </button>

          {/* Bản đồ */}
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'map' ? 'all' : 'map')}
            className={`px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'map'
                ? 'bg-emerald-100 text-emerald-800'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Map className="w-4 h-4 text-emerald-700" />
            <span>Bản đồ</span>
          </button>

          {/* Sân đã đặt */}
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'booked' ? 'all' : 'booked')}
            className={`px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'booked'
                ? 'bg-emerald-100 text-emerald-800'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-emerald-700" />
            <span>Sân đã đặt</span>
          </button>

          {/* Yêu thích */}
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'favorite' ? 'all' : 'favorite')}
            className={`px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'favorite'
                ? 'bg-emerald-100 text-emerald-800'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Heart className="w-4 h-4 text-emerald-700" />
            <span>Yêu thích</span>
          </button>
        </div>
      </div>
    </div>
  )
}
