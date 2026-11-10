import { useApiQuery } from '../../../hooks/useApiQuery'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign,
  Calendar,
  Activity,
  CheckCircle2,
  UserCheck,
  Building,
  RefreshCw,
  Clock,
  Wrench,
  TrendingUp,
  Layers,
} from 'lucide-react'
import { OwnerLayout } from './OwnerLayout'
import { courtApi } from '../services/courtApi'
import type { Facility } from '../../types/court'
import { ROUTES } from '../../../app/router'
import { toast } from 'sonner'

type RangePreset = 'today' | '7d' | '30d' | 'custom'

function formatIsoDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export const OwnerDashboardView: React.FC = () => {
  const navigate = useNavigate()
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('')
  const [preset, setPreset] = useState<RangePreset>('7d')
  const [fromDate, setFromDate] = useState<string>(() =>
    formatIsoDate(new Date(Date.now() - 6 * 86400000))
  )
  const [toDate, setToDate] = useState<string>(() => formatIsoDate(new Date()))

  useEffect(() => {
    courtApi
      .getOwnerFacilities()
      .then((list) => {
        setFacilities(list)
        if (list.length > 0) {
          setSelectedFacilityId((prev) => prev || list[0].id)
        }
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : 'Không thể tải danh sách cụm sân')
      })
  }, [])

  const applyPreset = (nextPreset: RangePreset) => {
    setPreset(nextPreset)
    const now = new Date()
    if (nextPreset === 'today') {
      const d = formatIsoDate(now)
      setFromDate(d)
      setToDate(d)
    } else if (nextPreset === '7d') {
      setFromDate(formatIsoDate(new Date(now.getTime() - 6 * 86400000)))
      setToDate(formatIsoDate(now))
    } else if (nextPreset === '30d') {
      setFromDate(formatIsoDate(new Date(now.getTime() - 29 * 86400000)))
      setToDate(formatIsoDate(now))
    }
  }

  const { data: dashboard, isFetching: loading, refetch: fetchDashboard } = useApiQuery({
    queryKey: ['ownerDashboard', selectedFacilityId, fromDate, toDate],
    queryFn: () => courtApi.getOwnerDashboard(selectedFacilityId || undefined, fromDate, toDate),
    enabled: true,
  })

  const handleCheckIn = async (bookingId: string) => {
    try {
      await courtApi.updateOwnerBookingStatus(bookingId, 'COMPLETED')
      toast.success('Đã xác nhận khách nhận sân thành công!')
      fetchDashboard()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái nhận sân')
    }
  }

  const maxDailyRevenue = Math.max(
    1,
    ...(dashboard?.dailyRevenueSeries.map((d) => d.revenue) || [1])
  )
  const maxCourtRevenue = Math.max(
    1,
    ...(dashboard?.courtRevenues.map((c) => c.revenue) || [1])
  )

  return (
    <OwnerLayout
      title="Trung tâm Điều hành & Doanh thu"
      subtitle="Theo dõi trạng thái sân trực tiếp, đối soát doanh thu theo ngày và quản lý lịch đón khách"
    >
      {/* Unified Filter & Facility Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Building className="w-4 h-4 text-[#168039]" />
            <span className="text-xs sm:text-sm font-bold text-slate-800">Cơ sở vận hành:</span>
          </div>
          <select
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900 text-xs sm:text-sm cursor-pointer min-w-[240px]"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.district})
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            {[
              { id: 'today' as const, label: 'Hôm nay' },
              { id: '7d' as const, label: '7 ngày' },
              { id: '30d' as const, label: '30 ngày' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => applyPreset(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  preset === opt.id
                    ? 'bg-white text-[#168039]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setPreset('custom')
                setFromDate(e.target.value)
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold"
            />
            <span className="text-slate-500 font-semibold">đến</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setPreset('custom')
                setToDate(e.target.value)
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold"
            />
          </div>

          <button
            type="button"
            onClick={() => void fetchDashboard()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Doanh thu trong kỳ</span>
            <div className="w-8 h-8 rounded-lg bg-[#168039] text-white flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {(dashboard?.totalRevenue || 0).toLocaleString('vi-VN')} đ
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#168039]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Hôm nay: {(dashboard?.todayRevenue || 0).toLocaleString('vi-VN')} đ</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Đơn đặt thành công</span>
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {(dashboard?.confirmedBookings || 0) + (dashboard?.completedBookings || 0)} đơn
          </div>
          <div className="text-xs font-medium text-slate-600">
            Đã nhận sân: <strong>{dashboard?.completedBookings || 0}</strong> | Giữ chỗ:{' '}
            <strong>{dashboard?.heldBookings || 0}</strong>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Tỷ lệ lấp đầy sân</span>
            <div className="w-8 h-8 rounded-lg bg-[#e5a92c] text-white flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#168039]">
            {(dashboard?.occupancyRate ?? 0).toFixed(1)}%
          </div>
          <div className="text-xs font-medium text-slate-600">
            Tính trên tổng công suất giờ mở cửa
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Sân con sẵn sàng</span>
            <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900">
            {dashboard?.activeCourts || 0} / {dashboard?.totalCourts || 0} sân
          </div>
          <div className="text-xs font-medium text-slate-600">
            {dashboard?.maintenanceCourts
              ? `Đang bảo trì ${dashboard.maintenanceCourts} sân`
              : 'Tất cả sân hoạt động ổn định'}
          </div>
        </div>
      </div>

      {/* Live Court Status Board */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Sơ đồ trạng thái sân thời gian thực
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Giám sát nhanh sân đang có khách chơi, đang giữ chỗ thanh toán hoặc đang khóa bảo trì
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate(ROUTES.OWNER_BLOCKS)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-700" />
              <span>Quản lý bảo trì</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.OWNER_FACILITIES)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cấu hình sân con</span>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {(dashboard?.liveCourtStatuses || []).map((court) => {
            const badgeStyle =
              court.liveStatus === 'PLAYING'
                ? 'bg-[#168039] text-white'
                : court.liveStatus === 'HELD'
                ? 'bg-[#e5a92c] text-white'
                : court.liveStatus === 'MAINTENANCE'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-900 text-white'

            const badgeLabel =
              court.liveStatus === 'PLAYING'
                ? 'Đang có khách'
                : court.liveStatus === 'HELD'
                ? 'Đang giữ chỗ'
                : court.liveStatus === 'MAINTENANCE'
                ? 'Bảo trì'
                : 'Sân trống'

            return (
              <div
                key={court.courtId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{court.courtName}</h3>
                    <span className="text-[11px] font-semibold text-slate-600">
                      Hạng sân: {court.courtType === 'VIP' ? 'Thi đấu VIP' : court.courtType === 'TRAINING' ? 'Tập luyện' : 'Tiêu chuẩn'}
                    </span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 ${badgeStyle}`}>
                    {badgeLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium pt-2 border-t border-slate-200/80">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{court.currentInfo}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Revenue Charts Row: Daily Revenue Series & Per-Court Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Daily Revenue Bar Chart (3 cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Biểu đồ doanh thu theo ngày</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Tổng hợp từ các đơn đặt đã thanh toán và hoàn tất nhận sân
              </p>
            </div>
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
              {dashboard?.dailyRevenueSeries.length || 0} ngày
            </span>
          </div>

          <div className="h-56 pt-4 flex items-end gap-2 sm:gap-3 overflow-x-auto pb-1 border-b border-slate-100">
            {(dashboard?.dailyRevenueSeries || []).slice(-14).map((pt) => {
              const heightPct = Math.max(8, Math.round((pt.revenue / maxDailyRevenue) * 100))
              return (
                <div
                  key={pt.date}
                  className="flex-1 min-w-[42px] h-full flex flex-col items-center justify-end gap-1.5"
                >
                  <span className="text-[10px] font-bold text-slate-700 whitespace-nowrap">
                    {pt.revenue > 0 ? `${Math.round(pt.revenue / 1000)}k` : '0'}
                  </span>
                  <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-[#168039] rounded-t-lg transition-all duration-300"
                      style={{ height: `${heightPct}%` }}
                      title={`${pt.label}: ${pt.revenue.toLocaleString('vi-VN')} đ (${pt.bookingCount} đơn)`}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700">{pt.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Revenue by Sub-Court (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Hiệu suất theo từng sân con</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              So sánh doanh thu và tổng số giờ khai thác từng sân
            </p>
          </div>

          <div className="space-y-3.5">
            {(dashboard?.courtRevenues || []).map((cr) => {
              const widthPct = Math.max(6, Math.round((cr.revenue / maxCourtRevenue) * 100))
              return (
                <div key={cr.courtId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 truncate max-w-[180px]">
                      {cr.courtName}
                    </span>
                    <span className="font-black text-[#168039]">
                      {cr.revenue.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        cr.status === 'MAINTENANCE' ? 'bg-slate-400' : 'bg-[#168039]'
                      }`}
                      style={{ width: `${cr.revenue === 0 ? 4 : widthPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span>{cr.bookingCount} lượt đặt</span>
                    <span>{cr.bookedHours} giờ khai thác</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom Row: Hourly Occupancy Bands & Guest Check-in Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Mật độ khách theo ca hoạt động</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Hỗ trợ điều chỉnh bảng giá giờ thấp điểm và giờ cao điểm hợp lý
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.OWNER_PRICING)}
              className="text-xs font-bold text-[#168039] hover:underline cursor-pointer"
            >
              Điều chỉnh giá →
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {(dashboard?.hourlyBands || []).map((slot, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{slot.bandLabel}</span>
                  <span className="font-black text-slate-900">
                    {slot.occupancyPercent}% ({slot.bookedSlots} ca)
                  </span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      slot.isPeak ? 'bg-[#e5a92c]' : 'bg-[#168039]'
                    }`}
                    style={{ width: `${Math.max(4, slot.occupancyPercent)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Hàng đợi đón khách hôm nay</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Xác nhận nhanh khi khách có mặt tại quầy
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(ROUTES.OWNER_BOOKINGS)}
              className="text-xs font-bold text-[#168039] hover:underline cursor-pointer"
            >
              Xem tất cả
            </button>
          </div>

          {(dashboard?.todayCheckInQueue || []).length === 0 ? (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-600">
              Chưa có lịch đặt nào cần đón khách trong ngày hôm nay.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {(dashboard?.todayCheckInQueue || []).map((bk) => (
                <div
                  key={bk.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-900 truncate">{bk.customerName}</strong>
                      <span className="text-[11px] text-slate-600 font-mono">({bk.bookingCode})</span>
                    </div>
                    <div className="text-[11px] text-slate-700 font-medium mt-0.5">
                      {bk.courtName}: <strong>{bk.startTime} - {bk.endTime}</strong>
                    </div>
                  </div>

                  {bk.status === 'COMPLETED' ? (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-200 text-slate-800 shrink-0">
                      Đã nhận sân
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCheckIn(bk.id)}
                      className="px-3 py-1.5 rounded-lg bg-[#168039] hover:bg-[#136c30] text-white font-bold text-xs cursor-pointer transition-colors flex items-center gap-1 shrink-0"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Nhận sân</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </OwnerLayout>
  )
}
