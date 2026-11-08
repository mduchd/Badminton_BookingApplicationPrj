import React, { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building,
  DollarSign,
  Wrench,
  CalendarCheck,
  ArrowLeft,
  ShieldAlert,
  LogIn,
  UserCheck,
} from 'lucide-react'
import { ROUTES } from '../../../app/router'
import { authApi, authStorage } from '../../user/auth/authApi'
import type { User } from '../../types/user'
import { AuthModal } from '../../user/auth/AuthModal'

interface OwnerLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export const OwnerLayout: React.FC<OwnerLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
}) => {
  const navigate = useNavigate()
  const [ownerUser, setOwnerUser] = useState<User | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(() => Boolean(authStorage.getToken()))
  const [isAuthOpen, setIsAuthOpen] = useState(false)

  useEffect(() => {
    if (!authStorage.getToken()) return
    let active = true
    authApi.getMe()
      .then((user) => { if (active) setOwnerUser(user) })
      .catch(() => { if (active) setOwnerUser(null) })
      .finally(() => { if (active) setCheckingAuth(false) })
    return () => { active = false }
  }, [])

  const isForbiddenCustomer =
    ownerUser != null &&
    ownerUser.role !== 'COURT_OWNER' &&
    ownerUser.role !== 'SYSTEM_ADMIN'

  const navItems = [
    { to: ROUTES.OWNER_DASHBOARD, label: 'Tổng quan & Doanh thu', icon: LayoutDashboard },
    { to: ROUTES.OWNER_FACILITIES, label: 'Cụm sân & Sân con', icon: Building },
    { to: ROUTES.OWNER_PRICING, label: 'Bảng giá linh hoạt', icon: DollarSign },
    { to: ROUTES.OWNER_BLOCKS, label: 'Khóa lịch bảo trì', icon: Wrench },
    { to: ROUTES.OWNER_BOOKINGS, label: 'Đơn đặt & Nhận sân', icon: CalendarCheck },
  ]

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-5 pb-20">
      {/* Unified Workplace Shell Header + Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Top Row */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-600 mt-1">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {ownerUser && !isForbiddenCustomer ? (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                <UserCheck className="w-4 h-4 text-[#168039]" />
                <span>{ownerUser.fullName}</span>
                <span className="text-slate-300">|</span>
                <span className="text-[#168039] font-bold">
                  {ownerUser.role === 'SYSTEM_ADMIN' ? 'Quản trị viên' : 'Chủ cụm sân'}
                </span>
              </div>
            ) : !checkingAuth ? (
              <button
                type="button"
                onClick={() => setIsAuthOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#e5a92c] hover:bg-[#d49b24] text-white text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập Chủ sân</span>
              </button>
            ) : null}

            {actions}

            <button
              type="button"
              onClick={() => navigate(ROUTES.HOME)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Giao diện đặt sân</span>
            </button>
          </div>
        </div>

        {/* Seamless Navigation Tabs */}
        <div className="px-3 sm:px-5 bg-slate-50 flex items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ROUTES.OWNER_DASHBOARD}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3.5 py-3 text-xs sm:text-sm font-bold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                    isActive
                      ? 'border-[#168039] text-[#168039] bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </div>

      {/* RBAC Guard if logged in as regular Customer */}
      {isForbiddenCustomer ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Khu vực dành riêng cho Chủ cụm sân
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Tài khoản hiện tại (<strong>{ownerUser.email}</strong>) đang mang vai trò Khách đặt sân nên không có quyền truy cập chức năng quản trị cụm sân, bảng giá và doanh thu.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs sm:text-sm font-bold cursor-pointer transition-colors disabled:cursor-not-allowed"
            >
              Đăng nhập bằng tài khoản Chủ sân
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.HOME)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer transition-colors"
            >
              Về trang chủ đặt sân
            </button>
          </div>
        </div>
      ) : ownerUser ? (
        <div className="space-y-5">{children}</div>
      ) : (
        <p role="status" className="p-6 text-center text-sm text-slate-600">
          {checkingAuth ? 'Đang xác thực tài khoản…' : 'Đăng nhập bằng tài khoản Chủ sân để quản lý dữ liệu.'}
        </p>
      )}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={() => navigate(0)}
      />
    </div>
  )
}
