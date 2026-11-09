import React from 'react'
import { X, Filter, RotateCcw, MapPin, Calendar, Clock, DollarSign, Check } from 'lucide-react'
import type { SearchCriteria } from '../../types/user'
import { useQuery } from '@tanstack/react-query'
import { courtApi } from '../../court/services/courtApi'

interface SmartFilterModalProps {
  isOpen: boolean
  criteria: SearchCriteria
  onClose: () => void
  onChangeCriteria: (criteria: SearchCriteria) => void
  onApply: () => void
  onReset: () => void
}

export const SmartFilterModal: React.FC<SmartFilterModalProps> = ({
  isOpen,
  criteria,
  onClose,
  onChangeCriteria,
  onApply,
  onReset,
}) => {
  const { data: metadata } = useQuery({
    queryKey: ['facilityFilterMetadata'],
    queryFn: courtApi.getFilterMetadata,
    enabled: isOpen,
  })
  if (!isOpen) return null
  const availableDistricts = metadata?.districts ?? []
  const availableAmenities = metadata?.amenities ?? []

  const handleToggleAmenity = (amenity: string) => {
    const list = criteria.amenities || []
    const updated = list.includes(amenity)
      ? list.filter((a) => a !== amenity)
      : [...list, amenity]
    onChangeCriteria({ ...criteria, amenities: updated })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overlay-enter">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[min(90vh,700px)] sm:modal-enter max-sm:sheet-enter">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <Filter className="w-6 h-6 text-[#1b7a42] shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">Bộ lọc sân chi tiết</h3>
              <p className="text-xs text-slate-600 font-medium">Tùy chỉnh tiêu chí tìm kiếm theo nhu cầu của bạn</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 text-sm">
          {/* 1. District */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-800 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#1b7a42]" />
              <span>Khu vực / Quận huyện</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableDistricts.map((d) => {
                const val = d === 'Tất cả quận/huyện' ? '' : d
                const isSelected = criteria.district === val
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onChangeCriteria({ ...criteria, district: val })}
                    className={`py-2.5 px-3 rounded-xl border text-center font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1b7a42] bg-emerald-50 text-[#1b7a42] ring-1 ring-[#1b7a42]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Date */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1b7a42]" />
              <span>Ngày đặt sân</span>
            </label>
            <input
              type="date"
              value={criteria.date}
              onChange={(e) => onChangeCriteria({ ...criteria, date: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-800 font-bold text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-[#1b7a42]"
            />
          </div>

          {/* 3. Time Range */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1b7a42]" />
              <span>Khung giờ liên tục</span>
            </label>
            <div className="flex items-center gap-3">
              <select
                value={criteria.startTime}
                onChange={(e) => onChangeCriteria({ ...criteria, startTime: e.target.value })}
                className="w-1/2 p-3 rounded-xl border border-slate-200 text-slate-800 font-bold text-sm sm:text-base focus:outline-none"
              >
                {['06:00', '17:00', '18:00', '19:00', '20:00'].map((t) => (
                  <option key={t} value={t}>
                    Từ {t}
                  </option>
                ))}
              </select>
              <span className="font-extrabold text-slate-600">-</span>
              <select
                value={criteria.endTime}
                onChange={(e) => onChangeCriteria({ ...criteria, endTime: e.target.value })}
                className="w-1/2 p-3 rounded-xl border border-slate-200 text-slate-800 font-bold text-sm sm:text-base focus:outline-none"
              >
                {['08:00', '19:00', '20:00', '21:00', '22:00'].map((t) => (
                  <option key={t} value={t}>
                    Đến {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Price Limit */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-extrabold text-slate-800 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#1b7a42]" />
                <span>Giá tối đa mỗi giờ</span>
              </label>
              <span className="font-black text-[#1b7a42] text-sm sm:text-base">
                {((criteria.maxPricePerHour || 200000)).toLocaleString('vi-VN')} đ/h
              </span>
            </div>
            <input
              type="range"
              min="80000"
              max="250000"
              step="10000"
              value={criteria.maxPricePerHour || 200000}
              onChange={(e) => onChangeCriteria({ ...criteria, maxPricePerHour: Number(e.target.value) })}
              className="w-full accent-[#1b7a42] cursor-pointer"
            />
          </div>

          {/* 5. Amenities */}
          <div className="space-y-2">
            <label className="font-extrabold text-slate-800">Tiện ích đi kèm</label>
            <div className="flex flex-wrap gap-2">
              {availableAmenities.map((amenity) => {
                const isSelected = criteria.amenities?.includes(amenity)
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => handleToggleAmenity(amenity)}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#1b7a42] bg-emerald-50 text-[#1b7a42] ring-1 ring-[#1b7a42]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#1b7a42]" />}
                    <span>{amenity}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Đặt lại</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onApply()
              onClose()
            }}
            className="px-7 py-3 rounded-xl bg-[#1b7a42] hover:bg-[#156335] text-white text-xs sm:text-sm font-black transition-colors cursor-pointer"
          >
            Áp dụng bộ lọc
          </button>
        </div>
      </div>
    </div>
  )
}
