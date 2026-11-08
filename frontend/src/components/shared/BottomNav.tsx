import React from 'react'
import { Home, MapPin, Compass, User as UserIcon, Sparkles } from 'lucide-react'

export interface BottomNavProps {
  activeTab: 'home' | 'map' | 'khampha' | 'trending' | 'account' | string
  onSelectTab: (tab: 'home' | 'map' | 'khampha' | 'trending' | 'account') => void
  onOpenProfile?: () => void
  onOpenAuth?: () => void
  onOpenAIChat?: () => void
  isAIChatOpen?: boolean
  isLoggedIn?: boolean
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenAIChat,
  isAIChatOpen = false,
}) => {
  return (
    <nav
      aria-label="Thanh điều hướng chính"
      className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-16px)] sm:w-[calc(100%-32px)] max-w-3xl lg:max-w-4xl select-none"
    >
      {/* Floating Pill Dock Container with signature green border */}
      <div className="relative bg-white rounded-3xl sm:rounded-[36px] border-2 border-[#168039] shadow-[0_20px_50px_rgba(15,23,42,0.25),0_6px_18px_rgba(15,23,42,0.12)] ring-1 ring-slate-900/10 px-2 sm:px-6 md:px-8 py-1.5 transition-all duration-300">
        
        {/* 1. Floating Center Action Button (Trợ lý AI với icon Sparkles hiện đại, sắc nét) */}
        <button
          type="button"
          onClick={onOpenAIChat}
          className={`absolute -top-5 left-1/2 -translate-x-1/2 w-14 h-14 sm:w-15 sm:h-15 rounded-full flex items-center justify-center transition-colors duration-200 z-20 cursor-pointer active:scale-95 ring-4 ring-white ${
            isAIChatOpen
              ? 'bg-[#136c30] text-white'
              : 'bg-[#168039] hover:bg-[#136c30] text-white'
          }`}
          title="Trợ lý AI tìm sân & tư vấn"
          aria-label="Mở Trợ lý AI"
        >
          <Sparkles className="w-7 h-7 text-white stroke-[2.2]" />
        </button>

        {/* 2. 5-Column Navigation Bar (Trang chủ, Bản đồ, Hỏi AI, Khám phá gộp Nổi bật, Tài khoản) */}
        <div className="h-[66px] sm:h-[70px] relative flex items-center">
          <div className="h-full w-full grid grid-cols-5 relative z-10 gap-1 sm:gap-2 items-center">
            
            {/* 1. Trang chủ */}
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-colors duration-200 cursor-pointer active:scale-95 w-full h-[54px] sm:h-[58px] ${
                activeTab === 'home'
                  ? 'bg-emerald-50 text-[#168039]'
                  : 'text-[#168039] hover:bg-emerald-50/60'
              }`}
            >
              <div className="p-0.5 rounded-lg flex items-center justify-center text-[#168039]">
                <Home
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 text-[#168039] ${
                    activeTab === 'home'
                      ? 'stroke-[2.7]'
                      : 'stroke-[2.1] opacity-80'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight tracking-tight mt-0.5 truncate max-w-full text-[#168039] ${
                  activeTab === 'home'
                    ? 'font-black'
                    : 'font-bold opacity-80'
                }`}
              >
                Trang chủ
              </span>
            </button>

            {/* 2. Bản đồ */}
            <button
              type="button"
              onClick={() => onSelectTab('map')}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-colors duration-200 cursor-pointer active:scale-95 w-full h-[54px] sm:h-[58px] ${
                activeTab === 'map'
                  ? 'bg-emerald-50 text-[#168039]'
                  : 'text-[#168039] hover:bg-emerald-50/60'
              }`}
            >
              <div className="p-0.5 rounded-lg flex items-center justify-center text-[#168039]">
                <MapPin
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 text-[#168039] ${
                    activeTab === 'map'
                      ? 'stroke-[2.7]'
                      : 'stroke-[2.1] opacity-80'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight tracking-tight mt-0.5 truncate max-w-full text-[#168039] ${
                  activeTab === 'map'
                    ? 'font-black'
                    : 'font-bold opacity-80'
                }`}
              >
                Bản đồ
              </span>
            </button>

            {/* 3. Hỏi AI (Clickable area below floating circle) */}
            <button
              type="button"
              onClick={onOpenAIChat}
              className="relative flex flex-col items-center justify-end pb-1.5 pt-8 cursor-pointer active:scale-95 w-full h-[54px] sm:h-[58px]"
              title="Trợ lý AI tìm sân & tư vấn"
              aria-label="Mở Trợ lý AI"
            >
              <span
                className={`text-[11px] sm:text-[13px] leading-tight tracking-tight truncate max-w-full text-[#168039] ${
                  isAIChatOpen
                    ? 'font-black text-[#136c30]'
                    : 'font-bold opacity-80'
                }`}
              >
                Hỏi AI
              </span>
            </button>

            {/* 4. Khám phá (Gộp Khám phá & Nổi bật) */}
            <button
              type="button"
              onClick={() => onSelectTab('khampha')}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-colors duration-200 cursor-pointer active:scale-95 w-full h-[54px] sm:h-[58px] ${
                activeTab === 'khampha' || activeTab === 'trending'
                  ? 'bg-emerald-50 text-[#168039]'
                  : 'text-[#168039] hover:bg-emerald-50/60'
              }`}
              title="Khám phá & Nổi bật"
              aria-label="Khám phá"
            >
              <div className="p-0.5 rounded-lg flex items-center justify-center text-[#168039]">
                <Compass
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 text-[#168039] ${
                    activeTab === 'khampha' || activeTab === 'trending'
                      ? 'stroke-[2.7]'
                      : 'stroke-[2.1] opacity-80'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight tracking-tight mt-0.5 truncate max-w-full text-[#168039] ${
                  activeTab === 'khampha' || activeTab === 'trending'
                    ? 'font-black'
                    : 'font-bold opacity-80'
                }`}
              >
                Khám phá
              </span>
            </button>

            {/* 5. Tài khoản */}
            <button
              type="button"
              onClick={() => onSelectTab('account')}
              className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-colors duration-200 cursor-pointer active:scale-95 w-full h-[54px] sm:h-[58px] ${
                activeTab === 'account'
                  ? 'bg-emerald-50 text-[#168039]'
                  : 'text-[#168039] hover:bg-emerald-50/60'
              }`}
            >
              <div className="p-0.5 rounded-lg flex items-center justify-center text-[#168039]">
                <UserIcon
                  className={`w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 text-[#168039] ${
                    activeTab === 'account'
                      ? 'stroke-[2.7]'
                      : 'stroke-[2.1] opacity-80'
                  }`}
                />
              </div>
              <span
                className={`text-[11px] sm:text-[13px] leading-tight tracking-tight mt-0.5 truncate max-w-full text-[#168039] ${
                  activeTab === 'account'
                    ? 'font-black'
                    : 'font-bold opacity-80'
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
