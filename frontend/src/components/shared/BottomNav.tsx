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
      {/* Floating Pill Dock Container with signature green background */}
      <div className="relative bg-[#168039] rounded-3xl sm:rounded-[36px] border-2 border-[#136c30] shadow-[0_20px_50px_rgba(22,128,57,0.35),0_6px_18px_rgba(15,23,42,0.18)] px-2 sm:px-6 md:px-8 py-1.5 sm:py-2 transition-all">
        {/* Floating Center Action Button (Khám phá) nổi bật trên thanh dock */}
        <button
          type="button"
          onClick={() => onSelectTab('khampha')}
          className={`absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] z-20 cursor-pointer active:scale-95 group ${
            activeTab === 'khampha'
              ? 'bg-white text-[#168039] ring-4 ring-[#168039] scale-110 -translate-y-1 shadow-md'
              : 'bg-[#1b7a42] hover:bg-[#136c30] text-white ring-4 ring-[#168039]'
          }`}
          title="Khám phá buổi chơi & Lịch giao lưu"
          aria-label="Khám phá"
        >
          <Newspaper
            className={`w-7 h-7 stroke-[2.2] transition-transform duration-300 ${
              activeTab === 'khampha' ? 'text-[#168039] scale-110' : 'text-white scale-100'
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
                  ? 'bg-white text-[#168039] font-bold shadow-xs'
                  : 'text-emerald-100/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <div
                className={`p-0.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  activeTab === 'home'
                    ? 'text-[#168039]'
                    : 'text-emerald-100 group-hover:text-white'
                }`}
              >
                <Home
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 transition-transform duration-200 ${
                    activeTab === 'home'
                      ? 'stroke-[2.5]'
                      : 'stroke-[1.9]'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight transition-all duration-200 tracking-tight mt-0.5 truncate max-w-full ${
                  activeTab === 'home'
                    ? 'font-black text-[#168039]'
                    : 'font-semibold text-emerald-100/90 group-hover:text-white'
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
                  ? 'bg-white text-[#168039] font-bold shadow-xs'
                  : 'text-emerald-100/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <div
                className={`p-0.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  activeTab === 'map'
                    ? 'text-[#168039]'
                    : 'text-emerald-100 group-hover:text-white'
                }`}
              >
                <MapPin
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 transition-transform duration-200 ${
                    activeTab === 'map'
                      ? 'stroke-[2.5]'
                      : 'stroke-[1.9]'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight transition-all duration-200 tracking-tight mt-0.5 truncate max-w-full ${
                  activeTab === 'map'
                    ? 'font-black text-[#168039]'
                    : 'font-semibold text-emerald-100/90 group-hover:text-white'
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
                className={`text-[11px] sm:text-[13px] leading-tight transition-all duration-300 tracking-tight truncate max-w-full ${
                  activeTab === 'khampha'
                    ? 'text-white font-black scale-105 -translate-y-0.5'
                    : 'text-emerald-100/90 font-bold group-hover:text-white'
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
                  ? 'bg-white text-[#168039] font-bold shadow-xs'
                  : 'text-emerald-100/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <div
                className={`p-0.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  activeTab === 'trending'
                    ? 'text-[#168039]'
                    : 'text-emerald-100 group-hover:text-white'
                }`}
              >
                <Flame
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 transition-transform duration-200 ${
                    activeTab === 'trending'
                      ? 'stroke-[2.5]'
                      : 'stroke-[1.9]'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight transition-all duration-200 tracking-tight mt-0.5 truncate max-w-full ${
                  activeTab === 'trending'
                    ? 'font-black text-[#168039]'
                    : 'font-semibold text-emerald-100/90 group-hover:text-white'
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
                  ? 'bg-white text-[#168039] font-bold shadow-xs'
                  : 'text-emerald-100/90 hover:text-white hover:bg-white/10'
              }`}
            >
              <div
                className={`p-0.5 rounded-lg transition-all duration-200 flex items-center justify-center ${
                  activeTab === 'account'
                    ? 'text-[#168039]'
                    : 'text-emerald-100 group-hover:text-white'
                }`}
              >
                <UserIcon
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 transition-transform duration-200 ${
                    activeTab === 'account'
                      ? 'stroke-[2.5]'
                      : 'stroke-[1.9]'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight transition-all duration-200 tracking-tight mt-0.5 truncate max-w-full ${
                  activeTab === 'account'
                    ? 'font-black text-[#168039]'
                    : 'font-semibold text-emerald-100/90 group-hover:text-white'
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
