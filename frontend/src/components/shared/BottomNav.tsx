import React from 'react'
import { Home, MapPin, Newspaper, Flame, User as UserIcon } from 'lucide-react'

export interface BottomNavProps {
  activeTab: 'home' | 'map' | 'khampha' | 'trending' | 'account' | string
  onSelectTab: (tab: 'home' | 'map' | 'khampha' | 'trending' | 'account') => void
  onOpenProfile?: () => void
  onOpenAuth?: () => void
  isLoggedIn?: boolean
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav
      aria-label="Thanh điều hướng chính"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-16px)] sm:w-[calc(100%-32px)] max-w-3xl lg:max-w-4xl select-none"
    >
      {/* Floating Pill Dock Container with signature green border and deep elevation shadow */}
      <div className="relative bg-white rounded-3xl sm:rounded-[36px] border-2 border-[#168039] shadow-[0_20px_50px_rgba(15,23,42,0.25),0_6px_18px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/10 px-2 sm:px-6 md:px-8 py-1.5 sm:py-2 transition-all">
        {/* Floating Center Action Button (Khám phá) nổi bật trên thanh dock */}
        <button
          type="button"
          onClick={() => onSelectTab('khampha')}
          className={`absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] z-20 cursor-pointer active:scale-95 group ${
            activeTab === 'khampha'
              ? 'bg-[#168039] text-white ring-4 ring-white scale-110 -translate-y-1'
              : 'bg-[#168039] hover:bg-[#136c30] text-white ring-4 ring-white'
          }`}
          title="Khám phá buổi chơi & Lịch giao lưu"
          aria-label="Khám phá"
        >
          <Newspaper
            className={`w-7 h-7 text-white stroke-[2.2] transition-transform duration-300 ${
              activeTab === 'khampha' ? 'scale-110' : 'scale-100'
            }`}
          />
        </button>

        {/* 5-Column Navigation Bar */}
        <div className="h-[70px] sm:h-[74px] relative">
          <div className="h-full grid grid-cols-5 relative z-10 gap-0.5 sm:gap-3 items-center">
            {/* 1. Trang chủ */}
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 sm:px-2 rounded-2xl transition-all duration-200 cursor-pointer group active:scale-95 w-full h-[90%] ${
                activeTab === 'home'
                  ? 'bg-emerald-50 text-[#168039] font-bold border border-emerald-200/90'
                  : 'text-[#168039] hover:bg-emerald-50/60 border border-transparent'
              }`}
            >
              <div className="p-0.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#168039]">
                <Home
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 transition-transform duration-200 text-[#168039] ${
                    activeTab === 'home'
                      ? 'stroke-[2.6]'
                      : 'stroke-[2.1] opacity-80 group-hover:opacity-100'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight transition-all duration-200 tracking-tight mt-0.5 truncate max-w-full text-[#168039] ${
                  activeTab === 'home'
                    ? 'font-black'
                    : 'font-bold opacity-80 group-hover:opacity-100'
                }`}
              >
                Trang chủ
              </span>
            </button>

            {/* 2. Bản đồ */}
            <button
              type="button"
              onClick={() => onSelectTab('map')}
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 sm:px-2 rounded-2xl transition-all duration-200 cursor-pointer group active:scale-95 w-full h-[90%] ${
                activeTab === 'map'
                  ? 'bg-emerald-50 text-[#168039] font-bold border border-emerald-200/90'
                  : 'text-[#168039] hover:bg-emerald-50/60 border border-transparent'
              }`}
            >
              <div className="p-0.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#168039]">
                <MapPin
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 transition-transform duration-200 text-[#168039] ${
                    activeTab === 'map'
                      ? 'stroke-[2.6]'
                      : 'stroke-[2.1] opacity-80 group-hover:opacity-100'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight transition-all duration-200 tracking-tight mt-0.5 truncate max-w-full text-[#168039] ${
                  activeTab === 'map'
                    ? 'font-black'
                    : 'font-bold opacity-80 group-hover:opacity-100'
                }`}
              >
                Bản đồ
              </span>
            </button>

            {/* 3. Khám phá (Clickable area below floating circle) */}
            <button
              type="button"
              onClick={() => onSelectTab('khampha')}
              className="relative flex flex-col items-center justify-end pb-2 pt-8 cursor-pointer group active:scale-95 transition-transform duration-200 w-full h-full"
            >
              <span
                className={`text-[11px] sm:text-[13px] leading-tight transition-all duration-300 tracking-tight truncate max-w-full text-[#168039] ${
                  activeTab === 'khampha'
                    ? 'font-black scale-105 -translate-y-0.5'
                    : 'font-bold opacity-80 group-hover:opacity-100'
                }`}
              >
                Khám phá
              </span>
            </button>

            {/* 4. Nổi bật */}
            <button
              type="button"
              onClick={() => onSelectTab('trending')}
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 sm:px-2 rounded-2xl transition-all duration-200 cursor-pointer group active:scale-95 w-full h-[90%] ${
                activeTab === 'trending'
                  ? 'bg-emerald-50 text-[#168039] font-bold border border-emerald-200/90'
                  : 'text-[#168039] hover:bg-emerald-50/60 border border-transparent'
              }`}
            >
              <div className="p-0.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#168039]">
                <Flame
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 transition-transform duration-200 text-[#168039] ${
                    activeTab === 'trending'
                      ? 'stroke-[2.6]'
                      : 'stroke-[2.1] opacity-80 group-hover:opacity-100'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight transition-all duration-200 tracking-tight mt-0.5 truncate max-w-full text-[#168039] ${
                  activeTab === 'trending'
                    ? 'font-black'
                    : 'font-bold opacity-80 group-hover:opacity-100'
                }`}
              >
                Nổi bật
              </span>
            </button>

            {/* 5. Tài khoản */}
            <button
              type="button"
              onClick={() => onSelectTab('account')}
              className={`relative flex flex-col items-center justify-center py-1.5 px-0.5 sm:px-2 rounded-2xl transition-all duration-200 cursor-pointer group active:scale-95 w-full h-[90%] ${
                activeTab === 'account'
                  ? 'bg-emerald-50 text-[#168039] font-bold border border-emerald-200/90'
                  : 'text-[#168039] hover:bg-emerald-50/60 border border-transparent'
              }`}
            >
              <div className="p-0.5 rounded-lg transition-all duration-200 flex items-center justify-center text-[#168039]">
                <UserIcon
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 transition-transform duration-200 text-[#168039] ${
                    activeTab === 'account'
                      ? 'stroke-[2.6]'
                      : 'stroke-[2.1] opacity-80 group-hover:opacity-100'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight transition-all duration-200 tracking-tight mt-0.5 truncate max-w-full text-[#168039] ${
                  activeTab === 'account'
                    ? 'font-black'
                    : 'font-bold opacity-80 group-hover:opacity-100'
                }`}
              >
                Tài khoản
              </span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
