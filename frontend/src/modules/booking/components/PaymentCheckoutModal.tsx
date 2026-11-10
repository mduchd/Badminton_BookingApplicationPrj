import { Button } from '../../../components/shared/Button'
import { DialogFrame } from '../../../components/shared/DialogFrame'
import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, ExternalLink, AlertCircle, CheckCircle2, RotateCw } from 'lucide-react'
import { toast } from 'sonner'
import type { BookingResponse } from '../types'
import { createCheckout, getPaymentByBookingId } from '../services/bookingApi'

interface PaymentCheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  booking: BookingResponse | null
  onSuccess?: () => void
  onPaymentSuccess?: () => void
}

export function PaymentCheckoutModal({ isOpen, onClose, booking, onSuccess, onPaymentSuccess }: PaymentCheckoutModalProps) {
  const queryClient = useQueryClient()
  const notifiedBooking = useRef<number | null>(null)
  const checkout = useQuery({
    queryKey: ['checkout-session', booking?.id],
    queryFn: () => createCheckout(booking!.id, {
      paymentMethod: 'PAYOS',
      returnUrl: `${window.location.origin}/payment/success`,
      cancelUrl: `${window.location.origin}/payment/cancel`,
    }),
    enabled: isOpen && !!booking,
    retry: false,
    staleTime: Infinity,
  })
  const payment = useQuery({
    queryKey: ['payment-status', booking?.id],
    queryFn: () => getPaymentByBookingId(booking!.id),
    enabled: isOpen && !!booking && !!checkout.data,
    refetchInterval: (query) => query.state.data?.status === 'SUCCESS' ? false : 3000,
    retry: false,
  })
  const isPaid = payment.data?.status === 'SUCCESS'
  useEffect(() => {
    if (isOpen && isPaid && notifiedBooking.current !== booking?.id) {
      notifiedBooking.current = booking?.id ?? null
      toast.success('Thanh toán thành công! Sân đã được xác nhận.')
      void queryClient.invalidateQueries({ queryKey: ['myBookings'] })
      void queryClient.invalidateQueries({ queryKey: ['courtAvailability'] })
    }
  }, [booking?.id, isOpen, isPaid, queryClient])
  if (!isOpen || !booking) return null
  const rawError = (checkout.error as { response?: { data?: { message?: string } } })?.response?.data?.message
    || (checkout.error as Error)?.message
  const errorMessage = rawError || 'Không thể tạo phiên thanh toán. Vui lòng thử lại sau.'

  return (
    <DialogFrame className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClose={onClose} label="Thanh toán">
      <div
        className="w-full max-w-md max-h-[min(90vh,700px)] flex flex-col rounded-2xl bg-white p-6 shadow-xl"
      >
        {/* Header modal */}
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <h2 id="payment-title" className="text-lg font-bold text-slate-900">
            Thanh toán đơn #{booking.id}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="cursor-pointer rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Thân nội dung cuộn nội bộ */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Số tiền thanh toán</span>
              <span className="text-base font-bold text-slate-900">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.totalAmount)}
              </span>
            </div>
            {booking.holdExpiresAt && (
              <p className="mt-2 text-xs font-medium text-slate-500">
                Giữ chỗ đến: {new Date(booking.holdExpiresAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {isPaid ? (
            <div className="space-y-4 text-center py-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="text-base font-bold text-emerald-800">
                Đã xác nhận thanh toán thành công!
              </p>
              <p className="text-sm text-slate-600">
                Lịch đặt sân của bạn đã được cập nhật trên hệ thống.
              </p>
            </div>
          ) : checkout.isPending ? (
            <div className="space-y-3 text-center py-6">
              <div className="inline-flex h-10 w-10 animate-spin items-center justify-center text-[#1b7a42]">
                <RotateCw className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">Đang khởi tạo cổng thanh toán payOS...</p>
            </div>
          ) : checkout.isError || !checkout.data?.checkoutUrl?.startsWith('https://') ? (
            <div className="space-y-4">
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
                <div className="flex-1 text-sm font-medium">
                  {errorMessage}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => checkout.refetch()}
                  className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RotateCw className="h-4 w-4" />
                  Thử lại
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {checkout.data.qrCode ? (
                <div className="flex flex-col items-center justify-center space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-700">Quét mã QR bằng App Ngân hàng</p>
                  <img
                    src={checkout.data.qrCode}
                    alt="Mã QR thanh toán payOS"
                    className="h-48 w-48 object-contain"
                  />
                  <p className="text-xs text-slate-500">Mã đơn: #{checkout.data.orderCode}</p>
                </div>
              ) : null}

              <p className="text-sm font-medium text-slate-700 leading-relaxed">
                Nhấn nút bên dưới để chuyển tiếp sang cổng thanh toán bảo mật payOS hoặc quét mã QR. Sau khi hoàn tất, hệ thống sẽ tự động xác nhận đặt chỗ.
              </p>

              <a
                className="cursor-pointer flex w-full items-center justify-center gap-2 rounded-lg bg-[#1b7a42] px-4 py-3 text-sm font-semibold text-white hover:bg-[#156335]"
                href={checkout.data.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Mở trang thanh toán payOS</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant={isPaid ? 'primary' : 'secondary'} className="w-full" onClick={() => {
            if (isPaid) { onSuccess?.(); onPaymentSuccess?.() }
            onClose()
          }}>{isPaid ? 'Hoàn tất' : 'Đóng'}</Button>
        </div>
      </div>
    </DialogFrame>
  )
}
