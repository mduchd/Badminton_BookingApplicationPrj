import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ROUTES } from '../../../app/router'
import { PaymentCheckoutModal } from '../components/PaymentCheckoutModal'
import { bookingApi } from '../services/bookingApi'
import type { BookingStatus } from '../types'

const statusLabels: Record<BookingStatus, string> = {
  HELD: 'Chưa thanh toán',
  PENDING_PAYMENT: 'Đang chờ thanh toán',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Đã hoàn thành',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Đã hết hạn',
}

export function CheckoutView({ userId }: { userId: string }) {
  const [paymentOpen, setPaymentOpen] = useState(true)
  const navigate = useNavigate()
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
      <Link to={ROUTES.BOOKED} className="cursor-pointer text-sm font-semibold text-[#1b7a42] hover:text-[#156335]">
        ← Sân đã đặt
      </Link>
      {booking ? (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h1 className="text-xl font-bold text-slate-900">Đơn #SMC-{booking.id}</h1>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {statusLabels[booking.status]}
            </span>
          </div>

          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-slate-900">
              {booking.facilityName} - {booking.courtName}
            </p>
            <p className="text-slate-600">
              Ngày: {booking.bookingDate} | Giờ: {booking.startTime.slice(0, 5)} - {booking.endTime.slice(0, 5)}
            </p>
            <p className="text-base font-bold text-slate-900">
              Tổng tiền: {booking.totalAmount.toLocaleString('vi-VN')} đ
            </p>
          </div>

          {holding && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              {booking.holdExpiresAt && (
                <p className="text-xs font-medium text-amber-700">
                  Giữ chỗ đến: {new Date(booking.holdExpiresAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                </p>
              )}
              <p className="text-sm font-medium text-slate-700">
                Hoàn tất thanh toán qua payOS để xác nhận đặt sân. Khung giờ chỉ được giữ tạm và sẽ mở lại nếu hết hạn thanh toán.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPaymentOpen(true)}
                  className="cursor-pointer rounded-lg bg-[#1b7a42] px-4 py-2 text-sm font-semibold text-white hover:bg-[#156335]"
                >
                  Thanh toán qua payOS
                </button>
                <button
                  type="button"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate()}
                  className="cursor-pointer rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed"
                >
                  Hủy giữ chỗ
                </button>
              </div>
            </div>
          )}
          {(booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') && (
            <Link to={`/booking-success/${id}`} className="inline-block cursor-pointer text-sm font-semibold text-green-700">
              Xem xác nhận đặt sân
            </Link>
          )}
        </div>
      ) : (
        <p role="status" className="text-sm text-slate-600">
          {isPending && Number.isSafeInteger(id) && id > 0
            ? 'Đang tải đơn đặt sân…'
            : isError
              ? 'Không thể tải đơn đặt sân. Hãy kiểm tra tài khoản hoặc thử lại.'
              : 'Không tìm thấy đơn đặt sân.'}
        </p>
      )}
      <PaymentCheckoutModal
        isOpen={paymentOpen && holding}
        booking={booking ?? null}
        onClose={() => setPaymentOpen(false)}
        onPaymentSuccess={() => {
          client.invalidateQueries({ queryKey: ['booking', userId, id] })
          client.invalidateQueries({ queryKey: ['myBookings'] })
          client.invalidateQueries({ queryKey: ['courtAvailability'] })
          navigate(`/booking-success/${id}`, { replace: true })
        }}
      />
    </main>
  )
}
