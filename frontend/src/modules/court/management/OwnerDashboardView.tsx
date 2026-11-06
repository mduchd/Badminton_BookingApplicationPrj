import React, { useState } from 'react'
import {
  DollarSign,
  Calendar,
  Activity,
  CheckCircle2,
  ArrowUpRight,
  UserCheck,
  Building,
} from 'lucide-react'
import { OwnerLayout } from './OwnerLayout'
import { appStore } from '../../../lib/appStore'
import { toast } from 'sonner'

export const OwnerDashboardView: React.FC = () => {
  const [facilities] = useState(appStore.getFacilities())
  const [selectedFacilityId, setSelectedFacilityId] = useState(facilities[0]?.id || '')
  const [bookings, setBookings] = useState(appStore.getBookings())

  const currentFacility = facilities.find((f) => f.id === selectedFacilityId) || facilities[0]

  // KPI Calculations
  const facilityBookings = bookings.filter((b) => b.facilityId === currentFacility?.id)
  const totalRevenue = facilityBookings
    .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
    .reduce((acc, b) => acc + b.totalAmount, 0)
  const confirmedCount = facilityBookings.filter((b) => b.status === 'CONFIRMED').length
  const totalSlotsCount = currentFacility?.subCourts?.length || 4

  const handleCheckIn = (bookingId: string) => {
    appStore.updateBookingStatus(bookingId, 'COMPLETED')
    setBookings(appStore.getBookings())
    toast.success('Đã xác nhận nhận sân (Check-in thành công)!')
  }

  return (
    <OwnerLayout
      title="Báo cáo & Thống kê vận hành"
      subtitle="Theo dõi doanh thu, lịch đón khách và tỷ lệ lấp đầy sân theo thời gian thực"
    >
      {/* Facility Switcher */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-emerald-600" />
          <span className="text-xs sm:text-sm font-bold text-slate-900">Đang quản lý cụm sân:</span>
        </div>
        <select
          value={selectedFacilityId}
          onChange={(e) => setSelectedFacilityId(e.target.value)}
          className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 text-xs sm:text-sm cursor-pointer"
        >
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.address})
            </option>
          ))}
        </select>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Doanh thu ghi nhận</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {totalRevenue.toLocaleString('vi-VN')} đ
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.5% so với tuần trước</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lượt đặt đã xác nhận</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {confirmedCount} đơn
          </div>
          <div className="text-[11px] font-medium text-slate-500">
            Đã thanh toán qua payOS/Mock
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Tỷ lệ lấp đầy (Occupancy)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#168039]">
            82.4%
          </div>
          <div className="text-[11px] font-medium text-slate-500">
            Giờ cao điểm tối: 95%
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Sân con vận hành</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {totalSlotsCount} / {totalSlotsCount} sân
          </div>
          <div className="text-[11px] font-medium text-emerald-700">
            Tất cả sân sẵn sàng phục vụ
          </div>
        </div>
      </div>

      {/* Two Column Section: Occupancy Chart & Today Check-in Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Occupancy Bar Matrix (3 cols) */}
        <div className="lg:col-span-3 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Phân bổ lượng khách trong ngày</h2>
              <p className="text-xs text-slate-500">Mức độ lấp đầy theo các khung giờ (Hôm nay)</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              Khung giờ vàng: 17h - 22h
            </span>
          </div>

          {/* Clean Flat Bar Visualization */}
          <div className="space-y-3 pt-2">
            {[
              { time: '06:00 - 09:00 (Sáng sớm)', rate: 65, color: 'bg-emerald-600' },
              { time: '09:00 - 14:00 (Buổi trưa)', rate: 40, color: 'bg-slate-400' },
              { time: '14:00 - 17:00 (Chiều)', rate: 75, color: 'bg-emerald-600' },
              { time: '17:00 - 20:00 (Giờ vàng tối 1)', rate: 98, color: 'bg-[#e5a92c]' },
              { time: '20:00 - 22:30 (Giờ vàng tối 2)', rate: 92, color: 'bg-[#e5a92c]' },
            ].map((slot, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{slot.time}</span>
                  <span className="font-black text-slate-900">{slot.rate}% kín sân</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${slot.color} rounded-full`}
                    style={{ width: `${slot.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Guest Check-in List Today (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Lịch đón khách hôm nay</h2>
            <span className="text-xs text-slate-500 font-medium">{facilityBookings.length} lượt</span>
          </div>

          <div className="space-y-3">
            {facilityBookings.slice(0, 5).map((bk) => (
              <div
                key={bk.id}
                className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <strong className="text-slate-900">{bk.customerName}</strong>
                    <span className="text-[10px] text-slate-500 font-mono">({bk.bookingCode})</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                    {bk.slots.map((s) => `${s.courtName}: ${s.startTime}-${s.endTime}`).join(', ')}
                  </div>
                </div>

                {bk.status === 'COMPLETED' ? (
                  <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-200 text-slate-700">
                    Đã nhận sân
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCheckIn(bk.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#168039] hover:bg-[#136c30] text-white font-bold text-[11px] cursor-pointer transition-colors flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Check-in</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </OwnerLayout>
  )
}
