import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Edit2, Trash2, Clock, X, Users, Layers } from 'lucide-react'
import { OwnerLayout } from '../management/OwnerLayout'
import { courtApi } from '../services/courtApi'
import type {
  CustomerPricingType,
  DayTypeFilter,
  Facility,
  PriceRule,
  PriceRuleUpsertPayload,
} from '../../types/court'
import { toast } from 'sonner'

interface RuleFormState {
  id?: string
  courtId: string
  name: string
  dayType: DayTypeFilter
  customerType: CustomerPricingType
  startTime: string
  endTime: string
  pricePerSlot: number
  slotDurationMinutes: number
}

export const OwnerPricingView: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([])
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('')
  const [rules, setRules] = useState<PriceRule[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [customerFilter, setCustomerFilter] = useState<'ALL' | CustomerPricingType>('ALL')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formState, setFormState] = useState<RuleFormState | null>(null)
  const [saving, setSaving] = useState(false)

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

  const currentFacility = useMemo(
    () => facilities.find((f) => f.id === selectedFacilityId) || facilities[0],
    [facilities, selectedFacilityId]
  )

  const loadRules = useCallback(async () => {
    if (!selectedFacilityId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await courtApi.getOwnerPriceRules(selectedFacilityId)
      setRules(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể tải bảng giá')
    } finally {
      setLoading(false)
    }
  }, [selectedFacilityId])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const filteredRules = useMemo(() => {
    if (customerFilter === 'ALL') return rules
    return rules.filter((r) => (r.customerType || 'CASUAL') === customerFilter)
  }, [rules, customerFilter])

  const handleOpenNew = () => {
    setFormState({
      courtId: '',
      name: 'Khung giờ vàng buổi tối',
      dayType: 'ALL',
      customerType: 'CASUAL',
      startTime: '17:00',
      endTime: '22:00',
      pricePerSlot: 130000,
      slotDurationMinutes: 60,
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (rule: PriceRule) => {
    setFormState({
      id: rule.id,
      courtId: rule.courtId || '',
      name: rule.name,
      dayType: rule.dayOfWeek,
      customerType: rule.customerType || 'CASUAL',
      startTime: rule.startTime,
      endTime: rule.endTime,
      pricePerSlot: rule.pricePerSlot || rule.pricePerHour,
      slotDurationMinutes: rule.slotDurationMinutes || 60,
    })
    setIsModalOpen(true)
  }

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState || !selectedFacilityId) return

    setSaving(true)
    try {
      const payload: PriceRuleUpsertPayload = {
        courtId: formState.courtId || null,
        name: formState.name.trim(),
        dayType: formState.dayType,
        customerType: formState.customerType,
        startTime: formState.startTime,
        endTime: formState.endTime,
        pricePerSlot: formState.pricePerSlot,
        slotDurationMinutes: formState.slotDurationMinutes,
      }

      if (formState.id) {
        await courtApi.updatePriceRule(formState.id, payload)
        toast.success('Đã cập nhật quy tắc bảng giá!')
      } else {
        await courtApi.createPriceRule(selectedFacilityId, payload)
        toast.success('Đã thêm khung giá mới thành công!')
      }
      setIsModalOpen(false)
      await loadRules()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu quy tắc giá thất bại')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRule = async (rule: PriceRule) => {
    if (!window.confirm(`Xóa khung giá "${rule.name}"?`)) return
    try {
      await courtApi.deletePriceRule(rule.id)
      toast.info('Đã xóa quy tắc giá')
      loadRules()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa quy tắc giá')
    }
  }

  return (
    <OwnerLayout
      title="Bảng giá Linh hoạt & Gói cố định tháng"
      subtitle="Thiết lập biểu phí theo ca hoạt động, cuối tuần, từng sân VIP và đối tượng khách vãng lai hoặc cố định tháng"
    >
      {/* Unified Workplace Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Top Control Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-800">Cụm sân:</span>
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

            <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 self-start">
              {[
                { id: 'ALL' as const, label: 'Tất cả biểu giá' },
                { id: 'CASUAL' as const, label: 'Khách vãng lai' },
                { id: 'FIXED_MONTHLY' as const, label: 'Cố định tháng' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCustomerFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    customerFilter === opt.id
                      ? 'bg-white text-[#168039]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs sm:text-sm font-bold transition-colors cursor-pointer self-start lg:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm quy tắc giá</span>
          </button>
        </div>

        {/* Visual Operating Hours Timeline Summary */}
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="text-slate-700 font-medium">
            Khung giờ hoạt động cơ sở:{' '}
            <strong className="text-slate-900">{currentFacility?.openHours || '05:30 - 23:00'}</strong>{' '}
            | Quy tắc sân con cụ thể sẽ được ưu tiên áp dụng trước quy tắc toàn cụm sân.
          </div>
          <span className="font-bold text-[#168039] shrink-0">
            Đang áp dụng {filteredRules.length} quy tắc
          </span>
        </div>

        {/* Rules Data Table */}
        {loading ? (
          <div className="p-10 text-center text-sm font-semibold text-slate-600">
            Đang tải bảng giá...
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="p-10 text-center text-xs sm:text-sm text-slate-600">
            Chưa có quy tắc giá nào cho bộ lọc hiện tại. Hệ thống sẽ dùng giá gốc của từng sân con.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3.5">Tên quy tắc giá</th>
                  <th className="p-3.5">Phạm vi sân</th>
                  <th className="p-3.5">Đối tượng khách</th>
                  <th className="p-3.5">Khung giờ</th>
                  <th className="p-3.5">Ngày áp dụng</th>
                  <th className="p-3.5">Đơn giá / giờ</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRules.map((rule) => {
                  const isFixed = rule.customerType === 'FIXED_MONTHLY'
                  return (
                    <tr key={rule.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{rule.name}</div>
                        <div className="text-[11px] text-slate-600">
                          Chu kỳ tính: {rule.slotDurationMinutes || 60} phút/ca
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-semibold">
                          <Layers className="w-3.5 h-3.5 text-slate-600" />
                          <span>{rule.courtName || 'Tất cả sân con'}</span>
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isFixed
                              ? 'bg-[#e5a92c] text-white'
                              : 'bg-emerald-50 text-[#168039] border border-emerald-200'
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{isFixed ? 'Cố định tháng' : 'Khách vãng lai'}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-800 font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#168039]" />
                          <span>
                            {rule.startTime} - {rule.endTime}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-700 font-semibold">
                        {rule.dayOfWeek === 'ALL'
                          ? 'Tất cả các ngày'
                          : rule.dayOfWeek === 'WEEKDAY'
                          ? 'Thứ 2 - Thứ 6'
                          : 'Thứ 7 & Chủ nhật'}
                      </td>
                      <td className="p-3.5 font-black text-[#168039] text-sm">
                        {rule.pricePerHour.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rule)}
                          className="p-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rule)}
                          className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 cursor-pointer"
                          title="Xóa quy tắc"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Rule Modal */}
      {isModalOpen && formState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full max-h-[min(90vh,700px)] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 sm:p-5 border-b border-slate-200 shrink-0 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {formState.id ? 'Cập nhật quy tắc bảng giá' : 'Thiết lập khung giá mới'}
                </h3>
                <p className="text-xs text-slate-600">{currentFacility?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              id="priceRuleUpsertForm"
              onSubmit={handleSaveRule}
              className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs sm:text-sm"
            >
              <div>
                <label className="text-slate-700 font-bold block mb-1">Tên khung giá *</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="VD: Giờ vàng buổi tối / Hợp đồng tháng T2-4-6"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Phạm vi áp dụng</label>
                  <select
                    value={formState.courtId}
                    onChange={(e) => setFormState({ ...formState, courtId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="">Toàn bộ các sân con</option>
                    {(currentFacility?.subCourts || []).map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        Riêng: {sc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Loại khách hàng</label>
                  <select
                    value={formState.customerType}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        customerType: e.target.value as CustomerPricingType,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="CASUAL">Khách vãng lai đặt lẻ</option>
                    <option value="FIXED_MONTHLY">Khách cố định theo tháng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    required
                    value={formState.startTime}
                    onChange={(e) => setFormState({ ...formState, startTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    required
                    value={formState.endTime}
                    onChange={(e) => setFormState({ ...formState, endTime: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-bold block mb-1">Ngày trong tuần</label>
                  <select
                    value={formState.dayType}
                    onChange={(e) =>
                      setFormState({ ...formState, dayType: e.target.value as DayTypeFilter })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="ALL">Tất cả các ngày</option>
                    <option value="WEEKDAY">Thứ 2 đến Thứ 6</option>
                    <option value="WEEKEND">Thứ 7 và Chủ nhật</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 font-bold block mb-1">Thời lượng mỗi ca</label>
                  <select
                    value={formState.slotDurationMinutes}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        slotDurationMinutes: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value={60}>60 phút / ca</option>
                    <option value={30}>30 phút / ca</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1">
                  Đơn giá cho 1 ca ({formState.slotDurationMinutes} phút) - VNĐ *
                </label>
                <input
                  type="number"
                  step="5000"
                  min={10000}
                  required
                  value={formState.pricePerSlot}
                  onChange={(e) =>
                    setFormState({ ...formState, pricePerSlot: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-black text-[#168039] text-sm"
                />
                <p className="text-[11px] text-slate-600 mt-1">
                  Quy đổi tương đương:{' '}
                  <strong>
                    {Math.round(
                      (formState.pricePerSlot * 60) / (formState.slotDurationMinutes || 60)
                    ).toLocaleString('vi-VN')}{' '}
                    đ / giờ
                  </strong>
                </p>
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
                form="priceRuleUpsertForm"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-[#168039] hover:bg-[#136c30] text-white text-xs font-bold cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? 'Đang lưu...' : 'Lưu quy tắc giá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </OwnerLayout>
  )
}
