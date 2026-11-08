import React, { useCallback, useEffect, useState } from 'react'
import {
  Phone,
  Search,
  UserCheck,
  CheckCircle2,
  CreditCard,
  XCircle,
  Calendar,
} from 'lucide-react'
import { OwnerLayout } from './OwnerLayout'
import { courtApi } from '../services/courtApi'
import type { Facility, OwnerBookingItem } from '../../types/court'
import { toast } from 'sonner'

export const OwnerBookingsView: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [bookings, setBookings] = useState<OwnerBookingItem[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    courtApi
      .getOwnerFacilities()
      .then((list) => setFacilities(list))
      .catch(() => {})
  }, [])

  const loadBookings = useCallback(async () => {
    setLoading(true)
    try {
      const data = await courtApi.getOwnerBookings({
        facilityId: selectedFacilityId || undefined,
        status: statusFilter,
        date: dateFilter || undefined,
        keyword: searchQuery || undefined,
      })
      setBookings(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải danh sách đơn đặt')
    } finally {
      setLoading(false)
    }
  }, [selectedFacilityId, statusFilter, dateFilter, searchQuery])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  const handleUpdateStatus = async (
    booking: OwnerBookingItem,
    nextStatus: OwnerBookingItem['status'],
    successMsg: string
  ) => {
    try {
      await courtApi.updateOwnerBookingStatus(booking.id, nextStatus)
      toast.success(successMsg)
      loadBookings()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cập nhật đơn đặt thất bại')
    }
  }

  return (
    <OwnerLayout
      title="Quản lý Đơn đặt & Đón khách Nhận sân"
      subtitle="Tra cứu mã đặt chỗ, xác nhận thanh toán tại quầy, đón khách nhận sân và giải phóng khung giờ hủy"
    >
      {/* Unified Filter & Table Workplace */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Cụm sân</label>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs sm:text-sm text-slate-900 cursor-pointer"
            >
              <option value="">Tất cả cơ sở quản lý</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Trạng thái đơn</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs sm:text-sm text-slate-900 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="CONFIRMED">Đã xác nhận / Chờ nhận sân</option>
              <option value="HELD">Đang giữ chỗ 10 phút</option>
              <option value="COMPLETED">Khách đã nhận sân</option>
              <option value="CANCELLED">Đã hủy đơn</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Ngày thi đấu</label>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-xs sm:text-sm text-slate-900"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="px-2.5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Tìm khách hàng / Mã đơn
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tên khách, SĐT, mã SMC-..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Summary Header */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            Kết quả lọc: {bookings.length} đơn đặt sân
          </span>
          <span className="text-slate-600 font-medium">
            Tổng giá trị hiển thị:{' '}
            <strong className="text-[#168039]">
              {bookings
                .filter((b) => b.status !== 'CANCELLED')
                .reduce((s, b) => s + b.totalAmount, 0)
                .toLocaleString('vi-VN')}{' '}
              đ
            </strong>
          </span>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-600">
            Đang tải danh sách đơn đặt...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-10 text-center text-slate-600 text-xs sm:text-sm">
            Không tìm thấy đơn đặt sân nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bookings.map((bk) => (
              <div
                key={bk.id}
                className="p-4 sm:p-5 hover:bg-slate-50/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-md">
                      {bk.bookingCode}
                    </span>
                    <strong className="text-sm text-slate-900">{bk.customerName}</strong>
                    <span className="text-xs text-slate-600 inline-flex items-center gap-1 font-medium">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {bk.customerPhone}
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold text-[#168039]">{bk.facilityName}</span>
                    <span className="text-slate-300">|</span>
                    <span className="font-semibold text-slate-900">{bk.courtName}</span>
                    <span className="text-slate-300">|</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {bk.bookingDate} ({bk.startTime} - {bk.endTime})
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 font-medium">
                    Tổng thanh toán:{' '}
                    <strong className="text-[#168039] font-black text-sm">
                      {bk.totalAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
                  {(bk.status === 'HELD' || bk.status === 'PENDING_PAYMENT') && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(
                          bk,
                          'CONFIRMED',
                          `Đã xác nhận thu tiền đơn ${bk.bookingCode}`
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#e5a92c] hover:bg-[#d49b24] text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Xác nhận thanh toán</span>
                    </button>
                  )}

                  {bk.status === 'CONFIRMED' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(
                          bk,
                          'COMPLETED',
                          `Khách ${bk.customerName} đã nhận sân thành công!`
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Xác nhận nhận sân</span>
                    </button>
                  )}

                  {bk.status === 'COMPLETED' && (
                    <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#168039]" />
                      <span>Đã hoàn tất nhận sân</span>
                    </span>
                  )}

                  {bk.status === 'CANCELLED' && (
                    <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Đã hủy & mở lại giờ</span>
                    </span>
                  )}

                  {bk.status !== 'CANCELLED' && bk.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateStatus(
                          bk,
                          'CANCELLED',
                          `Đã hủy đơn ${bk.bookingCode} và giải phóng khung giờ!`
                        )
                      }
                      className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
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
