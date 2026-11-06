import React, { useState } from 'react'
import { Plus, Wrench, Calendar, Clock } from 'lucide-react'
import { OwnerLayout } from './OwnerLayout'
import { appStore } from '../../../lib/appStore'
import type { MaintenanceBlock } from '../../types/court'
import { toast } from 'sonner'

export const OwnerBlocksView: React.FC = () => {
  const facilities = appStore.getFacilities()
  const [selectedFacilityId, setSelectedFacilityId] = useState(facilities[0]?.id || 'court_1')
  const [blocks, setBlocks] = useState<MaintenanceBlock[]>(appStore.getMaintenanceBlocks())
  const [isModalOpen, setIsModalOpen] = useState(false)

  const currentFacility = facilities.find((f) => f.id === selectedFacilityId) || facilities[0]
  const facilityBlocks = blocks.filter((b) => b.facilityId === selectedFacilityId)

  const [newBlock, setNewBlock] = useState<Partial<MaintenanceBlock>>({
    facilityId: selectedFacilityId,
    courtId: currentFacility?.subCourts[0]?.id || '',
    courtName: currentFacility?.subCourts[0]?.name || 'Sân 1',
    date: new Date().toISOString().split('T')[0],
    startTime: '13:00',
    endTime: '17:00',
    reason: 'Bảo dưỡng định kỳ thảm sàn',
  })

  const handleOpenModal = () => {
    setNewBlock({
      facilityId: selectedFacilityId,
      courtId: currentFacility?.subCourts[0]?.id || '',
      courtName: currentFacility?.subCourts[0]?.name || 'Sân 1',
      date: new Date().toISOString().split('T')[0],
      startTime: '13:00',
      endTime: '17:00',
      reason: 'Bảo dưỡng định kỳ thảm sàn',
    })
    setIsModalOpen(true)
  }

  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBlock.courtId || !newBlock.date) return
    const blockToAdd: MaintenanceBlock = {
      id: `blk_${Date.now()}`,
      facilityId: selectedFacilityId,
      courtId: newBlock.courtId,
      courtName: newBlock.courtName || 'Sân con',
      date: newBlock.date!,
      startTime: newBlock.startTime || '13:00',
      endTime: newBlock.endTime || '17:00',
      reason: newBlock.reason || 'Bảo trì',
      createdAt: new Date().toISOString(),
    }
    const updated = [blockToAdd, ...blocks]
    setBlocks(updated)
    appStore.saveMaintenanceBlocks(updated)
    setIsModalOpen(false)
    toast.success('Đã tạo lịch khóa sân bảo trì thành công!')
  }

  const handleDeleteBlock = (id: string) => {
    const updated = blocks.filter((b) => b.id !== id)
    setBlocks(updated)
    appStore.saveMaintenanceBlocks(updated)
    toast.info('Đã mở khóa sân')
  }

  return (
    <OwnerLayout
      title="Khóa Sân & Lịch Bảo Trì"
      subtitle="Chủ động tạm dừng nhận khách cho các khung giờ bảo dưỡng thiết bị"
    >
      {/* Top Filter & Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-bold text-slate-700">Cụm sân:</span>
          <select
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-xs sm:text-sm text-slate-900 cursor-pointer"
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm lịch khóa sân</span>
        </button>
      </div>

      {/* Blocks List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-900">
          Danh sách lịch khóa sân bảo trì ({facilityBlocks.length})
        </h3>

        {facilityBlocks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            Hiện không có sân nào đang trong lịch bảo trì.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facilityBlocks.map((blk) => (
              <div
                key={blk.id}
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-rose-600" />
                    <strong className="text-sm text-slate-900">{blk.courtName}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(blk.id)}
                    className="text-rose-600 hover:text-rose-800 text-xs font-bold cursor-pointer"
                    title="Mở khóa sân"
                  >
                    Mở lại sân
                  </button>
                </div>

                <div className="text-xs text-slate-700 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ngày: <strong>{blk.date}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Thời gian: <strong>{blk.startTime} - {blk.endTime}</strong></span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-rose-100 text-xs text-slate-700">
                  <span className="text-slate-500 block text-[10px]">Lý do bảo dưỡng:</span>
                  <span className="font-medium">{blk.reason}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Add Block */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full max-h-[min(90vh,700px)] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Thêm lịch khóa sân bảo trì
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form id="blockForm" onSubmit={handleSaveBlock} className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Chọn sân con</label>
                <select
                  value={newBlock.courtId}
                  onChange={(e) => {
                    const c = currentFacility.subCourts.find((sc) => sc.id === e.target.value)
                    setNewBlock({
                      ...newBlock,
                      courtId: e.target.value,
                      courtName: c?.name || 'Sân con',
                    })
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 cursor-pointer"
                >
                  {currentFacility.subCourts.map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Ngày bảo trì</label>
                <input
                  type="date"
                  value={newBlock.date}
                  onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Từ giờ</label>
                  <input
                    type="time"
                    value={newBlock.startTime}
                    onChange={(e) => setNewBlock({ ...newBlock, startTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Đến giờ</label>
                  <input
                    type="time"
                    value={newBlock.endTime}
                    onChange={(e) => setNewBlock({ ...newBlock, endTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Lý do bảo dưỡng / khóa lịch</label>
                <textarea
                  value={newBlock.reason}
                  onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900"
                  required
                />
              </div>
            </form>

            <div className="p-4 sm:p-5 border-t border-slate-100 shrink-0 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                form="blockForm"
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Xác nhận khóa sân
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  )
}
