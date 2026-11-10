import { useNow } from '../../../hooks/useNow'
import { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronLeft, ChevronRight, Check, LogIn, Clock, Calendar, DollarSign, X } from 'lucide-react'
import { toast } from 'sonner'
import { courtApi } from '../../court/services/courtApi'
import { bookingApi } from '../services/bookingApi'
import type { TimeSlot } from '../types'
import type { Facility, PriceRule } from '../../types/court'
import type { BookingSlot } from '../../types/booking'
import type { User } from '../../types/user'
import { isSlotInRange, selectTimeRange } from '../timeRangeSelection'
import { ROUTES } from '../../../app/router'

const DEFAULT_TIMES = Array.from({ length: 36 }, (_, i) => {
  const minutes = 330 + i * 30
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})
interface CourtBookingGridViewProps {
  currentUser?: User | null
  onOpenAuth: (tab?: 'login' | 'register') => void
  onBook: (court: { courtId: number; courtName: string; facilityName: string; facilityAddress?: string; initialDate: string; initialSlot: TimeSlot }) => void
}
function dateKey(d: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}
export function CourtBookingGridView(props: CourtBookingGridViewProps) {
  const { id = '' } = useParams<{ id: string }>()
  const { data, isPending, isError } = useQuery({ queryKey: ['facilityBooking', id], queryFn: () => courtApi.getFacilityDetail(id), retry: false })
  if (isPending) return <p className="p-6 text-center text-slate-600" role="status">Đang tải thông tin sân…</p>
  if (isError) return <div className="space-y-3 p-6 text-center"><p role="alert">Không thể tải thông tin cụm sân.</p><Link to={ROUTES.HOME} className="text-green-700 underline">Về trang chủ</Link></div>
  return <BookingGrid key={id} {...props} facility={data.facility} priceRules={data.priceRules} />
}
function BookingGrid({ facility, priceRules, currentUser = null, onOpenAuth, onBook }: CourtBookingGridViewProps & { facility: Facility; priceRules: PriceRule[] }) {
  const navigate = useNavigate()
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)
  const dateListRef = useRef<HTMLDivElement>(null)
  const now = useNow()
  const [dateOptions] = useState(() => Array.from({ length: 24 }, (_, i) => {
    const d = new Date(new Date().getTime() + i * 86400000)
    const date = dateKey(d)
    const [year, month, day] = date.split('-')
    const dayName = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long' }).format(d)
    return { date, dayName, displayDate: `${day}/${month}`, monthYear: `${month}/${year}` }
  }))
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].date)
  const [selectedSlots, setSelectedSlots] = useState<BookingSlot[]>([])
  const availability = useQueries({ queries: facility.subCourts.map((court) => ({
    queryKey: ['courtAvailability', Number(court.id), selectedDate],
    queryFn: () => bookingApi.getCourtAvailability(Number(court.id), selectedDate),
    enabled: facility.status === 'active' && court.status === 'active' && /^\d+$/.test(court.id), retry: false,
  })) })
  const timeSlots = useMemo(() => {
    const times = Array.from(new Set(availability.flatMap((r) => (r.data?.slots ?? []).map((slot) => slot.startTime.slice(0, 5))))).sort()
    return times.length ? times : DEFAULT_TIMES
  }, [availability])
  const phoneLink = facility.phone && /^[+\d\s().-]{7,30}$/.test(facility.phone) ? facility.phone.replace(/[^\d+]/g, '') : ''
  const getSlot = (courtId: string, time: string) => {
    const index = facility.subCourts.findIndex((court) => court.id === courtId)
    return availability[index]?.data?.slots.find((slot) => slot.startTime.slice(0, 5) === time)
  }
  const getSlotPrice = (courtId: string, time: string) => getSlot(courtId, time)?.price ?? 0
  const getSlotStatus = (courtId: string, time: string): 'available' | 'held' | 'confirmed' | 'blocked' | 'unknown' => {
    const slot = getSlot(courtId, time)
    if (!slot || new Date(`${selectedDate}T${slot.startTime}+07:00`).getTime() <= now) return 'unknown'
    if (slot.available) return 'available'
    if (slot.slotStatus === 'HELD') return 'held'
    if (slot.slotStatus === 'BOOKED') return 'confirmed'
    return 'blocked'
  }
  const toggleSelectSlot = (court: { id: string; name: string }, time: string) => {
    const slot = getSlot(court.id, time)
    if (!slot || getSlotStatus(court.id, time) !== 'available') return
    const courtSlots = availability[facility.subCourts.findIndex(c => c.id === court.id)]?.data?.slots ?? []
    const first = selectedSlots[0]
    const current = first?.courtId === court.id
      ? { ...slot, startTime: first.startTime, endTime: selectedSlots[selectedSlots.length - 1].endTime }
      : null
    try {
      const range = selectTimeRange(current, slot, courtSlots.map(s => ({ ...s, available: getSlotStatus(court.id, s.startTime.slice(0, 5)) === 'available' })))
      setSelectedSlots(courtSlots.filter(s => isSlotInRange(s, range))
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map(s => ({ slotId: `${court.id}_${selectedDate}_${s.startTime.slice(0, 5)}`, courtId: court.id, courtName: court.name, date: selectedDate, startTime: s.startTime, endTime: s.endTime, price: s.price })))
    } catch (error) {
      toast.error((error as Error).message)
    }
  }
  const totalPrice = selectedSlots.reduce((sum, slot) => sum + slot.price, 0)
  const handleProceedToCheckout = () => {
    const selected = selectedSlots[0]
    const slot = selected && getSlot(selected.courtId, selected.startTime.slice(0, 5))
    if (!selected || !slot || selectedSlots.some(s => getSlotStatus(s.courtId, s.startTime.slice(0, 5)) !== 'available')) { toast.error('Khung giờ không còn khả dụng. Vui lòng chọn lại.'); return }
    if (!currentUser) { onOpenAuth('login'); return }
    onBook({ courtId: Number(selected.courtId), courtName: selected.courtName, facilityName: facility.name, facilityAddress: facility.normalizedAddress || facility.address, initialDate: selectedDate, initialSlot: { ...slot, endTime: selectedSlots[selectedSlots.length - 1].endTime, price: totalPrice } })
  }
  const handleScrollDate = (direction: 'left' | 'right') => dateListRef.current?.scrollBy({ left: direction === 'left' ? -260 : 260, behavior: 'smooth' })
  const prevUserRef = useRef(currentUser)
  useEffect(() => {
    if (!prevUserRef.current && currentUser && selectedSlots.length > 0) toast.success('Đã đăng nhập. Bạn có thể tiếp tục đặt chỗ.')
    prevUserRef.current = currentUser
  }, [currentUser, selectedSlots.length])
  const activeDateItem = dateOptions.find((d) => d.date === selectedDate) || dateOptions[0]

  return (
    <div className="w-full pb-36 sm:pb-28 select-none">
      {/* UNIFIED SEAMLESS WORKPLACE: Single cohesive layout without fragmented floating cards */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* 1. Header Bar: Clean, professional top bar */}
        <div className="w-full bg-white border-b border-slate-200 px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              title="Quay lại"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Lịch đặt sân trực quan: {facility.name}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {facility.address}{facility.phone && <> | Hotline: <span className="font-bold text-slate-900">{facility.phone}</span></>}
              </p>
            </div>
          </div>

          {/* Right: Guest / User Auth Status */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {currentUser ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="truncate max-w-[150px]">{currentUser.fullName}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth?.('login')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Unified Date Selector Bar */}
        <div className="w-full bg-slate-50/70 border-b border-slate-200 px-3 sm:px-4 py-2 flex items-center gap-2">
          {/* Month Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-900 text-xs font-bold shrink-0 border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-[#168039]" />
            <span>Tháng {activeDateItem?.monthYear || '11/2026'}</span>
          </div>

          {/* Scroll Left Button */}
          <button
            type="button"
            onClick={() => handleScrollDate('left')}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer shrink-0 transition-colors"
            title="Xem ngày trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Date pills container */}
          <div
            ref={dateListRef}
            className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5"
          >
            {dateOptions.map((item) => {
              const isSelected = selectedDate === item.date
              return (
                <button
                  key={item.date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(item.date)
                    setSelectedSlots([])
                  }}
                  className={`flex flex-col items-center justify-center min-w-[68px] sm:min-w-[74px] py-1.5 px-2 rounded-lg border text-center transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#168039] text-white border-[#168039]'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`text-[10px] font-medium ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                    {item.dayName}
                  </span>
                  <span className="text-xs sm:text-sm font-black mt-0.5">
                    {item.displayDate}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Scroll Right Button */}
          <button
            type="button"
            onClick={() => handleScrollDate('right')}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer shrink-0 transition-colors"
            title="Xem ngày tiếp theo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Legend & Quick Action Bar */}
        <div className="w-full bg-white border-b border-slate-200 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-white border-2 border-emerald-600" />
              <span>Còn trống</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-[#168039] border border-[#168039]" />
              <span className="font-bold text-[#168039]">Đang chọn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300" />
              <span>Giữ chỗ (10p)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-rose-500 border border-rose-600" />
              <span>Đã đặt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-slate-300 border border-slate-400" />
              <span>Bảo trì</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsPriceModalOpen(true)}
            className="text-xs font-bold text-[#168039] hover:underline cursor-pointer flex items-center gap-1 self-start sm:self-auto shrink-0"
          >
            <DollarSign className="w-3.5 h-3.5 text-[#168039]" />
            <span>Xem bảng giá & danh sách sân con</span>
          </button>
        </div>

        <p className="px-4 py-2 text-xs text-slate-600">Chọn nhiều giờ liên tiếp trên cùng một sân: bấm ô đầu và ô cuối. Bấm ô đã chọn để rút ngắn khoảng giờ; chọn sân khác để chuyển sân.</p>
        {/* 4. VISUAL MATRIX TABLE: Seamlessly integrated inside the workplace canvas */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] sm:max-h-[calc(100vh-290px)]">
          <table className="w-full border-collapse select-none">
            {/* Table Header: Time Slots */}
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 sticky top-0 z-20">
                <th className="p-2 sm:p-2.5 text-left text-xs font-black text-slate-800 sticky left-0 bg-slate-100 z-30 min-w-[130px] sm:min-w-[150px] border-r-2 border-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#168039]" />
                    <span>Sân \ Giờ</span>
                  </div>
                </th>
                {timeSlots.map((t) => (
                  <th
                    key={t}
                    className="p-1 sm:p-1.5 text-center text-[11px] sm:text-xs font-bold text-slate-700 min-w-[62px] sm:min-w-[68px] border-r border-slate-200 last:border-r-0"
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body: Rows of SubCourts */}
            <tbody className="divide-y divide-slate-200">
              {facility.subCourts.length === 0 && <tr><td colSpan={timeSlots.length + 1} className="px-6 py-12 text-center text-sm text-slate-600"><p className="font-bold text-slate-900">Cụm sân chưa cung cấp lịch đặt trực tuyến.</p><p className="mt-2">Liên hệ trực tiếp để hỏi lịch trống và đặt sân.</p>{phoneLink && <a href={`tel:${phoneLink}`} className="mt-4 inline-block rounded-xl bg-[#168039] px-5 py-2.5 font-bold text-white">Gọi {facility.phone}</a>}</td></tr>}
              {availability.some((r) => r.isError) && <tr><td colSpan={timeSlots.length + 1} role="alert" className="p-4 text-center text-red-700">Không tải được lịch sân. Vui lòng tải lại trang.</td></tr>}
              {facility.subCourts.map((court) => (
                <tr key={court.id} className="hover:bg-slate-50/50">
                  {/* Sticky Court Name Column */}
                  <td className="p-2 sm:p-2.5 text-xs font-bold text-slate-900 sticky left-0 bg-white z-10 border-r-2 border-slate-300">
                    <div className="truncate font-black">{court.name}</div>
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                      {court.courtType === 'vip' ? 'Sân VIP cao cấp' : court.courtType === 'training' ? 'Sân tập' : 'Tiêu chuẩn BWF'}
                    </span>
                  </td>

                  {/* Slot Cells */}
                  {timeSlots.map((time) => {
                    const status = getSlotStatus(court.id, time)
                    const slotId = `${court.id}_${selectedDate}_${time}`
                    const isSelected = selectedSlots.some((s) => s.slotId === slotId)
                    const price = getSlotPrice(court.id, time)

                    return (
                      <td
                        key={time}
                        className="p-0.5 border-r border-slate-200 last:border-r-0 text-center"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSelectSlot(court, time)}
                          disabled={status !== 'available'}
                          aria-pressed={isSelected}
                          aria-label={`${court.name}, ${time}${status === 'unknown' ? ': khung giờ đã qua hoặc chưa được cung cấp' : ''}`}
                          className={`w-full py-2 px-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                            isSelected
                              ? 'bg-[#168039] text-white border border-[#168039] cursor-pointer'
                              : status === 'available'
                              ? 'bg-white hover:bg-emerald-50 text-slate-800 border border-emerald-300 cursor-pointer'
                              : status === 'held'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 cursor-not-allowed'
                              : status === 'confirmed'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 cursor-not-allowed'
                              : 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <span className="flex items-center gap-1"><Check className="w-3 h-3" />{time}</span>
                              <span className="text-xs font-bold">Đã chọn</span>
                            </>
                          ) : status === 'available' ? (
                            <>
                              <span className="text-[10px] font-extrabold text-slate-900">{time}</span>
                              <span className="text-xs font-semibold text-emerald-700">
                                {(price / 1000).toFixed(0)}k
                              </span>
                            </>
                          ) : status === 'held' ? (
                            <span className="text-xs font-semibold">Giữ chỗ</span>
                          ) : status === 'confirmed' ? (
                            <span className="text-xs font-semibold">Đã đặt</span>
                          ) : (
                            <span className="text-xs font-semibold">{status === 'unknown' ? '—' : 'Bảo trì'}</span>
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. BOTTOM ACTION BAR: Edge-to-edge floating bar with golden continue button like Alobo */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-3 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left Summary */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <div className="text-xs text-slate-600 font-medium">
                Đã chọn <strong className="text-slate-900 font-black">{selectedSlots.length}</strong> khung giờ ({activeDateItem?.displayDate})
              </div>
              {selectedSlots.length > 0 && <p className="text-xs font-semibold text-slate-800">{selectedSlots[0].courtName}: {selectedSlots[0].startTime.slice(0, 5)} – {selectedSlots[selectedSlots.length - 1].endTime.slice(0, 5)}</p>}
              <div className="text-lg sm:text-xl font-black text-[#168039]">
                {totalPrice.toLocaleString('vi-VN')} đ
              </div>
            </div>

            {selectedSlots.length > 0 && (
              <div className="hidden lg:flex items-center gap-1.5 flex-wrap max-w-xl">
                {selectedSlots.slice(0, 5).map((s) => (
                  <span
                    key={s.slotId}
                    className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold"
                  >
                    {s.courtName.split(' ')[0]} {s.courtName.split(' ')[1]}: {s.startTime}
                  </span>
                ))}
                {selectedSlots.length > 5 && (
                  <span className="text-xs text-slate-500 font-bold">
                    +{selectedSlots.length - 5} slot nữa
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Action Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {selectedSlots.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedSlots([])}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer transition-colors"
              >
                Hủy chọn
              </button>
            )}

            <button
              type="button"
              onClick={handleProceedToCheckout}
              disabled={selectedSlots.length === 0}
              className="flex-1 sm:flex-initial px-8 sm:px-12 py-3 rounded-xl bg-[#e5a92c] hover:bg-[#d49b24] active:bg-[#c48d1c] disabled:bg-slate-300 disabled:cursor-not-allowed text-slate-900 font-black text-sm sm:text-base transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{currentUser ? 'Tiếp tục đặt chỗ' : 'Tiếp tục đặt chỗ (Đăng nhập)'}</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. MODAL: View yards & Price list popup */}
      {isPriceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 max-h-[min(90vh,700px)] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 shrink-0">
              <h2 className="text-base font-black text-slate-900">
                Bảng giá & Danh sách sân: {facility.name}
              </h2>
              <button
                type="button"
                onClick={() => setIsPriceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SubCourts list & rules in scrollable body */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-700 mb-2">Các sân khả dụng</h3>
                {facility.subCourts.length === 0 && <p className="text-xs text-slate-600">Chưa có thông tin sân con.</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {facility.subCourts.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                      <strong className="text-slate-900 block">{c.name}</strong>
                      <span className="text-slate-600 font-medium">
                        Loại: {c.courtType === 'vip' ? 'Sân VIP' : c.courtType === 'training' ? 'Sân tập' : 'Tiêu chuẩn BWF'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-700 mb-2">Bảng giá niêm yết</h3>
                {priceRules.length === 0 && <p className="text-xs text-slate-600">Chưa có bảng giá đặt trực tuyến.</p>}
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {priceRules.map((r) => (
                    <div key={r.id} className="p-2.5 flex items-center justify-between text-xs bg-white hover:bg-slate-50">
                      <div>
                        <strong className="text-slate-900 block">{r.name}</strong>
                        <span className="text-slate-600 font-medium">{r.startTime} - {r.endTime}</span>
                      </div>
                      <span className="font-black text-[#168039]">
                        {r.pricePerHour.toLocaleString('vi-VN')} đ / giờ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsPriceModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Đã hiểu, quay lại đặt sân
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
