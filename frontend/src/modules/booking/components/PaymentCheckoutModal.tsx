import { Button } from '../../../components/shared/Button'
import { DialogFrame } from '../../../components/shared/DialogFrame'
import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
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
    queryFn: () => createCheckout(booking!.id, { paymentMethod: 'PAYOS' }),
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
  return (
    <DialogFrame className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClose={onClose} label="Thanh toán">
      <div className="flex w-full max-w-md max-h-[min(90vh,700px)] flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 p-5">
          <h2 id="payment-title" className="text-lg font-bold text-slate-900">Thanh toán đơn #{booking.id}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2 cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm text-slate-700">Số tiền: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.totalAmount)}</p>
          {isPaid ? <p role="status" className="mt-5 text-green-700">Đã xác nhận thanh toán.</p>
          : checkout.isPending ? <p className="mt-5 text-sm text-slate-600">Đang tạo phiên thanh toán...</p>
          : checkout.isError || !checkout.data?.checkoutUrl?.startsWith('https://') ? <div className="mt-5 space-y-4"><p role="alert" className="text-sm text-red-700">Không thể tạo phiên thanh toán. Bạn có thể thử lại hoặc liên hệ chủ sân trong trang đơn.</p><button type="button" onClick={() => void checkout.refetch()} className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold">Thử lại</button></div>
          : <div className="mt-5 space-y-4"><p className="text-sm text-slate-600">Mở trang payOS để thanh toán. Trạng thái đơn sẽ cập nhật sau khi thanh toán được xác nhận.</p><a className="inline-block cursor-pointer rounded-lg bg-green-700 px-4 py-3 text-sm font-semibold text-white" href={checkout.data.checkoutUrl} target="_blank" rel="noopener noreferrer">Mở trang thanh toán payOS</a></div>}
        </div>
        <div className="shrink-0 border-t border-slate-200 p-5">
          <Button variant={isPaid ? 'primary' : 'secondary'} className="w-full" onClick={() => {
            if (isPaid) { onSuccess?.(); onPaymentSuccess?.() }
            onClose()
          }}>{isPaid ? 'Hoàn tất' : 'Đóng'}</Button>
        </div>
      </div>
    </DialogFrame>
  )
}
