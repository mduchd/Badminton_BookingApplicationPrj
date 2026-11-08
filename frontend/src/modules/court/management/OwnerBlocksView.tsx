import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Wrench, Calendar, Clock, X, Unlock, ShieldAlert } from 'lucide-react'
import { OwnerLayout } from '../management/OwnerLayout'
import { courtApi } from '../services/courtApi'
import type { Facility, MaintenanceBlock, SubCourt } from '../../types/court'
import { toast } from 'sonner'

export const OwnerBlocksView: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('')
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [applyAllCourts, setApplyAllCourts] = useState(false)
  const [courtId, setCourtId] = useState<string>('')
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('13:00')
  const [endTime, setEndTime] = useState('16:30')
  const [reason, setReason] = useState('Bảo dưỡng mặt thảm BWF và kiểm tra hệ thống đèn chiếu sáng')

  const loadFacilities = useCallback(async () => {
    try {
      const list = await courtApi.getOwnerFacilities()
      setFacilities(list)
      if (list.length > 0) {
        setSelectedFacilityId((prev) => prev || list[0].id)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải danh sách cụm sân')
    }
  }, [])

  useEffect(() => {
    loadFacilities()
  }, [loadFacilities])

  const currentFacility = useMemo(
    () => facilities.find((f) => f.id === selectedFacilityId) || facilities[0],
    [facilities, selectedFacilityId]
  )

  const loadBlocks = useCallback(async () => {
    if (!selectedFacilityId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await courtApi.getMaintenanceBlocks(selectedFacilityId)
      setBlocks(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải lịch bảo trì')
    } finally {
      setLoading(false)
    }
  }, [selectedFacilityId])

  useEffect(() => {
    loadBlocks()
  }, [loadBlocks])

  const handleOpenModal = () => {
    setApplyAllCourts(false)
    setCourtId(currentFacility?.subCourts[0]?.id || '')
    setDate(new Date().toISOString().split('T')[0])
    setStartTime('13:00')
    setEndTime('16:30')
    setReason('Bảo dưỡng mặt thảm BWF và kiểm tra hệ thống đèn chiếu sáng')
    setIsModalOpen(true)
  }

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFacilityId) return
    setSaving(true)
    try {
      const created = await courtApi.createMaintenanceBlock(selectedFacilityId, {
        courtId: applyAllCourts ? null : courtId,
        applyAllCourts,
        date,
        startTime,
        endTime,
        reason: reason.trim(),
      })
      toast.success(`Đã khóa lịch bảo trì cho ${created.length} sân con!`)
      setIsModalOpen(false)
      await loadBlocks()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Không thể khóa lịch bảo trì (có thể trùng đơn khách đặt)'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleReleaseBlock = async (blk: MaintenanceBlock) => {
    try {
      await courtApi.releaseMaintenanceBlock(blk.id)
      toast.success(`Đã mở lại khung giờ trên ${blk.courtName}`)
      loadBlocks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể mở khóa lịch bảo trì')
    }
  }

  const handleToggleCourtMaintenance = async (court: SubCourt) => {
    if (!currentFacility) return
    const nextStatus = court.status === 'maintenance' ? 'ACTIVE' : 'MAINTENANCE'
    try {
      await courtApi.updateSubCourt(currentFacility.id, court.id, {
        name: court.name,
        courtNumber: court.courtNumber,
        courtType: court.courtType.toUpperCase() as 'STANDARD' | 'VIP' | 'TRAINING',
        basePricePerHour: court.basePricePerHour || currentFacility.pricePerHour || 110000,
        surfaceType: court.surfaceType,
        status: nextStatus,
      })
      toast.success(
        nextStatus === 'MAINTENANCE'
          ? `Đã tạm đóng toàn thời gian "${court.name}" để bảo trì`
          : `Đã mở nhận khách trở lại cho "${court.name}"`
      )
      await loadFacilities()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái sân con')
    }
  }

  return (
    <OwnerLayout
      title="Khóa lịch & Quản lý Bảo trì Sân"
      subtitle="Chủ động khóa khung giờ sửa chữa thiết bị hoặc tạm đóng sân con mà không gây trùng lịch đặt của khách"
    >
      {/* Unified Control Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-bold text-slate-800">Cụm sân áp dụng:</span>
          <select
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs sm:text-sm text-slate-900 cursor-pointer"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo lịch khóa bảo trì theo giờ</span>
        </button>
      </div>

      {/* Quick Whole-Court Maintenance Toggle */}
      {currentFacility && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Công tắc đóng / mở bảo trì dài hạn từng sân con
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Khi chuyển sang Bảo trì dài hạn, toàn bộ khung giờ của sân con đó sẽ ngừng nhận khách cho đến khi mở lại
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {currentFacility.subCourts.map((sc) => {
              const isMaint = sc.status === 'maintenance'
              return (
                <div
                  key={sc.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 ${
                    isMaint
                      ? 'border-amber-300 bg-amber-50/50'
                      : 'border-slate-200 bg-slate-50/70'
                  }`}
                >
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">{sc.name}</div>
                    <div className="text-[11px] text-slate-600 mt-0.5">
                      Trạng thái:{' '}
                      <strong className={isMaint ? 'text-amber-800' : 'text-[#168039]'}>
                        {isMaint ? 'Đang đóng bảo trì' : 'Đang vận hành'}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleCourtMaintenance(sc)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      isMaint
                        ? 'bg-[#168039] hover:bg-[#136c30] text-white'
                        : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    {isMaint ? 'Mở vận hành trở lại' : 'Tạm đóng bảo trì'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Scheduled Time-Slot Maintenance Blocks */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Các khung giờ đang khóa bảo trì ({blocks.length})
          </h2>
          <span className="text-xs text-slate-600">Tự động chặn đặt trùng trên bảng giờ khách hàng</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm font-semibold text-slate-600">
            Đang tải danh sách lịch bảo trì...
          </div>
        ) : blocks.length === 0 ? (
          <div className="p-8 text-center text-slate-600 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200">
            Hiện không có khung giờ nào đang khóa bảo trì tại cụm sân này.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {blocks.map((blk) => (
              <div
                key={blk.id}
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-rose-600 shrink-0" />
                    <strong className="text-sm text-slate-900">{blk.courtName}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReleaseBlock(blk)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Mở khóa sân</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <span>
                      Ngày: <strong>{blk.date}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                    <span>
                      Giờ: <strong>{blk.startTime} - {blk.endTime}</strong>
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-rose-100 text-xs text-slate-800">
                  <span className="text-slate-600 block text-[11px] font-semibold">
                    Hạng mục bảo dưỡng:
                  </span>
                  <span className="font-medium">{blk.reason}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Maintenance Block Modal */}
      {isModalOpen && currentFacility && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full max-h-[min(90vh,700px)] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-200 shrink-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Tạo lịch khóa sân bảo trì</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="maintenanceCreateForm"
              onSubmit={handleCreateBlock}
              className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm"
            >
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyAllCourts}
                  onChange={(e) => setApplyAllCourts(e.target.checked)}
                  className="w-4 h-4 accent-[#168039]"
                />
                <span className="text-xs font-bold text-slate-900">
                  Khóa đồng loạt tất cả sân con trong cụm sân
                </span>
              </label>

              {!applyAllCourts && (
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Chọn sân con</label>
                  <select
                    value={courtId}
                    onChange={(e) => setCourtId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 cursor-pointer"
                  >
                    {currentFacility.subCourts.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-slate-700 font-bold block mb-1">Ngày thực hiện *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Từ giờ *</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Đến giờ *</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Nội dung công việc bảo trì *
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-medium text-slate-900"
                />
              </div>

              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Hệ thống sẽ tự động kiểm tra chống xung đột: nếu khung giờ đã có khách giữ chỗ hoặc thanh toán, lệnh khóa sẽ được cảnh báo ngay.
                </span>
              </div>
            </form>

            <div className="p-4 border-t border-slate-200 shrink-0 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="maintenanceCreateForm"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? 'Đang khóa lịch...' : 'Xác nhận khóa sân'}
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  )
}
