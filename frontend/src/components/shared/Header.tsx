import React, { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { User, NotificationItem } from '../../modules/types/user'
import { NotificationBell } from '../../modules/user/notification/NotificationBell'
import { AppLogo } from './AppLogo'
import { UserAvatar } from './UserAvatar'

interface HeaderProps {
  currentUser: User | null
  notifications: NotificationItem[]
  onOpenAuth: (initialTab?: 'login' | 'register') => void
  onOpenProfile: () => void
  onOpenOwnerChat?: () => void
  onMarkAllNotificationsRead: () => void
  onMarkNotificationRead: (id: string) => void
  onNavigateHome?: () => void
  isHome?: boolean
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  notifications,
  onOpenAuth,
  onOpenProfile,
  onOpenOwnerChat,
  onMarkAllNotificationsRead,
  onMarkNotificationRead,
  onNavigateHome,
  isHome = false,
}) => {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Current date formatted in Vietnamese
  const today = new Date()
  const daysOfWeekVi = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy']
  const dateStr = `${daysOfWeekVi[today.getDay()]}, ${today.getDate().toString().padStart(2, '0')}/${(
    today.getMonth() + 1
  )
    .toString()
    .padStart(2, '0')}/${today.getFullYear()}`

  return (
    <header
      className={`relative z-10 w-full bg-[#156335] text-white transition-all duration-300 ${
        isScrolled ? 'shadow-md shadow-slate-900/10' : 'shadow-xs'
      } ${isHome ? 'pb-10 sm:pb-12' : 'pb-0'}`}
    >
      {/* Background athletic badminton camo terrain & motifs (Zero gradient, multi-tone solid flat sport shapes) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <svg
          className="w-full h-full"
          viewBox="0 0 1440 120"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Pattern 1: Badminton Racquet Mesh / Cross-string Grid */}
            <pattern
              id="header-racquet-grid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 20 M 0 0 L 20 20"
                stroke="white"
                strokeWidth="0.75"
                strokeOpacity="0.06"
              />
            </pattern>

            {/* Pattern 2: Breathable Sports Fabric Micro-Dots */}
            <pattern
              id="header-sport-dots"
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="7" cy="7" r="1.1" fill="white" fillOpacity="0.045" />
            </pattern>
          </defs>

          {/* Base background solid green */}
          <rect width="100%" height="100%" fill="#156335" />

          {/* ================= LAYER 1: ORGANIC ATHLETIC SPORT CAMO SHAPES (Zero Gradient, Multi-tone Solid Greens) ================= */}
          <path
            d="M 0 0 L 340 0 C 270 45, 180 85, 90 120 L 0 120 Z"
            fill="#0f3d1e"
            fillOpacity="0.55"
          />
          <path
            d="M 240 0 C 380 30, 480 95, 620 120 L 410 120 C 310 90, 220 50, 160 0 Z"
            fill="#134e28"
            fillOpacity="0.48"
          />
          <path
            d="M 520 0 C 650 35, 780 15, 940 70 C 1020 95, 1100 115, 1180 120 L 780 120 C 680 90, 580 40, 480 0 Z"
            fill="#0f3d1e"
            fillOpacity="0.45"
          />
          <path
            d="M 980 0 C 1120 40, 1260 20, 1440 65 L 1440 0 Z"
            fill="#134e28"
            fillOpacity="0.55"
          />
          <path
            d="M 1120 120 C 1220 85, 1340 60, 1440 50 L 1440 120 Z"
            fill="#0b3017"
            fillOpacity="0.5"
          />

          {/* Vibrant Athletic Green Overlay Waves */}
          <path
            d="M 0 45 C 140 15, 290 65, 450 40 C 620 15, 760 85, 920 65 C 1080 45, 1250 100, 1440 80 L 1440 120 L 0 120 Z"
            fill="#168039"
            fillOpacity="0.32"
          />
          <path
            d="M 120 0 C 260 55, 380 20, 520 75 C 640 115, 780 60, 920 110 L 820 120 C 680 80, 540 110, 420 50 C 320 0, 220 30, 120 0 Z"
            fill="#22c55e"
            fillOpacity="0.12"
          />

          {/* Layer 2: Subtle Sport Fabric Micro-dots & Racquet Grid Texture */}
          <rect width="100%" height="100%" fill="url(#header-sport-dots)" />
          <rect
            x="48%"
            y="0"
            width="52%"
            height="100%"
            fill="url(#header-racquet-grid)"
            opacity="0.75"
          />

          {/* ================= LAYER 3: DISTINCT BADMINTON MOTIFS ================= */}
          {/* 1. Shuttlecock in flight (Quả cầu lông bay smash bên trái-giữa) */}
          <g transform="translate(380, 26) rotate(-22)" stroke="white" fill="none">
            {/* Cork (Đầu quả cầu lông) */}
            <path
              d="M 12 18 C 12 10, 20 10, 20 18 Z"
              fill="white"
              fillOpacity="0.22"
              strokeWidth="1.5"
              strokeOpacity="0.35"
            />
            {/* Feather Skirt (Váy lông cầu lông) */}
            <path
              d="M 12 18 L 4 48 C 16 52, 26 48, 28 48 L 20 18 Z"
              strokeWidth="1.3"
              strokeOpacity="0.24"
            />
            {/* Feather Ribbons (Dải đai buộc lông) */}
            <path d="M 8 32 C 14 34, 20 33, 24 32" strokeWidth="1" strokeOpacity="0.26" />
            <path d="M 6 40 C 13 43, 19 41, 26 40" strokeWidth="1" strokeOpacity="0.26" />
            {/* Quill lines (Nan lông vũ) */}
            <line x1="14" y1="18" x2="9" y2="48" strokeWidth="0.8" strokeOpacity="0.18" />
            <line x1="16" y1="18" x2="16" y2="50" strokeWidth="0.8" strokeOpacity="0.18" />
            <line x1="18" y1="18" x2="23" y2="48" strokeWidth="0.8" strokeOpacity="0.18" />
            {/* Speed lines trail behind shuttlecock */}
            <path d="M 16 8 L 16 -16" strokeWidth="1.2" strokeOpacity="0.22" strokeDasharray="4 3" />
            <path d="M 22 10 L 26 -10" strokeWidth="0.9" strokeOpacity="0.16" strokeDasharray="3 3" />
            <path d="M 10 10 L 6 -10" strokeWidth="0.9" strokeOpacity="0.16" strokeDasharray="3 3" />
          </g>

          {/* 2. Isometric Badminton Court Lines (Sân cầu lông thi đấu BWF) */}
          <g transform="translate(660, 10)" stroke="white" strokeWidth="1.2" strokeOpacity="0.15" fill="none">
            <polygon points="0,85 180,20 370,20 190,85" />
            <line x1="20" y1="78" x2="195" y2="20" />
            <line x1="170" y1="85" x2="350" y2="20" />
            <line x1="75" y1="58" x2="260" y2="58" />
            <line x1="115" y1="42" x2="300" y2="42" />
            <line x1="95" y1="50" x2="280" y2="50" strokeDasharray="4 3" />
            <line x1="95" y1="14" x2="95" y2="86" stroke="white" strokeWidth="2.2" strokeOpacity="0.22" />
          </g>

          {/* 3. Badminton Racquet (Cây vợt cầu lông góc phải) */}
          <g transform="translate(1090, 4) rotate(22)" stroke="white" fill="none">
            <ellipse cx="40" cy="34" rx="26" ry="32" strokeWidth="1.8" strokeOpacity="0.28" />
            <g strokeWidth="0.6" strokeOpacity="0.12">
              <line x1="40" y1="4" x2="40" y2="64" />
              <line x1="32" y1="6" x2="32" y2="62" />
              <line x1="48" y1="6" x2="48" y2="62" />
              <line x1="24" y1="12" x2="24" y2="56" />
              <line x1="56" y1="12" x2="56" y2="56" />
              <line x1="16" y1="34" x2="64" y2="34" />
              <line x1="18" y1="24" x2="62" y2="24" />
              <line x1="18" y1="44" x2="62" y2="44" />
              <line x1="22" y1="16" x2="58" y2="16" />
              <line x1="22" y1="52" x2="58" y2="52" />
            </g>
            <path d="M 37 66 L 43 66 L 41 72 L 39 72 Z" fill="white" fillOpacity="0.25" />
            <line x1="40" y1="72" x2="40" y2="115" strokeWidth="1.8" strokeOpacity="0.22" />
            <rect x="36" y="115" width="8" height="42" rx="2" fill="white" fillOpacity="0.14" strokeWidth="1.2" strokeOpacity="0.22" />
            <line x1="36" y1="122" x2="44" y2="126" strokeWidth="0.8" strokeOpacity="0.24" />
            <line x1="36" y1="130" x2="44" y2="134" strokeWidth="0.8" strokeOpacity="0.24" />
            <line x1="36" y1="138" x2="44" y2="142" strokeWidth="0.8" strokeOpacity="0.24" />
            <line x1="36" y1="146" x2="44" y2="150" strokeWidth="0.8" strokeOpacity="0.24" />
          </g>

          {/* 4. Second Shuttlecock on far right */}
          <g transform="translate(1320, 50) rotate(42) scale(0.85)" stroke="white" fill="none">
            <path d="M 12 18 C 12 11, 20 11, 20 18 Z" fill="white" fillOpacity="0.2" strokeWidth="1.4" strokeOpacity="0.26" />
            <path d="M 12 18 L 4 48 C 16 52, 26 48, 28 48 L 20 18 Z" strokeWidth="1.2" strokeOpacity="0.2" />
            <path d="M 8 32 C 14 34, 20 33, 24 32" strokeWidth="1" strokeOpacity="0.22" />
            <line x1="14" y1="18" x2="9" y2="48" strokeWidth="0.8" strokeOpacity="0.16" />
            <line x1="16" y1="18" x2="16" y2="50" strokeWidth="0.8" strokeOpacity="0.16" />
            <line x1="18" y1="18" x2="23" y2="48" strokeWidth="0.8" strokeOpacity="0.16" />
          </g>

          {/* 5. Aerodynamic Smash Flight Curves */}
          <path
            d="M -50 110 C 200 100, 450 20, 850 65 C 1150 105, 1320 35, 1500 20"
            stroke="white"
            strokeWidth="1.8"
            strokeOpacity="0.18"
            fill="none"
          />
          <path
            d="M -20 115 C 240 115, 500 45, 900 80 C 1200 115, 1370 55, 1550 35"
            stroke="white"
            strokeWidth="1"
            strokeOpacity="0.1"
            fill="none"
          />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left side: Brand Logo at the far left */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div
            onClick={onNavigateHome}
            className="flex items-center cursor-pointer group select-none transition-colors active:scale-98"
            title="Trang chủ SmashCourt"
          >
            <AppLogo size="md" />
          </div>
        </div>

        {/* Right side: Chat with Owner, Notifications, and User Profile / Auth buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Chat với chủ sân */}
          <button
            type="button"
            onClick={onOpenOwnerChat || (() => toast.info('Hộp thư tin nhắn với chủ sân & ban quản lý cụm sân'))}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Chat & Nhắn tin với chủ sân"
            aria-label="Chat với chủ sân"
          >
            <MessageCircle className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-white" />
          </button>

          {/* Standard Notification Bell */}
          <NotificationBell
            notifications={notifications}
            onMarkAllAsRead={onMarkAllNotificationsRead}
            onMarkAsRead={onMarkNotificationRead}
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
                <span className="text-sm font-black tracking-normal text-[#facc15] group-hover:text-amber-300 transition-colors">
                  {currentUser.fullName}
                </span>
              </div>

              {/* User Avatar */}
              <div className="relative flex-shrink-0">
                <UserAvatar
                  src={currentUser.avatarUrl}
                  name={currentUser.fullName}
                  className="w-9 h-9 sm:w-11 sm:h-11"
                  ringClassName="ring-2 ring-white/90"
                  fallbackBgColor="bg-emerald-800 text-white"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-white hover:bg-slate-100 active:scale-95 text-slate-900 border-2 border-white text-xs sm:text-sm font-black transition-colors cursor-pointer inline-flex items-center justify-center shrink-0"
              >
                Đăng nhập
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="hidden sm:inline-flex h-9 sm:h-10 px-4 sm:px-5 rounded-full bg-transparent hover:bg-white/10 active:scale-95 text-white border-2 border-white text-xs sm:text-sm font-black transition-colors cursor-pointer items-center justify-center shrink-0"
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
