import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  Calendar,
  Download,
  MapPin,
  Clock,
  ArrowRight,
  Home,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { bookingApi } from '../services/bookingApi'
import { toast } from 'sonner'
import { ROUTES } from '../../../app/router'

export const BookingSuccessView: React.FC<{ userId: string }> = ({ userId }) => {
  const { bookingId } = useParams<{ bookingId: string }>()
  const navigate = useNavigate()
  const id = Number(bookingId)
  const { data, isPending } = useQuery({
    queryKey: ['booking', userId, id],
    queryFn: () => bookingApi.getBookingById(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    retry: false,
  })
  const booking = data && (data.status === 'CONFIRMED' || data.status === 'COMPLETED') ? {
    ...data,
    bookingCode: `SMC-${data.id}`,
    facilityAddress: data.facilityName,
    slots: [{
      courtName: data.courtName,
      date: data.bookingDate,
      startTime: data.startTime.slice(0, 5),
      endTime: data.endTime.slice(0, 5),
      price: data.totalAmount,
    }],
  } : undefined

  if (!booking) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">{isPending && Number.isSafeInteger(id) && id > 0 ? 'Đang tải đơn đặt sân…' : 'Chưa có biên nhận xác nhận cho đơn này'}</h2>
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

  const primarySlot = booking.slots[0]

  // Construct Google Calendar Link
  const handleAddToGoogleCalendar = () => {
    if (!primarySlot) return
    // e.g. 2026-11-07 and 19:00 -> 20261107T120000Z (UTC)
    const dateClean = primarySlot.date.replace(/-/g, '')
    const startHour = primarySlot.startTime.replace(':', '') + '00'
    const lastSlot = booking.slots[booking.slots.length - 1]
    const endHour = lastSlot.endTime.replace(':', '') + '00'

    const title = encodeURIComponent(`Lịch chơi cầu lông tại ${booking.facilityName}`)
    const details = encodeURIComponent(
      `Đơn đặt sân SmashCourt: ${booking.bookingCode}\nSân: ${booking.slots.map((s) => s.courtName).join(', ')}`
    )
    const location = encodeURIComponent(booking.facilityAddress)
    const dates = `${dateClean}T${startHour}/${dateClean}T${endHour}`

    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`
    window.open(gcalUrl, '_blank')
    toast.success('Đang mở Google Calendar để lưu sự kiện')
  }

  // Generate and download .ics file
  const handleDownloadIcs = () => {
    if (!primarySlot) return
    const lastSlot = booking.slots[booking.slots.length - 1]
    const icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SmashCourt//Badminton Booking//VI',
      'BEGIN:VEVENT',
      `UID:${booking.bookingCode}@smashcourt.vn`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${primarySlot.date.replace(/-/g, '')}T${primarySlot.startTime.replace(':', '')}00`,
      `DTEND:${primarySlot.date.replace(/-/g, '')}T${lastSlot.endTime.replace(':', '')}00`,
      `SUMMARY:Chơi cầu lông tại ${booking.facilityName}`,
      `DESCRIPTION:Mã đặt sân: ${booking.bookingCode} - ${booking.slots.map((s) => s.courtName).join(', ')}`,
      `LOCATION:${booking.facilityAddress}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `smashcourt-${booking.bookingCode}.ics`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Đã tải file lịch .ics thành công')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-24">
      {/* Success Badge & Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-3">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />

        <h1 className="text-xl sm:text-2xl font-black text-slate-900">
          Đặt sân thành công!
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          Đơn đặt của bạn đã được xác nhận. Chúng tôi đã gửi thông báo xác nhận và chi tiết đơn đặt qua hệ thống.
        </p>

        {/* Booking Code Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <span>Mã đơn:</span>
          <span className="font-mono font-bold text-slate-900 text-sm">{booking.bookingCode}</span>
        </div>
      </div>

      {/* Ticket Card Details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">{booking.facilityName}</h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>{booking.facilityAddress}</span>
            </div>
          </div>

          {/* QR Code for Check-in */}
          <div className="w-20 h-20 rounded-xl bg-white p-1 border border-slate-200 flex flex-col items-center justify-center flex-shrink-0">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                booking.bookingCode
              )}`}
              alt="QR Check-in"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          <span className="text-xs font-semibold text-slate-500 block">Danh sách khung giờ:</span>
          {booking.slots.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-emerald-600" />
                <div>
                  <strong className="text-slate-900">{s.courtName}</strong>
                  <div className="text-[11px] text-slate-500">
                    {s.date} | {s.startTime} - {s.endTime}
                  </div>
                </div>
              </div>
              <span className="font-bold text-[#168039]">{s.price.toLocaleString('vi-VN')} đ</span>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs sm:text-sm">
          <span className="text-slate-600 font-medium">Tổng tiền đã thanh toán:</span>
          <span className="text-lg font-black text-[#168039]">
            {booking.totalAmount.toLocaleString('vi-VN')} đ
          </span>
        </div>
      </div>

      {/* Google Calendar & Sync Action Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Đồng bộ lịch cá nhân</h3>
        </div>
        <p className="text-xs text-slate-600">
          Thêm buổi chơi vào Google Calendar để nhận thông báo nhắc trước giờ ra sân.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleAddToGoogleCalendar}
            className="py-2.5 px-4 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Thêm vào Google Calendar</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadIcs}
            className="py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Tải file lịch (.ics)</span>
          </button>
        </div>
      </div>

      {/* Bottom Nav Action Links */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate(ROUTES.BOOKED)}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <span>Xem lịch sử đơn đặt</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => navigate(ROUTES.HOME)}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Về trang chủ</span>
        </button>
      </div>
    </div>
  )
}
