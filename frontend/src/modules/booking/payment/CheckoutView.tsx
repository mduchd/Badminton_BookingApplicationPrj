import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../app/router'

// Legacy checkout used local-only bookings and could falsely report payment success.
export function CheckoutView() {
  const navigate = useNavigate()
  return <div className="mx-auto max-w-xl p-6 text-center">
    <h2 className="text-lg font-bold text-slate-900">Thanh toán đặt sân</h2>
    <p className="mt-3 text-sm text-slate-600">Vui lòng mở đơn đặt trong mục lịch đặt của bạn để thanh toán qua payOS.</p>
    <button type="button" onClick={() => navigate(ROUTES.HOME)} className="mt-5 rounded-lg bg-green-700 px-4 py-2 text-white">Về trang chủ</button>
  </div>
}
