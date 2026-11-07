import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Clock,
  QrCode,
  Copy,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Building2,
} from 'lucide-react'
import { appStore } from '../../../lib/appStore'
import { toast } from 'sonner'
import { ROUTES } from '../../../app/router'

export const CheckoutView: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const booking = appStore.getBookingById(bookingId || '')

  const [paymentMethod, setPaymentMethod] = useState<'PAYOS' | 'ON_SITE'>('PAYOS')
  const [timeLeft, setTimeLeft] = useState<number>(600) // 10 minutes default
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!booking) return

    const expiresAt = new Date(booking.holdExpiresAt).getTime()
    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setTimeLeft(diff)
      if (diff === 0 && booking.status === 'HELD') {
        appStore.updateBookingStatus(booking.id, 'CANCELLED')
        toast.error('Hết thời gian giữ chỗ! Đơn đặt sân đã bị hủy.')
      }
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [booking])

  if (!booking) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Không tìm thấy thông tin đơn đặt</h2>
        <p className="text-sm text-slate-600 mb-4">Đơn đặt có thể đã hết hạn hoặc không tồn tại.</p>
        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className="px-4 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold transition-colors cursor-pointer"
        >
          Quay lại trang chủ
        </button>
      </div>
    )
  }

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`Đã sao chép ${label}`)
  }

  const handleConfirmPayment = () => {
    setIsProcessing(true)
    setTimeout(() => {
      appStore.updateBookingStatus(booking.id, 'CONFIRMED', paymentMethod)
      setIsProcessing(false)
      toast.success('Thanh toán thành công! Sân đã được xác nhận.')
      navigate(`/booking-success/${booking.id}`)
    }, 700)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-6 pb-20 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" />
          <span>Quay lại</span>
        </button>

        {/* Hold Countdown Banner */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
          <Clock className="w-4 h-4 text-amber-700" />
          <span>Thời gian giữ chỗ:</span>
          <span className="font-mono text-sm text-amber-800">{formatCountdown(timeLeft)}</span>
        </div>
      </div>

      {timeLeft === 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>
            Thời gian giữ chỗ 10 phút đã hết hạn. Khung giờ này đã được giải phóng cho khách khác.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left Column: Payment Methods (3 cols) */}
        <div className="md:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Phương thức thanh toán</h2>

            {/* Method Tabs */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('PAYOS')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'PAYOS'
                    ? 'border-[#168039] bg-emerald-50/40 text-emerald-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <QrCode className="w-4 h-4 text-[#168039]" />
                  <span>Quét mã QR VietQR</span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-1">
                  Chuyển khoản 24/7 tự động
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('ON_SITE')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  paymentMethod === 'ON_SITE'
                    ? 'border-[#168039] bg-emerald-50/40 text-emerald-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Building2 className="w-4 h-4 text-[#168039]" />
                  <span>Tại quầy sân</span>
                </div>
                <div className="text-[11px] text-slate-600 font-medium mt-1">
                  Tiền mặt hoặc POS khi đến
                </div>
              </button>
            </div>
          </div>

          {/* VietQR Bank Info Box */}
          {paymentMethod === 'PAYOS' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="text-center space-y-2">
                <span className="text-xs font-bold text-slate-700">Mã QR thanh toán đơn đặt sân</span>
                <div className="inline-block p-3 rounded-2xl bg-white border border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=SMASHCOURT_${booking.bookingCode}_${booking.totalAmount}`}
                    alt="VietQR Code"
                    className="w-44 h-44 object-contain mx-auto"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Mở ứng dụng ngân hàng bất kỳ để quét mã QR</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Ngân hàng:</span>
                  <span className="font-bold text-slate-900">MB Bank (Quân Đội)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Số tài khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-900">0988234567</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('0988234567', 'Số tài khoản')}
                      className="p-1 text-slate-500 hover:text-emerald-700 cursor-pointer"
                      title="Sao chép"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Chủ tài khoản:</span>
                  <span className="font-bold text-slate-900">SMASHCOURT VIETNAM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Nội dung CK:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-[#168039]">{booking.bookingCode}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(booking.bookingCode, 'Nội dung CK')}
                      className="p-1 text-slate-500 hover:text-emerald-700 cursor-pointer"
                      title="Sao chép"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center font-medium">
                Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động xác nhận đơn nhanh chóng.
              </p>
            </div>
          )}

          {paymentMethod === 'ON_SITE' && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Building2 className="w-4 h-4 text-[#168039]" />
                <span>Thanh toán trực tiếp tại quầy tiếp tân</span>
              </div>
              <p className="font-medium text-slate-600 leading-relaxed">
                Khung giờ đặt sân của bạn sẽ được giữ chỗ. Vui lòng có mặt trước giờ chơi 15 phút tại quầy lễ tân cụm sân để xuất trình mã đơn và hoàn tất thanh toán.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Order Summary & Action (2 cols) */}
        <div className="md:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Chi tiết đơn đặt</h3>

            <div className="border-b border-slate-100 pb-3">
              <div className="text-xs font-bold text-slate-900">{booking.facilityName}</div>
              <div className="text-[11px] text-slate-600 font-medium mt-0.5">{booking.facilityAddress}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-600">Các khung giờ chơi:</div>
              {booking.slots.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-200/80"
                >
                  <div>
                    <strong className="text-slate-900">{s.courtName}</strong>
                    <div className="text-[11px] text-slate-600 font-medium">
                      {s.date} - {s.startTime} đến {s.endTime}
                    </div>
                  </div>
                  <span className="font-bold text-slate-900">{s.price.toLocaleString('vi-VN')} đ</span>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Mã đơn:</span>
                <span className="font-mono font-bold text-slate-900">{booking.bookingCode}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Khách hàng:</span>
                <span className="font-medium text-slate-900">{booking.customerName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Số điện thoại:</span>
                <span className="font-medium text-slate-900">{booking.customerPhone}</span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Tổng thanh toán:</span>
              <span className="text-xl font-black text-[#168039]">
                {booking.totalAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isProcessing || timeLeft === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-[#168039] hover:bg-[#136c30] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isProcessing ? 'Đang xác nhận...' : 'Xác nhận thanh toán'}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bảo mật giao dịch tiêu chuẩn SmashCourt</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
