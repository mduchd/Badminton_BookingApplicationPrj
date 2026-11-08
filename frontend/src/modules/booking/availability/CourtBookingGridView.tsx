import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { CalendarDays, Phone } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router'
import { courtApi } from '../../court/services/courtApi'
import type { Facility } from '../../types/court'
import { bookingApi } from '../services/bookingApi'
import type { TimeSlot } from '../types'

interface CourtBookingGridViewProps {
  onBook: (court: {
    courtId: number
    courtName: string
    facilityName: string
    facilityAddress?: string
    initialDate: string
    initialSlot: TimeSlot
  }) => void
}

function localDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function BookingGrid({ facility, onBook }: { facility: Facility; onBook: CourtBookingGridViewProps['onBook'] }) {
  const [date, setDate] = useState(() => localDate(new Date()))
  const courts = facility.status === 'active'
    ? facility.subCourts.filter((court) => court.status === 'active' && /^\d+$/.test(court.id) && Number.isSafeInteger(Number(court.id)) && Number(court.id) > 0)
    : []
  const availability = useQueries({
    queries: courts.map((court) => ({
      queryKey: ['courtAvailability', Number(court.id), date],
      queryFn: () => bookingApi.getCourtAvailability(Number(court.id), date),
      retry: false,
    })),
  })
  const times = useMemo(() => Array.from(new Set(availability.flatMap((result) =>
    (result.data?.slots ?? []).map((slot) => slot.startTime)
  ))).sort(), [availability])
  const phone = facility.phone?.trim()
  const dialablePhone = phone && /^[+\d\s().-]{7,30}$/.test(phone) ? phone.replace(/[^\d+]/g, '') : ''
  const today = localDate(new Date())

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <Link to={`/courts/${facility.id}`} className="text-sm font-semibold text-green-700">← Về chi tiết cụm sân</Link>
      <header>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{facility.name}</h1>
        <p className="mt-1 text-sm text-slate-600">{facility.normalizedAddress || facility.address}</p>
      </header>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="booking-title">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 id="booking-title" className="text-lg font-bold text-slate-900">Lịch đặt sân</h2>
            <p className="mt-1 text-sm text-slate-600">Chọn ngày và khung giờ để xem thông tin đặt sân.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <CalendarDays className="h-5 w-5 text-green-700" aria-hidden="true" />
            <span>Ngày chơi</span>
            <input type="date" value={date} min={today} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
          </label>
        </div>
        {courts.length === 0 ? (
          <div className="py-10 text-center">
            <h3 className="text-base font-semibold text-slate-900">Chưa có lịch đặt trực tuyến</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">Cụm sân chưa cung cấp danh sách sân và lịch trống. Vui lòng liên hệ trực tiếp để hỏi giờ và đặt sân.</p>
            {dialablePhone ? <a href={`tel:${dialablePhone}`} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800"><Phone className="h-4 w-4" />Gọi {phone}</a> : <p className="mt-4 text-sm text-slate-600">Chưa có số điện thoại liên hệ.</p>}
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-slate-600">Chọn ô giờ còn trống để tiếp tục. Lịch và giá được lấy từ hệ thống.</p>
            {availability.some((result) => result.isPending) && <p className="py-6 text-sm text-slate-600" role="status">Đang tải lịch sân…</p>}
            {availability.some((result) => result.isError) && <p className="mt-4 text-sm text-red-700" role="alert">Không tải được lịch của một hoặc nhiều sân. Vui lòng tải lại trang.</p>}
            {!availability.some((result) => result.isPending) && times.length === 0 && !availability.some((result) => result.isError) && <p className="py-6 text-sm text-slate-600">Không có lịch sân cho ngày này.</p>}
            {times.length > 0 && <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-sm">
                <thead><tr><th scope="col" className="border-b border-slate-200 p-3 text-left text-slate-600">Giờ</th>{courts.map((court) => <th key={court.id} scope="col" className="border-b border-slate-200 p-3 text-left text-slate-900">{court.name}</th>)}</tr></thead>
                <tbody>{times.map((time) => <tr key={time}>
                  <th scope="row" className="border-b border-slate-100 p-3 text-left font-medium text-slate-700">{time.slice(0, 5)}</th>
                  {courts.map((court, index) => {
                    const slot = availability[index].data?.slots.find((item) => item.startTime === time)
                    const expired = date === today && new Date(`${date}T${time}+07:00`).getTime() <= Date.now()
                    const available = slot?.available && !expired
                    return <td key={court.id} className="border-b border-slate-100 p-2">
                      {slot ? <button type="button" disabled={!available} onClick={() => onBook({ courtId: Number(court.id), courtName: court.name, facilityName: facility.name, facilityAddress: facility.normalizedAddress || facility.address, initialDate: date, initialSlot: slot })} className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold ${available ? 'border-green-300 bg-green-50 text-green-800 hover:bg-green-100' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500'}`}>
                        {time.slice(0, 5)}–{slot.endTime.slice(0, 5)}<br />{available ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(slot.price) : expired ? 'Đã qua' : slot.reason || 'Không khả dụng'}
                      </button> : <span className="text-slate-400">—</span>}
                    </td>
                  })}
                </tr>)}</tbody>
              </table>
            </div>}
          </>
        )}
      </section>
    </main>
  )
}

export function CourtBookingGridView({ onBook }: CourtBookingGridViewProps) {
  const { id = '' } = useParams<{ id: string }>()
  const { data, isPending, isError } = useQuery({ queryKey: ['facilityBooking', id], queryFn: () => courtApi.getFacilityDetail(id), retry: false })
  if (isPending) return <p className="p-6 text-center text-slate-600" role="status">Đang tải danh sách sân…</p>
  if (isError) return <div className="space-y-3 p-6 text-center"><p role="alert">Không thể tải thông tin cụm sân.</p><Link to={ROUTES.HOME} className="text-green-700 underline">Về trang chủ</Link></div>
  return <BookingGrid key={id} facility={data.facility} onBook={onBook} />
}
