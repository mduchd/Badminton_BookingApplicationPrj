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
  Zap,
} from 'lucide-react'
import { appStore } from '../../../lib/appStore'
import { toast } from 'sonner'
import { ROUTES } from '../../../app/router'

export const CheckoutView: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const booking = appStore.getBookingById(bookingId || '')

  const [paymentMethod, setPaymentMethod] = useState<'PAYOS' | 'ON_SITE' | 'MOCK'>('PAYOS')
  const [timeLeft, setTimeLeft] = useState<number>(600) // 10 minutes default
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (!booking) return

    // Calculate time left based on holdExpiresAt
    const expiresAt = new Date(booking.holdExpiresAt).getTime()
    const updateCountdown = () => {
      const diff = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setTimeLeft(diff)
      if (diff === 0 && booking.status === 'HELD') {
        appStore.updateBookingStatus(booking.id, 'CANCELLED')
        toast.error('Hết thời gian giữ chỗ! Đơn đặt đã bị hủy.')
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
        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className="mt-4 px-4 py-2 rounded-xl bg-[#168039] text-white text-xs font-bold cursor-pointer"
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

  const handleConfirmPayment = (methodToUse: 'PAYOS' | 'ON_SITE' | 'MOCK' = paymentMethod) => {
    setIsProcessing(true)
    setTimeout(() => {
      appStore.updateBookingStatus(booking.id, 'CONFIRMED', methodToUse)
      setIsProcessing(false)
      toast.success('Thanh toán thành công! Sân đã được xác nhận.')
      navigate(`/booking-success/${booking.id}`)
    }, 900)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-6 pb-20">
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
            Thời gian giữ chỗ 10 phút đã hết hạn. Các khung giờ này đã được mở lại cho người khác đặt.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Left Column: Payment Methods & VietQR (3 cols) */}
        <div className="md:col-span-3 space-y-5">
          {/* Payment Method Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-base font-bold text-slate-900">Chọn phương thức thanh toán</h2>

            <div className="space-y-2.5">
              {/* Option 1: payOS QR */}
              <label
                onClick={() => setPaymentMethod('PAYOS')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'PAYOS'
                    ? 'border-[#168039] bg-emerald-50/40'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'PAYOS'}
                  onChange={() => setPaymentMethod('PAYOS')}
                  className="mt-1 text-[#168039] cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      Chuyển khoản QR Napas 24/7 (payOS)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Tự động xác nhận
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Mở app ngân hàng quét mã VietQR, hệ thống nhận diện tức thì qua webhook.
                  </p>
                </div>
              </label>

              {/* Option 2: Mock Payment for Testing */}
              <label
                onClick={() => setPaymentMethod('MOCK')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'MOCK'
                    ? 'border-[#168039] bg-emerald-50/40'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'MOCK'}
                  onChange={() => setPaymentMethod('MOCK')}
                  className="mt-1 text-[#168039] cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">
                      Thanh toán thử nghiệm (Mock Payment)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      Chế độ demo
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Mô phỏng hoàn tất thanh toán ngay lập tức phục vụ demo kiểm thử.
                  </p>
                </div>
              </label>

              {/* Option 3: Pay on site */}
              <label
                onClick={() => setPaymentMethod('ON_SITE')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'ON_SITE'
                    ? 'border-[#168039] bg-emerald-50/40'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={paymentMethod === 'ON_SITE'}
                  onChange={() => setPaymentMethod('ON_SITE')}
                  className="mt-1 text-[#168039] cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-900">Thanh toán tại quầy sân</span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Chủ sân sẽ đối soát và thu tiền khi bạn đến nhận sân.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* QR Code Card if PAYOS or MOCK */}
          {paymentMethod === 'PAYOS' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Mã VietQR chuyển khoản</h3>
                </div>
                <span className="text-xs text-slate-500 font-mono">payOS Engine</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                {/* QR Image */}
                <div className="w-44 h-44 rounded-xl bg-white p-2 border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      `2|99|0988123456|SMASHCOURT|${booking.totalAmount}|0|0|${booking.bookingCode}`
                    )}`}
                    alt="VietQR payOS"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Transfer Info */}
                <div className="space-y-2 text-xs w-full">
                  <div>
                    <span className="text-slate-700 font-semibold block">Ngân hàng thụ hưởng:</span>
                    <strong className="text-slate-900 text-sm">MBBank (Ngân hàng Quân Đội)</strong>
                  </div>
                  <div>
                    <span className="text-slate-700 font-semibold block">Số tài khoản:</span>
                    <div className="flex items-center gap-2">
                      <strong className="font-mono text-sm text-slate-900">0388998877</strong>
                      <button
                        type="button"
                        onClick={() => handleCopy('0388998877', 'Số tài khoản')}
                        className="p-1 text-slate-600 hover:text-emerald-700 cursor-pointer"
                        title="Sao chép"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-700 font-semibold block">Số tiền chính xác:</span>
                    <strong className="text-base text-[#168039] font-black">
                      {booking.totalAmount.toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-700 font-semibold block">Nội dung chuyển khoản (bắt buộc):</span>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 rounded bg-amber-100 text-amber-900 font-mono font-bold text-xs">
                        {booking.bookingCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(booking.bookingCode, 'Nội dung CK')}
                        className="p-1 text-slate-600 hover:text-emerald-700 cursor-pointer"
                        title="Sao chép"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 font-medium text-center">
                Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống tự động xác nhận đơn trong 10-30 giây.
              </p>
            </div>
          )}

          {paymentMethod === 'MOCK' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950">
                <Zap className="w-4 h-4 text-amber-700" />
                <span>Chế độ kiểm thử nhanh (Mock Payment)</span>
              </div>
              <p>
                Phương thức này kích hoạt webhook mock để kiểm tra toàn bộ luồng tạo đơn, gửi thông báo tức thì và tạo sự kiện Google Calendar mà không cần thẻ/tài khoản thật.
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
              <div className="text-[11px] text-slate-500 mt-0.5">{booking.facilityAddress}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500">Các khung giờ chơi:</div>
              {booking.slots.map((s, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-200/80"
                >
                  <div>
                    <strong className="text-slate-900">{s.courtName}</strong>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {s.date} | {s.startTime} - {s.endTime}
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
              onClick={() => handleConfirmPayment()}
              disabled={isProcessing || timeLeft === 0}
              className="w-full py-3.5 px-4 rounded-xl bg-[#168039] hover:bg-[#136c30] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isProcessing ? 'Đang xác nhận...' : 'Xác nhận thanh toán'}</span>
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bảo mật giao dịch tiêu chuẩn payOS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
