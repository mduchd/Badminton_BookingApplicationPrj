import React from 'react'
import { Home, MapPin, Newspaper, Flame, User as UserIcon } from 'lucide-react'

export interface BottomNavProps {
  activeTab: 'home' | 'map' | 'khampha' | 'trending' | 'account' | string
  onSelectTab: (tab: 'home' | 'map' | 'khampha' | 'trending' | 'account') => void
  onOpenProfile: () => void
  onOpenAuth: () => void
  isLoggedIn: boolean
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenProfile,
  onOpenAuth,
  isLoggedIn,
}) => {
  const tabIndexMap: Record<string, number> = {
    home: 0,
    map: 1,
    khampha: 2,
    trending: 3,
    account: 4,
  }
  const activeIndex = tabIndexMap[activeTab] ?? 0

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)] border-t border-slate-200 select-none pb-[env(safe-area-inset-bottom,0px)]">
      {/* Top green contour lines & Center Notch Arch */}
      <div
        className="absolute top-0 left-0 h-[2px] bg-[#168039]/40"
        style={{ right: 'calc(50% + 50px)' }}
      />
      <div
        className="absolute top-0 right-0 h-[2px] bg-[#168039]/40"
        style={{ left: 'calc(50% + 50px)' }}
      />

      {/* Center Arch SVG */}
      <svg
        viewBox="0 0 100 24"
        fill="none"
        className="absolute -top-[23px] left-1/2 -translate-x-1/2 w-[100px] h-[24px] pointer-events-none drop-shadow-[0_-2px_3px_rgba(0,0,0,0.04)]"
      >
        <path
          d="M 0 24 C 20 24 24 1 50 1 C 76 1 80 24 100 24 L 100 26 L 0 26 Z"
          fill="#ffffff"
        />
        <path
          d="M 0 23.5 C 20 23.5 24 0.75 50 0.75 C 76 0.75 80 23.5 100 23.5"
          stroke="#168039"
          strokeOpacity="0.45"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>

      {/* Floating Center Action Button (Khám phá) */}
      <button
        type="button"
        onClick={() => onSelectTab('khampha')}
        className={`absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] z-20 cursor-pointer active:scale-90 group ${
          activeTab === 'khampha'
            ? 'bg-[#168039] text-white ring-4 ring-white scale-110 -translate-y-1.5'
            : 'bg-[#168039] hover:bg-[#136c30] hover:scale-105 text-white ring-4 ring-white'
        }`}
        title="Khám phá buổi chơi & Lịch giao lưu"
        aria-label="Khám phá"
      >
        <Newspaper
          className={`w-7 h-7 text-white stroke-[2.2] transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-115 group-active:scale-95 ${
            activeTab === 'khampha' ? 'scale-110' : 'scale-100'
          }`}
        />
      </button>

      {/* 5-Column Navigation Bar with perfectly centered sliding active indicator */}
      <div className="h-[70px] sm:h-[74px] max-w-xl mx-auto sm:max-w-2xl relative">
        {/* Sliding Indicator (Pill + Dot): Exactly 1/5 width, positioned by translateX for 100% precision */}
        <div
          className="absolute inset-y-0 left-0 w-1/5 pointer-events-none transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.3,0.64,1)] z-0 flex flex-col items-center justify-end pb-2"
          style={{
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        >
          {/* Soft Active Pill Background */}
          <div
            className={`w-[calc(100%-8px)] max-w-[84px] h-[52px] rounded-2xl bg-[#168039]/10 transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.4,0.64,1)] ${
              activeTab === 'khampha' ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
            }`}
          />
          {/* Active Dot Indicator */}
          <div
            className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#168039] transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
              activeTab === 'khampha' ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
            }`}
          />
        </div>

        {/* 5-Column Buttons Grid */}
        <div className="h-full grid grid-cols-5 relative z-10">
          {/* 1. Trang chủ */}
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="relative flex flex-col items-center justify-end pb-2.5 pt-2 transition-transform duration-200 cursor-pointer group active:scale-95 w-full"
          >
            <div
              className={`p-1 rounded-xl transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center ${
                activeTab === 'home'
                  ? 'text-[#168039] -translate-y-1 scale-110'
                  : 'text-slate-500 group-hover:text-slate-800 group-hover:-translate-y-0.5 group-hover:scale-105'
              }`}
            >
              <Home
                className={`w-6 h-6 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
                  activeTab === 'home'
                    ? 'stroke-[2.5] scale-105'
                    : 'stroke-[1.8] group-hover:scale-105'
                }`}
              />
            </div>
            <span
              className={`text-xs sm:text-[13px] leading-tight transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] tracking-tight mt-0.5 ${
                activeTab === 'home'
                  ? 'font-black text-[#168039] scale-105 -translate-y-0.5'
                  : 'font-semibold text-slate-500 group-hover:text-slate-800 group-hover:scale-105'
              }`}
            >
              Trang chủ
            </span>
            <div className="h-1" />
          </button>

          {/* 2. Bản đồ */}
          <button
            type="button"
            onClick={() => onSelectTab('map')}
            className="relative flex flex-col items-center justify-end pb-2.5 pt-2 transition-transform duration-200 cursor-pointer group active:scale-95 w-full"
          >
            <div
              className={`p-1 rounded-xl transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center ${
                activeTab === 'map'
                  ? 'text-[#168039] -translate-y-1 scale-110'
                  : 'text-slate-500 group-hover:text-slate-800 group-hover:-translate-y-0.5 group-hover:scale-105'
              }`}
            >
              <MapPin
                className={`w-6 h-6 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
                  activeTab === 'map'
                    ? 'stroke-[2.5] scale-105'
                    : 'stroke-[1.8] group-hover:scale-105'
                }`}
              />
            </div>
            <span
              className={`text-xs sm:text-[13px] leading-tight transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] tracking-tight mt-0.5 ${
                activeTab === 'map'
                  ? 'font-black text-[#168039] scale-105 -translate-y-0.5'
                  : 'font-semibold text-slate-500 group-hover:text-slate-800 group-hover:scale-105'
              }`}
            >
              Bản đồ
            </span>
            <div className="h-1" />
          </button>

          {/* 3. Khám phá (Clickable area below floating circle) */}
          <button
            type="button"
            onClick={() => onSelectTab('khampha')}
            className="relative flex flex-col items-center justify-end pb-2.5 pt-6 cursor-pointer group active:scale-95 transition-transform duration-200 w-full"
          >
            <span
              className={`text-xs sm:text-[13px] leading-tight transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] tracking-tight ${
                activeTab === 'khampha'
                  ? 'text-[#168039] font-black scale-105 -translate-y-0.5'
                  : 'text-[#168039] font-bold group-hover:font-black group-hover:scale-105'
              }`}
            >
              Khám phá
            </span>
            <div className="h-1" />
          </button>

          {/* 4. Nổi bật */}
          <button
            type="button"
            onClick={() => onSelectTab('trending')}
            className="relative flex flex-col items-center justify-end pb-2.5 pt-2 transition-transform duration-200 cursor-pointer group active:scale-95 w-full"
          >
            <div
              className={`p-1 rounded-xl transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center ${
                activeTab === 'trending'
                  ? 'text-[#168039] -translate-y-1 scale-110'
                  : 'text-slate-500 group-hover:text-slate-800 group-hover:-translate-y-0.5 group-hover:scale-105'
              }`}
            >
              <Flame
                className={`w-6 h-6 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
                  activeTab === 'trending'
                    ? 'stroke-[2.5] scale-105'
                    : 'stroke-[1.8] group-hover:scale-105'
                }`}
              />
            </div>
            <span
              className={`text-xs sm:text-[13px] leading-tight transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] tracking-tight mt-0.5 ${
                activeTab === 'trending'
                  ? 'font-black text-[#168039] scale-105 -translate-y-0.5'
                : 'font-semibold text-slate-500 group-hover:text-slate-800 group-hover:scale-105'
              }`}
            >
              Nổi bật
            </span>
            <div className="h-1" />
          </button>

          {/* 5. Tài khoản */}
          <button
            type="button"
            onClick={() => {
              if (isLoggedIn) {
                onOpenProfile()
              } else {
                onOpenAuth()
              }
            }}
            className="relative flex flex-col items-center justify-end pb-2.5 pt-2 transition-transform duration-200 cursor-pointer group active:scale-95 w-full"
          >
            <div
              className={`p-1 rounded-xl transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center ${
                activeTab === 'account'
                  ? 'text-[#168039] -translate-y-1 scale-110'
                  : 'text-slate-500 group-hover:text-slate-800 group-hover:-translate-y-0.5 group-hover:scale-105'
              }`}
            >
              <UserIcon
                className={`w-6 h-6 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] ${
                  activeTab === 'account'
                    ? 'stroke-[2.5] scale-105'
                    : 'stroke-[1.8] group-hover:scale-105'
                }`}
              />
            </div>
            <span
              className={`text-xs sm:text-[13px] leading-tight transition-all duration-300 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)] tracking-tight mt-0.5 ${
                activeTab === 'account'
                  ? 'font-black text-[#168039] scale-105 -translate-y-0.5'
                  : 'font-semibold text-slate-500 group-hover:text-slate-800 group-hover:scale-105'
              }`}
            >
              Tài khoản
            </span>
            <div className="h-1" />
          </button>
        </div>
      </div>
    </nav>
  )
}
