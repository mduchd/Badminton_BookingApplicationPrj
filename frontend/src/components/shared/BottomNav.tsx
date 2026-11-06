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
      {/* Floating Pill Dock Container with signature green border and spacious rounded pill */}
      <div className="relative bg-white/95 backdrop-blur-md rounded-3xl sm:rounded-[36px] border-2 border-[#168039] shadow-[0_10px_35px_rgba(0,0,0,0.12)] px-2 sm:px-6 md:px-8 py-1.5 sm:py-2 transition-all">
        {/* Floating Center Action Button (Khám phá) nổi bật trên thanh dock */}
        <button
          type="button"
          onClick={() => onSelectTab('khampha')}
          className={`absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] z-20 cursor-pointer active:scale-95 group ${
            activeTab === 'khampha'
              ? 'bg-[#168039] text-white ring-4 ring-white scale-110 -translate-y-1'
              : 'bg-[#168039] hover:bg-[#136c30] text-white ring-4 ring-white hover:scale-105'
          }`}
          title="Khám phá buổi chơi & Lịch giao lưu"
          aria-label="Khám phá"
        >
          <Newspaper
            className={`w-7 h-7 text-white stroke-[2.2] transition-transform duration-300 group-hover:scale-110 ${
              activeTab === 'khampha' ? 'scale-110' : 'scale-100'
            }`}
          />
        </button>

        {/* 5-Column Navigation Bar - Giãn rộng chiều ngang rất thoáng */}
        <div className="h-[70px] sm:h-[74px] relative">
          {/* 5-Column Buttons Grid - Giãn cách rộng rãi */}
          <div className="h-full grid grid-cols-5 relative z-10 gap-2 sm:gap-4">
            {/* 1. Trang chủ */}
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className="relative flex flex-col items-center justify-center py-1 transition-transform duration-200 cursor-pointer group active:scale-95 w-full h-full"
            >
              <div
                className={`p-1 rounded-xl transition-all duration-300 flex items-center justify-center ${
                  activeTab === 'home'
                    ? 'text-[#168039] -translate-y-1 scale-110'
                    : 'text-slate-600 group-hover:text-slate-900 group-hover:-translate-y-0.5 group-hover:scale-105'
                }`}
              >
                <Home
                  className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 ${
                    activeTab === 'home'
                      ? 'stroke-[2.5]'
                      : 'stroke-[1.9] group-hover:scale-105'
                  }`}
                />
              </div>
              <span
                className={`text-xs sm:text-[13px] leading-tight transition-all duration-300 tracking-tight mt-0.5 ${
                  activeTab === 'home'
                    ? 'font-black text-[#168039] scale-105 -translate-y-0.5'
                    : 'font-semibold text-slate-600 group-hover:text-slate-900'
                }`}
              >
                Trang chủ
              </span>
            </button>

            {/* 2. Bản đồ */}
            <button
              type="button"
              onClick={() => onSelectTab('map')}
              className="relative flex flex-col items-center justify-center py-1 transition-transform duration-200 cursor-pointer group active:scale-95 w-full h-full"
            >
              <div
                className={`p-1 rounded-xl transition-all duration-300 flex items-center justify-center ${
                  activeTab === 'map'
                    ? 'text-[#168039] -translate-y-1 scale-110'
                    : 'text-slate-600 group-hover:text-slate-900 group-hover:-translate-y-0.5 group-hover:scale-105'
                }`}
              >
                <MapPin
                  className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 ${
                    activeTab === 'map'
                      ? 'stroke-[2.5]'
                      : 'stroke-[1.9] group-hover:scale-105'
                  }`}
                />
              </div>
              <span
                className={`text-xs sm:text-[13px] leading-tight transition-all duration-300 tracking-tight mt-0.5 ${
                  activeTab === 'map'
                    ? 'font-black text-[#168039] scale-105 -translate-y-0.5'
                    : 'font-semibold text-slate-600 group-hover:text-slate-900'
                }`}
              >
                Bản đồ
              </span>
            </button>

            {/* 3. Khám phá (Clickable area below floating circle) */}
            <button
              type="button"
              onClick={() => onSelectTab('khampha')}
              className="relative flex flex-col items-center justify-end pb-1.5 pt-7 sm:pt-8 cursor-pointer group active:scale-95 transition-transform duration-200 w-full h-full"
            >
              <span
                className={`text-xs sm:text-[13px] leading-tight transition-all duration-300 tracking-tight ${
                  activeTab === 'khampha'
                    ? 'text-[#168039] font-black scale-105 -translate-y-0.5'
                    : 'text-[#168039] font-bold group-hover:font-black group-hover:scale-105'
                }`}
              >
                Khám phá
              </span>
            </button>

            {/* 4. Nổi bật */}
            <button
              type="button"
              onClick={() => onSelectTab('trending')}
              className="relative flex flex-col items-center justify-center py-1 transition-transform duration-200 cursor-pointer group active:scale-95 w-full h-full"
            >
              <div
                className={`p-1 rounded-xl transition-all duration-300 flex items-center justify-center ${
                  activeTab === 'trending'
                    ? 'text-[#168039] -translate-y-1 scale-110'
                    : 'text-slate-600 group-hover:text-slate-900 group-hover:-translate-y-0.5 group-hover:scale-105'
                }`}
              >
                <Flame
                  className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 ${
                    activeTab === 'trending'
                      ? 'stroke-[2.5]'
                      : 'stroke-[1.9] group-hover:scale-105'
                  }`}
                />
              </div>
              <span
                className={`text-xs sm:text-[13px] leading-tight transition-all duration-300 tracking-tight mt-0.5 ${
                  activeTab === 'trending'
                    ? 'font-black text-[#168039] scale-105 -translate-y-0.5'
                    : 'font-semibold text-slate-600 group-hover:text-slate-900'
                }`}
              >
                Nổi bật
              </span>
            </button>

            {/* 5. Tài khoản */}
            <button
              type="button"
              onClick={() => onSelectTab('account')}
              className="relative flex flex-col items-center justify-center py-1 transition-transform duration-200 cursor-pointer group active:scale-95 w-full h-full"
            >
              <div
                className={`p-1 rounded-xl transition-all duration-300 flex items-center justify-center ${
                  activeTab === 'account'
                    ? 'text-[#168039] -translate-y-1 scale-110'
                    : 'text-slate-600 group-hover:text-slate-900 group-hover:-translate-y-0.5 group-hover:scale-105'
                }`}
              >
                <UserIcon
                  className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 ${
                    activeTab === 'account'
                      ? 'stroke-[2.5]'
                      : 'stroke-[1.9] group-hover:scale-105'
                  }`}
                />
              </div>
              <span
                className={`text-xs sm:text-[13px] leading-tight transition-all duration-300 tracking-tight mt-0.5 ${
                  activeTab === 'account'
                    ? 'font-black text-[#168039] scale-105 -translate-y-0.5'
                    : 'font-semibold text-slate-600 group-hover:text-slate-900'
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
