import React, { useState } from 'react'
import { MessageCircle, Globe } from 'lucide-react'
import type { User, NotificationItem } from '../../modules/types/user'
import { NotificationBell } from '../../modules/user/notification/NotificationBell'
import { AppLogo } from './AppLogo'

interface HeaderProps {
  currentUser: User | null
  notifications: NotificationItem[]
  onOpenAuth: (initialTab?: 'login' | 'register') => void
  onOpenProfile: () => void
  onOpenAIChat: () => void
  onMarkAllNotificationsRead: () => void
  onMarkNotificationRead: (id: string) => void
  onSimulateNewNotification: () => void
  onNavigateHome?: () => void
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  notifications,
  onOpenAuth,
  onOpenProfile,
  onOpenAIChat,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onSimulateNewNotification,
  onNavigateHome,
}) => {
  const [lang, setLang] = useState<'vi' | 'en'>('vi')

  // Current date formatted in Vietnamese and English
  const today = new Date()
  const daysOfWeekVi = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
  const daysOfWeekEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const dateStrVi = `${daysOfWeekVi[today.getDay()]}, ${today.getDate().toString().padStart(2, '0')}/${(
    today.getMonth() + 1
  )
    .toString()
    .padStart(2, '0')}/${today.getFullYear()}`

  const dateStrEn = `${daysOfWeekEn[today.getDay()]}, ${today.getDate().toString().padStart(2, '0')} ${
    monthsEn[today.getMonth()]
  } ${today.getFullYear()}`

  const dateStr = lang === 'vi' ? dateStrVi : dateStrEn

  return (
    <header className="relative z-40 w-full bg-[#1b7a42] text-white shadow-xs">
      {/* Background decorative wavy sport curves (isolated overflow-hidden) */}
      <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1200 120">
          <path
            d="M0,0 C150,90 350,-40 500,60 C650,160 900,10 1200,40 L1200,0 L0,0 Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-4">
        {/* Left side: Brand Logo at the far left */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            onClick={onNavigateHome}
            className="flex items-center cursor-pointer group select-none transition-transform hover:scale-[1.02] active:scale-98"
            title="Trang chủ SmashCourt"
          >
            <AppLogo size="md" />
          </div>
        </div>

        {/* Right side: AI Chat, Language Switcher, Notifications, and User Profile / Auth buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* AI Chat button */}
          <button
            type="button"
            onClick={onOpenAIChat}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Chat trợ lý AI"
          >
            <MessageCircle className="w-5 h-5 text-white" />
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
            title={lang === 'vi' ? 'Đổi sang English' : 'Chuyển sang Tiếng Việt'}
          >
            {lang === 'vi' ? (
              <span className="flex items-center gap-1 font-bold">
                <Globe className="w-3.5 h-3.5 text-emerald-200" />
                <span>VI</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold">
                <Globe className="w-3.5 h-3.5 text-amber-200" />
                <span>EN</span>
              </span>
            )}
          </button>

          {/* Standard Notification Bell */}
          <NotificationBell
            notifications={notifications}
            onMarkAllAsRead={onMarkAllNotificationsRead}
            onMarkAsRead={onMarkNotificationRead}
            onSimulateNewNotification={onSimulateNewNotification}
          />

          {/* Vertical divider */}
          <div className="h-8 w-px bg-white/20 mx-0.5 sm:mx-1 hidden sm:block" />

          {/* User Profile or Auth CTA */}
          {currentUser ? (
            <div
              onClick={onOpenProfile}
              className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group select-none pl-1.5 py-1 pr-2 rounded-full hover:bg-white/10 transition-colors"
              title="Xem thông tin tài khoản"
            >
              {/* Stacked Date & User Name on larger screens (desktop/tablet) */}
              <div className="hidden md:flex flex-col text-right leading-tight">
                <span className="text-xs font-semibold text-emerald-100 tracking-wide">
                  {dateStr}
                </span>
                <span className="text-sm font-black tracking-wide text-[#facc15] group-hover:text-amber-300 transition-colors uppercase">
                  {currentUser.fullName}
                </span>
              </div>

              {/* User Avatar */}
              <div className="relative flex-shrink-0">
                <img
                  src={
                    currentUser.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                  }
                  alt={currentUser.fullName}
                  className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover ring-2 ring-white/90 group-hover:scale-105 transition-transform"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 rounded-full bg-white hover:bg-slate-100 text-slate-900 text-sm font-black transition-colors cursor-pointer"
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="hidden sm:inline-flex px-4 py-2 rounded-full bg-transparent hover:bg-white/10 text-white border-2 border-white text-sm font-black transition-all cursor-pointer"
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
