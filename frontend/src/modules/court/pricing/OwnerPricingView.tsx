import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Clock } from 'lucide-react'
import { OwnerLayout } from '../management/OwnerLayout'
import { appStore } from '../../../lib/appStore'
import type { PriceRule } from '../../types/court'
import { toast } from 'sonner'

export const OwnerPricingView: React.FC = () => {
  const facilities = appStore.getFacilities()
  const [selectedFacilityId, setSelectedFacilityId] = useState(facilities[0]?.id || 'court_1')
  const [rules, setRules] = useState<PriceRule[]>(appStore.getPriceRules())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null)

  const facilityRules = rules.filter((r) => r.facilityId === selectedFacilityId)

  const handleOpenNew = () => {
    setEditingRule({
      id: `pr_${Date.now()}`,
      facilityId: selectedFacilityId,
      name: 'Khung giờ mới',
      dayOfWeek: 'ALL',
      startTime: '17:00',
      endTime: '21:00',
      pricePerHour: 130000,
    })
    setIsModalOpen(true)
  }

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRule) return
    const exists = rules.some((r) => r.id === editingRule.id)
    let updated: PriceRule[]
    if (exists) {
      updated = rules.map((r) => (r.id === editingRule.id ? editingRule : r))
    } else {
      updated = [...rules, editingRule]
    }
    setRules(updated)
    appStore.savePriceRules(updated)
    setIsModalOpen(false)
    toast.success('Đã lưu cấu hình bảng giá!')
  }

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id)
    setRules(updated)
    appStore.savePriceRules(updated)
    toast.info('Đã xóa quy tắc giá')
  }

  return (
    <OwnerLayout
      title="Cấu hình Bảng giá theo Giờ"
      subtitle="Thiết lập giá theo giờ thấp điểm, giờ cao điểm và ngày trong tuần"
    >
      {/* Top Filter & Actions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-bold text-slate-700">Áp dụng cho cụm sân:</span>
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
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm khung giá mới</span>
        </button>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            Các quy tắc giá đang áp dụng ({facilityRules.length})
          </h3>
          <span className="text-xs text-slate-500">Tự động tính khi khách chọn slot</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <th className="p-3.5">Tên khung giờ</th>
                <th className="p-3.5">Khoảng thời gian</th>
                <th className="p-3.5">Ngày áp dụng</th>
                <th className="p-3.5">Đơn giá / giờ</th>
                <th className="p-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facilityRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50/50">
                  <td className="p-3.5 font-bold text-slate-900">{rule.name}</td>
                  <td className="p-3.5 text-slate-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{rule.startTime} - {rule.endTime}</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-slate-700 font-medium">
                    {rule.dayOfWeek === 'ALL'
                      ? 'Tất cả các ngày'
                      : rule.dayOfWeek === 'WEEKDAY'
                      ? 'Thứ 2 - Thứ 6'
                      : 'Thứ 7 & Chủ nhật'}
                  </td>
                  <td className="p-3.5 font-black text-[#168039]">
                    {rule.pricePerHour.toLocaleString('vi-VN')} đ
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRule(rule)
                        setIsModalOpen(true)
                      }}
                      className="p-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
                      title="Sửa"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 text-rose-600 hover:text-rose-800 cursor-pointer"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full max-h-[min(90vh,700px)] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-slate-100 shrink-0 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingRule.id.startsWith('pr_') ? 'Thêm quy tắc giá mới' : 'Chỉnh sửa quy tắc giá'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form id="priceRuleForm" onSubmit={handleSaveRule} className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Tên khung giờ</label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  placeholder="VD: Khung giờ vàng tối"
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={editingRule.startTime}
                    onChange={(e) => setEditingRule({ ...editingRule, startTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    value={editingRule.endTime}
                    onChange={(e) => setEditingRule({ ...editingRule, endTime: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Ngày áp dụng</label>
                <select
                  value={editingRule.dayOfWeek}
                  onChange={(e) => setEditingRule({ ...editingRule, dayOfWeek: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-medium text-slate-900 cursor-pointer"
                >
                  <option value="ALL">Tất cả các ngày trong tuần</option>
                  <option value="WEEKDAY">Thứ 2 đến Thứ 6</option>
                  <option value="WEEKEND">Thứ 7 và Chủ nhật</option>
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Đơn giá / giờ (VNĐ)</label>
                <input
                  type="number"
                  step="5000"
                  value={editingRule.pricePerHour}
                  onChange={(e) => setEditingRule({ ...editingRule, pricePerHour: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-900 text-sm"
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
                form="priceRuleForm"
                className="px-5 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer"
              >
                Lưu quy tắc
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  )
}
