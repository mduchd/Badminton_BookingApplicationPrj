import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building,
  DollarSign,
  Wrench,
  CalendarCheck,
  ArrowLeft,
} from 'lucide-react'
import { ROUTES } from '../../../app/router'

interface OwnerLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export const OwnerLayout: React.FC<OwnerLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  const navigate = useNavigate()

  const navItems = [
    { to: ROUTES.OWNER_DASHBOARD, label: 'Tổng quan', icon: LayoutDashboard },
    { to: ROUTES.OWNER_FACILITIES, label: 'Cụm sân & Sân con', icon: Building },
    { to: ROUTES.OWNER_PRICING, label: 'Bảng giá theo giờ', icon: DollarSign },
    { to: ROUTES.OWNER_BLOCKS, label: 'Khóa sân bảo trì', icon: Wrench },
    { to: ROUTES.OWNER_BOOKINGS, label: 'Đơn đặt của khách', icon: CalendarCheck },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-6 pb-28">
      {/* Top Banner & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-600 mt-1">{subtitle}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
          <span>Về trang đặt sân (Khách)</span>
        </button>
      </div>

      {/* Owner Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === ROUTES.OWNER_DASHBOARD}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#168039] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </div>

      {/* Main Content Area */}
      <main className="space-y-6">{children}</main>
    </div>
  )
}
