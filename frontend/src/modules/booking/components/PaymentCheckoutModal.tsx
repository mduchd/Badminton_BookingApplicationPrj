import { useEffect, useState } from 'react'
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
  const [isPaid, setIsPaid] = useState(false)
  useEffect(() => { setIsPaid(false) }, [booking?.id, isOpen])
  const checkout = useQuery({
    queryKey: ['checkout-session', booking?.id],
    queryFn: () => createCheckout(booking!.id, { paymentMethod: 'PAYOS' }),
    enabled: isOpen && !!booking && !isPaid,
    retry: false,
    staleTime: Infinity,
  })
  const payment = useQuery({
    queryKey: ['payment-status', booking?.id],
    queryFn: () => getPaymentByBookingId(booking!.id),
    enabled: isOpen && !!booking && !!checkout.data && !isPaid,
    refetchInterval: 3000,
    retry: false,
  })
  useEffect(() => {
    if (payment.data?.status === 'SUCCESS' && !isPaid) {
      setIsPaid(true)
      toast.success('Thanh toán thành công! Sân đã được xác nhận.')
      void queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
      void queryClient.invalidateQueries({ queryKey: ['availability'] })
    }
  }, [payment.data, isPaid, queryClient])
  if (!isOpen || !booking) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="payment-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <h2 id="payment-title" className="text-lg font-bold text-slate-900">Thanh toán đơn #{booking.id}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg p-2"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-4 text-sm text-slate-700">Số tiền: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(booking.totalAmount)}</p>
        {isPaid ? <div className="mt-5 space-y-4"><p className="text-green-700">Đã xác nhận thanh toán.</p><button type="button" className="rounded-lg bg-green-700 px-4 py-2 text-white" onClick={() => { onSuccess?.(); onPaymentSuccess?.(); onClose() }}>Hoàn tất</button></div>
          : checkout.isPending ? <p className="mt-5 text-sm text-slate-600">Đang tạo phiên thanh toán...</p>
          : checkout.isError || !checkout.data?.checkoutUrl?.startsWith('https://') ? <p role="alert" className="mt-5 text-sm text-red-700">Không thể tạo phiên thanh toán. Vui lòng thử lại sau.</p>
          : <div className="mt-5 space-y-4"><p className="text-sm text-slate-600">Mở trang payOS để thanh toán. Trạng thái đơn sẽ cập nhật sau khi thanh toán được xác nhận.</p><a className="inline-block rounded-lg bg-green-700 px-4 py-3 text-sm font-semibold text-white" href={checkout.data.checkoutUrl} target="_blank" rel="noopener noreferrer">Mở trang thanh toán payOS</a></div>}
      </div>
    </div>
  )
}
