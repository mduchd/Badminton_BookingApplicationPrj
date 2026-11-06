import { useState, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, CreditCard, CheckCircle2 } from 'lucide-react'
import type { CourtResult } from '../../types/user'
import { formatPrice } from '../../../lib/utils'

interface BookingConfirmModalProps {
  isOpen: boolean
  court: CourtResult | null
  onClose: () => void
  onConfirmBooking: (court: CourtResult) => void
}

export const BookingConfirmModal: React.FC<BookingConfirmModalProps> = ({
  isOpen,
  court,
  onClose,
  onConfirmBooking,
}) => {
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes hold
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setTimeLeft(600)
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [isOpen])

  if (!isOpen || !court) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`

  const handlePay = () => {
    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      onConfirmBooking(court)
      onClose()
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-7 pb-5 bg-[#1b7a42] text-white">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black">Xác nhận thông tin đặt sân</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-emerald-100 text-xs sm:text-sm mt-2 font-medium">
            Sân được giữ chỗ tạm thời trong vòng{' '}
            <strong className="text-amber-300 font-mono text-base font-black underline">{timeFormatted}</strong>. Sau thời gian này slot sẽ tự động giải phóng.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-7 space-y-5">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
            <div>
              <p className="text-xs font-bold text-[#1b7a42] uppercase tracking-wider">{court.facilityName}</p>
              <h3 className="text-lg font-black text-slate-900 mt-0.5">{court.courtName}</h3>
              <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-1.5 mt-1 font-medium">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{court.address}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-sm">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-[#1b7a42]" />
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Khung giờ</span>
                  <span className="font-black text-slate-900">{court.startTime} – {court.endTime}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-[#1b7a42]" />
                <div>
                  <span className="text-xs text-slate-500 font-medium block">Thời lượng</span>
                  <span className="font-black text-slate-900">{court.durationHours} tiếng</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Đơn giá giờ chơi:</span>
              <span className="font-semibold">{formatPrice(court.pricePerHour)} / giờ</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Thời gian thuê:</span>
              <span className="font-semibold">{court.durationHours} giờ</span>
            </div>
            <div className="flex justify-between text-slate-600 font-medium">
              <span>Phí dịch vụ & tiện ích:</span>
              <span className="text-[#1b7a42] font-bold">Miễn phí</span>
            </div>
            <div className="flex justify-between text-base sm:text-lg font-black text-slate-900 pt-3 border-t border-slate-200">
              <span>Tổng thanh toán:</span>
              <span className="text-[#1b7a42]">{formatPrice(court.calculatedTotalPrice)}</span>
            </div>
          </div>

          {/* Payment Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-slate-900">
              <CreditCard className="w-4 h-4 text-[#1b7a42]" />
              <span>Thanh toán an toàn qua payOS:</span>
            </p>
            <p className="text-slate-500 font-medium leading-relaxed">
              Sau khi xác nhận, hệ thống sẽ mở cổng thanh toán payOS. Đơn đặt sân sẽ được xác nhận ngay sau khi hoàn tất thanh toán.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handlePay}
              className="flex-2 py-3 rounded-xl bg-[#1b7a42] hover:bg-[#156335] disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <span>Đang xử lý thanh toán payOS...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Xác nhận & Thanh toán payOS</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
