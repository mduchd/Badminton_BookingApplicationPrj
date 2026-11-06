import React, { useState } from 'react'
import {
  Phone,
  Search,
  UserCheck,
  CheckCircle2,
} from 'lucide-react'
import { OwnerLayout } from './OwnerLayout'
import { appStore } from '../../../lib/appStore'
import type { BookingStatus } from '../../types/booking'
import { toast } from 'sonner'

export const OwnerBookingsView: React.FC = () => {
  const facilities = appStore.getFacilities()
  const [selectedFacilityId, setSelectedFacilityId] = useState(facilities[0]?.id || '')
  const [statusFilter, setStatusFilter] = useState<'ALL' | BookingStatus>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [bookings, setBookings] = useState(appStore.getBookings())

  const filteredBookings = bookings.filter((b) => {
    if (selectedFacilityId && b.facilityId !== selectedFacilityId) return false
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchCode = b.bookingCode.toLowerCase().includes(q)
      const matchName = b.customerName.toLowerCase().includes(q)
      const matchPhone = b.customerPhone.includes(q)
      if (!matchCode && !matchName && !matchPhone) return false
    }
    return true
  })

  const handleCheckIn = (id: string) => {
    appStore.updateBookingStatus(id, 'COMPLETED')
    setBookings(appStore.getBookings())
    toast.success('Đã xác nhận khách nhận sân thành công!')
  }

  const handleCancelBooking = (id: string) => {
    appStore.updateBookingStatus(id, 'CANCELLED')
    setBookings(appStore.getBookings())
    toast.info('Đã hủy đơn đặt và giải phóng khung giờ!')
  }

  return (
    <OwnerLayout
      title="Quản lý Đơn đặt của Khách"
      subtitle="Theo dõi toàn bộ lịch đặt, xác nhận khách đến nhận sân và đối soát thanh toán"
    >
      {/* Top Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Facility Select */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Cụm sân</label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs sm:text-sm text-slate-900 cursor-pointer"
            >
              <option value="">Tất cả cụm sân</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Trạng thái đơn</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs sm:text-sm text-slate-900 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="CONFIRMED">Đã thanh toán / Chờ nhận sân</option>
              <option value="HELD">Đang giữ chỗ 10p</option>
              <option value="COMPLETED">Đã nhận sân</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Tìm khách hàng / Mã đơn</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nhập tên, SĐT hoặc SC-..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 p-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Danh sách đơn đặt ({filteredBookings.length})
          </h3>
          <span className="text-xs text-slate-500">Cập nhật theo thời gian thực</span>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Không tìm thấy đơn đặt nào phù hợp với điều kiện tìm kiếm.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredBookings.map((bk) => (
              <div
                key={bk.id}
                className="p-4 sm:p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Booking info */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {bk.bookingCode}
                    </span>
                    <strong className="text-sm text-slate-900">{bk.customerName}</strong>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {bk.customerPhone}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 font-medium">
                    <span className="font-bold text-emerald-800">{bk.facilityName}</span>
                    <span className="mx-1.5 text-slate-300">|</span>
                    <span>{bk.slots.map((s) => `${s.courtName} (${s.date} ${s.startTime}-${s.endTime})`).join(', ')}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Phương thức: <strong className="text-slate-700">{bk.paymentMethod || 'PAYOS'}</strong></span>
                    <span className="text-slate-300">|</span>
                    <span>Tổng tiền: <strong className="text-[#168039] font-black text-sm">{bk.totalAmount.toLocaleString('vi-VN')} đ</strong></span>
                  </div>
                </div>

                {/* Right: Status & Action buttons */}
                <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                  {bk.status === 'CONFIRMED' && (
                    <button
                      type="button"
                      onClick={() => handleCheckIn(bk.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Xác nhận nhận sân</span>
                    </button>
                  )}

                  {bk.status === 'COMPLETED' && (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Khách đã nhận sân</span>
                    </span>
                  )}

                  {bk.status === 'HELD' && (
                    <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
                      Đang giữ chỗ
                    </span>
                  )}

                  {bk.status === 'CANCELLED' && (
                    <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold">
                      Đã hủy đơn
                    </span>
                  )}

                  {bk.status !== 'CANCELLED' && bk.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => handleCancelBooking(bk.id)}
                      className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 text-xs font-bold cursor-pointer transition-colors"
                      title="Hủy đơn này"
                    >
                      Hủy đơn
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </OwnerLayout>
  )
}
