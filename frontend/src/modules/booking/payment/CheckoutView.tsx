import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ROUTES } from '../../../app/router'
import { PaymentCheckoutModal } from '../components/PaymentCheckoutModal'
import { bookingApi } from '../services/bookingApi'
import type { BookingStatus } from '../types'

const statusLabels: Record<BookingStatus, string> = {
  HELD: 'Đang giữ chỗ',
  PENDING_PAYMENT: 'Đang chờ thanh toán',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Đã hết hạn',
}

export function CheckoutView({ userId }: { userId: string }) {
  const [paymentOpen, setPaymentOpen] = useState(false)
  const { bookingId } = useParams()
  const id = Number(bookingId)
  const client = useQueryClient()
  const { data: booking, isPending, isError } = useQuery({
    queryKey: ['booking', userId, id],
    queryFn: () => bookingApi.getBookingById(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    retry: false,
    refetchInterval: 15_000,
  })
  const cancel = useMutation({
    mutationFn: () => bookingApi.cancelBooking(id),
    onSuccess: (updated) => {
      client.setQueryData(['booking', userId, id], updated)
      client.invalidateQueries({ queryKey: ['myBookings'] })
      client.invalidateQueries({ queryKey: ['courtAvailability'] })
      toast.success('Đã hủy đơn và giải phóng khung giờ.')
    },
    onError: () => toast.error('Không thể hủy đơn. Vui lòng thử lại.'),
  })
  const holding = booking?.status === 'HELD' || booking?.status === 'PENDING_PAYMENT'

  return (
    <main className="mx-auto max-w-2xl space-y-4 p-5">
      <Link to={ROUTES.BOOKED} className="text-sm font-semibold text-green-700">← Sân đã đặt</Link>
      {booking ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <h1 className="text-xl font-bold">Đơn #SMC-{booking.id}</h1>
          <p>{booking.facilityName} - {booking.courtName}</p>
          <p>{booking.bookingDate} - {booking.startTime.slice(0, 5)} – {booking.endTime.slice(0, 5)}</p>
          <p className="font-semibold">{booking.totalAmount.toLocaleString('vi-VN')} đ - {statusLabels[booking.status]}</p>
          {holding && (
            <>
              {booking.holdExpiresAt && (
                <p>Giữ chỗ đến {new Date(booking.holdExpiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}.</p>
              )}
              <p className="text-sm text-slate-700">Thanh toán qua payOS hoặc liên hệ chủ sân để được hướng dẫn.</p>
              <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => setPaymentOpen(true)} className="mr-4 rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white cursor-pointer">
                Thanh toán qua payOS
              </button>
              <Link to={`/courts/${booking.facilityId}`} className="mr-4 text-sm font-semibold text-green-700">Thông tin liên hệ</Link>
              <button type="button" disabled={cancel.isPending} onClick={() => cancel.mutate()} className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 cursor-pointer">
                Hủy giữ chỗ
              </button></div>
            </>
          )}
        </div>
      ) : (
        <p role="status" className="text-sm text-slate-600">
          {isPending && Number.isSafeInteger(id) && id > 0
            ? 'Đang tải đơn đặt sân…'
            : isError ? 'Không thể tải đơn đặt sân. Hãy kiểm tra tài khoản hoặc thử lại.' : 'Không tìm thấy đơn đặt sân.'}
        </p>
      )}
      <PaymentCheckoutModal
        isOpen={paymentOpen}
        booking={booking ?? null}
        onClose={() => setPaymentOpen(false)}
        onPaymentSuccess={() => {
          client.invalidateQueries({ queryKey: ['booking', userId, id] })
          client.invalidateQueries({ queryKey: ['myBookings'] })
          client.invalidateQueries({ queryKey: ['courtAvailability'] })
        }}
      />
    </main>
  )
}
