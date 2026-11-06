import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Trash2,
  QrCode,
} from 'lucide-react'
import { appStore } from '../../../lib/appStore'
import type { BookingOrder, BookingStatus } from '../../types/booking'
import { toast } from 'sonner'
import { ROUTES } from '../../../app/router'

export const BookingHistoryView: React.FC = () => {
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState<'ALL' | BookingStatus>('ALL')
  const [cancellingBooking, setCancellingBooking] = useState<BookingOrder | null>(null)
  const [cancelReason, setCancelReason] = useState('Bận lịch cá nhân đột xuất')
  const [allBookings, setAllBookings] = useState(appStore.getBookings())

  const filteredBookings = allBookings.filter((b) => {
    if (activeFilter === 'ALL') return true
    return b.status === activeFilter
  })

  const handleConfirmCancel = () => {
    if (!cancellingBooking) return
    appStore.updateBookingStatus(cancellingBooking.id, 'CANCELLED')
    setCancellingBooking(null)
    setAllBookings(appStore.getBookings())
    toast.success(`Đã hủy đơn ${cancellingBooking.bookingCode}. Các khung giờ đã được giải phóng!`)
  }

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Đã xác nhận</span>
          </span>
        )
      case 'HELD':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Chờ thanh toán</span>
          </span>
        )
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Đã hoàn thành
          </span>
        )
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Đã hủy</span>
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">
            Lịch sử đơn đặt sân
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Theo dõi tình trạng đơn đặt, mã check-in và đồng bộ lịch chơi
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer transition-colors"
        >
          Đặt thêm sân mới
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'Tất cả đơn' },
          { key: 'CONFIRMED', label: 'Sắp diễn ra' },
          { key: 'HELD', label: 'Chờ thanh toán' },
          { key: 'COMPLETED', label: 'Đã hoàn thành' },
          { key: 'CANCELLED', label: 'Đã hủy' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeFilter === tab.key
                ? 'bg-[#168039] text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Booking List */}
      {filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Chưa có đơn đặt nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Không tìm thấy đơn đặt nào theo bộ lọc này. Hãy tìm kiếm sân trống để đặt ngay buổi chơi hôm nay!
          </p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.HOME)}
            className="px-4 py-2 rounded-xl bg-[#168039] text-white text-xs font-bold cursor-pointer"
          >
            Tìm sân ngay
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:border-slate-300 transition-all"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                    <img
                      src={order.facilityLogo || 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=80&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{order.facilityName}</h3>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Mã: <strong>{order.bookingCode}</strong> | Ngày tạo: {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {getStatusBadge(order.status)}
                </div>
              </div>

              {/* Slot Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="truncate">{order.facilityAddress}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {order.slots.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <div>
                          <span className="font-bold text-slate-900">{s.courtName}</span>
                          <div className="text-[10px] text-slate-500">
                            {s.date} | {s.startTime} - {s.endTime}
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">{s.price.toLocaleString('vi-VN')} đ</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="text-xs">
                  <span className="text-slate-500">Tổng tiền:</span>{' '}
                  <strong className="text-sm font-black text-[#168039]">
                    {order.totalAmount.toLocaleString('vi-VN')} đ
                  </strong>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                  {order.status === 'HELD' && (
                    <button
                      type="button"
                      onClick={() => navigate(`/checkout/${order.id}`)}
                      className="px-3 py-1.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer transition-colors"
                    >
                      Thanh toán ngay
                    </button>
                  )}

                  {order.status === 'CONFIRMED' && (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(`/booking-success/${order.id}`)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Mã check-in</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCancellingBooking(order)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hủy đơn</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full max-h-[min(90vh,700px)] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Xác nhận hủy đặt sân
              </h3>
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <strong>Chính sách hoàn hủy:</strong> Hủy trước 12 giờ so với giờ chơi được hoàn 100% tiền đặt sân về tài khoản. Sau 12 giờ áp dụng phí hủy 30%.
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Mã đơn đặt sân:</span>
                <strong className="font-mono text-slate-900 text-sm">{cancellingBooking.bookingCode}</strong>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Cơ sở:</span>
                <div className="font-semibold text-slate-900">{cancellingBooking.facilityName}</div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1.5">
                  Lý do hủy đơn:
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-medium cursor-pointer"
                >
                  <option value="Bận lịch cá nhân đột xuất">Bận lịch cá nhân đột xuất</option>
                  <option value="Thời tiết không thuận lợi">Thời tiết không thuận lợi</option>
                  <option value="Muốn đổi sang khung giờ khác">Muốn đổi sang khung giờ khác</option>
                  <option value="Lý do khác">Lý do khác</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 shrink-0 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Giữ lại đơn
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Xác nhận hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
