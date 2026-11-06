import { useState, useEffect } from 'react'
import { X, Calendar, Clock, MapPin, CreditCard, CheckCircle2 } from 'lucide-react'
import type { CourtResult, User } from '../../types/user'
import { formatPrice } from '../../../lib/utils'
import { toast } from 'sonner'

interface BookingConfirmModalProps {
  isOpen: boolean
  court: CourtResult | null
  currentUser?: User | null
  onOpenAuth?: (tab?: 'login' | 'register') => void
  onClose: () => void
  onConfirmBooking: (court: CourtResult) => void
}

export const BookingConfirmModal: React.FC<BookingConfirmModalProps> = ({
  isOpen,
  court,
  currentUser = null,
  onOpenAuth,
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
    // Guest check: If not logged in, prompt Auth modal
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để tiến hành đặt sân & thanh toán!', {
        description: 'Đăng nhập giúp bạn nhận mã xác nhận và quản lý lịch chơi.',
      })
      onOpenAuth?.('login')
      return
    }

    setIsProcessing(true)
    setTimeout(() => {
      setIsProcessing(false)
      onConfirmBooking(court)
      onClose()
    }, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overlay-enter">
      <div className="relative w-full max-w-lg max-h-[min(92vh,680px)] flex flex-col bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden modal-enter">
        {/* Header - Cố định ở trên, không bị tràn */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200/80 text-[#1b7a42] flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-[#1b7a42]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Xác nhận thông tin đặt sân
              </h2>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                Vui lòng kiểm tra lại thông tin chi tiết trước khi thanh toán
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Cho phép cuộn mượt mà nếu màn hình thấp, không bao giờ vỡ layout */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
          {/* Dải thông báo giữ chỗ thanh lịch (Alert Banner nhẹ nhàng) */}
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200/90 text-xs text-amber-900">
            <div className="flex items-center gap-2 font-medium">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Thời gian giữ chỗ tạm thời:</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono font-black text-xs sm:text-sm text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-lg border border-amber-300">
              <span>{timeFormatted}</span>
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div>
              <p className="text-xs font-bold text-[#1b7a42]">{court.facilityName}</p>
              <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{court.courtName}</h3>
              <p className="text-xs sm:text-sm text-slate-700 flex items-center gap-1.5 mt-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span className="line-clamp-1">{court.address}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-200/80 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1b7a42]" />
                <div>
                  <span className="text-[11px] text-slate-600 font-semibold block leading-tight">Khung giờ</span>
                  <span className="font-black text-slate-900">{court.startTime} – {court.endTime}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1b7a42]" />
                <div>
                  <span className="text-[11px] text-slate-600 font-semibold block leading-tight">Thời lượng</span>
                  <span className="font-black text-slate-900">{court.durationHours} tiếng</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-1.5 text-xs sm:text-sm px-1">
            <div className="flex justify-between text-slate-700 font-medium">
              <span>Đơn giá giờ chơi:</span>
              <span className="font-semibold text-slate-900">{formatPrice(court.pricePerHour)} / giờ</span>
            </div>
            <div className="flex justify-between text-slate-700 font-medium">
              <span>Thời gian thuê:</span>
              <span className="font-semibold text-slate-900">{court.durationHours} giờ</span>
            </div>
            <div className="flex justify-between text-slate-700 font-medium">
              <span>Phí dịch vụ & tiện ích:</span>
              <span className="text-[#1b7a42] font-bold">Miễn phí</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base font-black text-slate-900 pt-2 border-t border-slate-200">
              <span>Tổng thanh toán:</span>
              <span className="text-[#1b7a42] text-lg sm:text-xl font-black">{formatPrice(court.calculatedTotalPrice)}</span>
            </div>
          </div>

          {/* Payment Notice & Guest Status Warning */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-slate-900">
              <CreditCard className="w-4 h-4 text-[#1b7a42]" />
              <span>Thanh toán an toàn qua payOS:</span>
            </p>
            <p className="text-slate-600 font-medium leading-relaxed">
              Sau khi xác nhận, hệ thống sẽ mở cổng thanh toán payOS. Đơn đặt sân sẽ được xác nhận ngay sau khi hoàn tất thanh toán.
            </p>
          </div>

          {!currentUser && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-center justify-between gap-2">
              <span className="flex-1">
                Bạn đang xem ở trạng thái <strong className="font-black">Khách</strong>. Vui lòng đăng nhập để hoàn tất đơn đặt.
              </span>
              <button
                type="button"
                onClick={() => onOpenAuth?.('login')}
                className="px-2.5 py-1 rounded-lg bg-[#1b7a42] text-white font-bold text-[11px] shrink-0 cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons Footer - Cố định ở đáy, không bao giờ bị khuất */}
        <div className="p-3.5 sm:px-6 sm:py-3.5 border-t border-slate-100 bg-white flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 sm:py-3 rounded-xl border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-98 text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePay}
            className="flex-2 py-2.5 sm:py-3 rounded-xl bg-[#1b7a42] hover:bg-[#156335] active:scale-98 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <span>Đang xử lý thanh toán payOS...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{currentUser ? 'Xác nhận & Thanh toán payOS' : 'Xác nhận & Đăng nhập thanh toán'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
