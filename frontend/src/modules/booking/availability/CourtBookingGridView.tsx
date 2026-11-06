import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Check,
  LogIn,
  Clock,
  Calendar,
  DollarSign,
  X,
} from 'lucide-react'
import { appStore } from '../../../lib/appStore'
import type { BookingSlot, BookingOrder } from '../../types/booking'
import type { User } from '../../types/user'
import { toast } from 'sonner'
import { ROUTES } from '../../../app/router'

// 30-minute interval slots from 05:30 to 23:00 (matching visual court booking matrix)
const TIME_SLOTS = [
  '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
  '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00',
]

interface CourtBookingGridViewProps {
  currentUser?: User | null
  onOpenAuth?: (tab?: 'login' | 'register') => void
}

export const CourtBookingGridView: React.FC<CourtBookingGridViewProps> = ({
  currentUser = null,
  onOpenAuth,
}) => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const facility = appStore.getFacilityById(id || 'court_1')

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false)
  const dateListRef = useRef<HTMLDivElement>(null)

  // 24 days date options (3+ weeks ahead) for full-width horizontal date strip
  const dateOptions = useMemo(() => {
    const list = []
    const now = new Date()
    for (let i = 0; i < 24; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() + i)
      const dateStr = d.toISOString().split('T')[0]
      const dayName =
        i === 0
          ? 'Hôm nay'
          : i === 1
          ? 'Ngày mai'
          : `Thứ ${d.getDay() === 0 ? 'CN' : d.getDay() + 1}`
      list.push({
        date: dateStr,
        dayName,
        displayDate: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
        monthYear: `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`,
      })
    }
    return list
  }, [])

  const [selectedDate, setSelectedDate] = useState(dateOptions[0]?.date || '')
  const [selectedSlots, setSelectedSlots] = useState<BookingSlot[]>([])

  // Scroll date strip horizontally
  const handleScrollDate = (direction: 'left' | 'right') => {
    if (dateListRef.current) {
      dateListRef.current.scrollBy({
        left: direction === 'left' ? -260 : 260,
        behavior: 'smooth',
      })
    }
  }

  // Notify when user logs in while slots are selected
  const prevUserRef = useRef(currentUser)
  useEffect(() => {
    if (!prevUserRef.current && currentUser && selectedSlots.length > 0) {
      toast.success(`Đã đăng nhập tài khoản ${currentUser.fullName}! Bạn có thể nhấn Tiếp tục đặt chỗ.`)
    }
    prevUserRef.current = currentUser
  }, [currentUser, selectedSlots.length])

  if (!facility) {
    return (
      <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8 text-center text-slate-700">
        <h2 className="text-lg font-bold text-slate-900 mb-2">Không tìm thấy cơ sở sân</h2>
        <button
          onClick={() => navigate(ROUTES.HOME)}
          className="px-4 py-2 rounded-xl bg-[#168039] text-white text-xs font-bold cursor-pointer hover:bg-[#136c30] transition-colors"
        >
          Quay lại trang chủ
        </button>
      </div>
    )
  }

  const priceRules = appStore.getPriceRules(facility.id)
  const maintenanceBlocks = appStore.getMaintenanceBlocks(facility.id)
  const existingBookings = appStore.getBookings()

  // Calculate 30-min slot price
  const getSlotPrice = (time: string): number => {
    const hour = parseInt(time.split(':')[0], 10)
    for (const rule of priceRules) {
      const startH = parseInt(rule.startTime.split(':')[0], 10)
      const endH = parseInt(rule.endTime.split(':')[0], 10)
      if (hour >= startH && hour < endH) {
        return Math.round(rule.pricePerHour / 2)
      }
    }
    return Math.round(facility.pricePerHour / 2)
  }

  // Determine slot status: 'available' | 'held' | 'confirmed' | 'blocked'
  const getSlotStatus = (courtId: string, time: string): 'available' | 'held' | 'confirmed' | 'blocked' => {
    // 1. Check maintenance blocks
    const isBlocked = maintenanceBlocks.some(
      (b) =>
        b.date === selectedDate &&
        (b.courtId === courtId || b.courtId === 'ALL') &&
        time >= b.startTime &&
        time < b.endTime
    )
    if (isBlocked) return 'blocked'

    // 2. Check existing bookings
    for (const bk of existingBookings) {
      if (bk.status === 'CANCELLED') continue
      for (const slot of bk.slots) {
        if (slot.courtId === courtId && slot.date === selectedDate) {
          // Check if current slot falls in booking range
          if (time >= slot.startTime && time < slot.endTime) {
            if (bk.status === 'HELD') {
              if (new Date(bk.holdExpiresAt).getTime() < Date.now()) {
                return 'available'
              }
              return 'held'
            }
            if (bk.status === 'CONFIRMED' || bk.status === 'COMPLETED' || bk.status === 'PENDING_PAYMENT') {
              return 'confirmed'
            }
          }
        }
      }
    }

    return 'available'
  }

  const toggleSelectSlot = (court: { id: string; name: string }, time: string) => {
    const status = getSlotStatus(court.id, time)
    if (status !== 'available') {
      if (status === 'held') toast.warning('Khung giờ này đang có khách giữ chỗ thanh toán!')
      if (status === 'confirmed') toast.error('Khung giờ này đã có người đặt!')
      if (status === 'blocked') toast.info('Khung giờ này đang được bảo dưỡng sân!')
      return
    }

    const slotId = `${court.id}_${selectedDate}_${time}`
    const isAlreadySelected = selectedSlots.some((s) => s.slotId === slotId)

    if (isAlreadySelected) {
      setSelectedSlots(selectedSlots.filter((s) => s.slotId !== slotId))
    } else {
      const [hStr, mStr] = time.split(':')
      const totalMin = parseInt(hStr, 10) * 60 + parseInt(mStr, 10) + 30
      const nextH = Math.floor(totalMin / 60).toString().padStart(2, '0')
      const nextM = (totalMin % 60).toString().padStart(2, '0')
      const nextTime = `${nextH}:${nextM}`

      const newSlot: BookingSlot = {
        slotId,
        courtId: court.id,
        courtName: court.name,
        date: selectedDate,
        startTime: time,
        endTime: nextTime,
        price: getSlotPrice(time),
      }
      setSelectedSlots([...selectedSlots, newSlot])
    }
  }

  const totalPrice = selectedSlots.reduce((acc, s) => acc + s.price, 0)

  const handleProceedToCheckout = () => {
    if (selectedSlots.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 khung giờ chơi!')
      return
    }

    // Guest check: Allow full checking and selection, but prompt login when proceeding to book
    if (!currentUser) {
      toast.info('Vui lòng đăng nhập để tiến hành đặt sân!', {
        description: 'Các khung giờ bạn đã chọn sẽ được lưu lại để tiếp tục.',
      })
      onOpenAuth?.('login')
      return
    }

    // Authenticated user: Create HELD booking (expires in 10 minutes)
    const newBooking: BookingOrder = {
      id: `bk_${Date.now()}`,
      bookingCode: `SC-${Math.floor(10000 + Math.random() * 90000)}`,
      facilityId: facility.id,
      facilityName: facility.name,
      facilityAddress: facility.address,
      facilityLogo: facility.logoUrl,
      slots: selectedSlots,
      totalAmount: totalPrice,
      status: 'HELD',
      holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      customerName: currentUser.fullName,
      customerPhone: currentUser.phone || '0988 123 456',
      customerEmail: currentUser.email,
      createdAt: new Date().toISOString(),
    }

    appStore.createBooking(newBooking)
    toast.success('Đã giữ chỗ thành công 10 phút! Chuyển sang thanh toán.')
    navigate(`/checkout/${newBooking.id}`)
  }

  // Selected date month-year label
  const activeDateItem = dateOptions.find((d) => d.date === selectedDate) || dateOptions[0]

  return (
    <div className="w-full pb-28 select-none">
      {/* UNIFIED SEAMLESS WORKPLACE: Single cohesive layout without fragmented floating cards */}
      <div className="w-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {/* 1. Header Bar: Clean, professional top bar */}
        <div className="w-full bg-white border-b border-slate-200 px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/courts/${facility.id}`)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
              title="Quay lại chi tiết cụm sân"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>

            <div>
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Lịch đặt sân trực quan: {facility.name}
              </h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {facility.address} | Hotline: <span className="font-bold text-slate-900">{facility.phone}</span>
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
                {TIME_SLOTS.map((t) => (
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
                  {TIME_SLOTS.map((time) => {
                    const status = getSlotStatus(court.id, time)
                    const slotId = `${court.id}_${selectedDate}_${time}`
                    const isSelected = selectedSlots.some((s) => s.slotId === slotId)
                    const price = getSlotPrice(time)

                    return (
                      <td
                        key={time}
                        className="p-0.5 border-r border-slate-200 last:border-r-0 text-center"
                      >
                        <button
                          type="button"
                          onClick={() => toggleSelectSlot(court, time)}
                          disabled={status !== 'available'}
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
                              <Check className="w-3 h-3" />
                              <span className="text-[9px] font-bold">Đã chọn</span>
                            </>
                          ) : status === 'available' ? (
                            <>
                              <span className="text-[10px] font-extrabold text-slate-900">{time}</span>
                              <span className="text-[9px] font-semibold text-emerald-700">
                                {(price / 1000).toFixed(0)}k
                              </span>
                            </>
                          ) : status === 'held' ? (
                            <span className="text-[9px] font-semibold">Giữ chỗ</span>
                          ) : status === 'confirmed' ? (
                            <span className="text-[9px] font-semibold">Đã đặt</span>
                          ) : (
                            <span className="text-[9px] font-semibold">Bảo trì</span>
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
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-3 sm:px-6 py-3">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left Summary */}
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div>
              <div className="text-xs text-slate-600 font-medium">
                Đã chọn <strong className="text-slate-900 font-black">{selectedSlots.length}</strong> khung giờ ({activeDateItem?.displayDate})
              </div>
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
              className="flex-1 sm:flex-initial px-8 sm:px-12 py-3 rounded-xl bg-[#e5a92c] hover:bg-[#d49b24] active:bg-[#c48d1c] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-sm sm:text-base transition-colors cursor-pointer flex items-center justify-center gap-2"
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
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
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

            {/* SubCourts list */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 mb-2">Các sân khả dụng</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {facility.subCourts.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                    <strong className="text-slate-900 block">{c.name}</strong>
                    <span className="text-slate-500">
                      Loại: {c.courtType === 'vip' ? 'Sân VIP' : c.courtType === 'training' ? 'Sân tập' : 'Tiêu chuẩn BWF'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price rules */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 mb-2">Bảng giá niêm yết</h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {priceRules.map((r) => (
                  <div key={r.id} className="p-2.5 flex items-center justify-between text-xs bg-white hover:bg-slate-50">
                    <div>
                      <strong className="text-slate-900 block">{r.name}</strong>
                      <span className="text-slate-500">{r.startTime} - {r.endTime}</span>
                    </div>
                    <span className="font-black text-[#168039]">
                      {r.pricePerHour.toLocaleString('vi-VN')} đ / giờ
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPriceModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Đã hiểu, quay lại đặt sân
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
