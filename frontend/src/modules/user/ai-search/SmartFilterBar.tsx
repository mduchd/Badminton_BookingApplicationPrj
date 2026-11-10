import React from 'react'
import { MapPin, Calendar as CalendarIcon, Clock, DollarSign, Filter, Sparkles, RotateCcw } from 'lucide-react'
import type { SearchCriteria } from '../../types/user'
import { useQuery } from '@tanstack/react-query'
import { courtApi } from '../../court/services/courtApi'

interface SmartFilterBarProps {
  criteria: SearchCriteria
  onChangeCriteria: (newCriteria: SearchCriteria) => void
  onSearch: () => void
  onOpenAIChat: () => void
  onReset: () => void
  isLoading?: boolean
}

export const SmartFilterBar: React.FC<SmartFilterBarProps> = ({
  criteria,
  onChangeCriteria,
  onSearch,
  onOpenAIChat,
  onReset,
  isLoading,
}) => {
  const { data: metadata } = useQuery({
    queryKey: ['facilityFilterMetadata'],
    queryFn: courtApi.getFilterMetadata,
  })
  const availableDistricts = metadata?.districts ?? []
  const availableAmenities = metadata?.amenities ?? []

  const getFormattedDate = (offsetDays: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
    return d.toISOString().split('T')[0]
  }

  const todayStr = getFormattedDate(0)
  const tomorrowStr = getFormattedDate(1)

  const handleQuickDate = (dateStr: string) => {
    onChangeCriteria({ ...criteria, date: dateStr })
  }

  const handleToggleAmenity = (amenity: string) => {
    const current = criteria.amenities || []
    const updated = current.includes(amenity)
      ? current.filter((a) => a !== amenity)
      : [...current, amenity]
    onChangeCriteria({ ...criteria, amenities: updated })
  }

  return (
    <div className="w-full bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-5 sm:p-6 transition-all">
      {/* Top Banner Row inside Card */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Bộ lọc tìm sân thông minh (Smart Filter)</h3>
            <p className="text-[11px] text-slate-500">Tra cứu tình trạng sân trống & giá niêm yết theo thời gian thực</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
            title="Đặt lại bộ lọc"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Mặc định</span>
          </button>

          {/* AI Shortcut Button (Solid Flat Color) */}
          <button
            type="button"
            onClick={onOpenAIChat}
            className="px-3.5 py-1.5 rounded-xl bg-[#1b7a42] hover:bg-[#156335] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>Hỏi AI tìm sân</span>
          </button>
        </div>
      </div>

      {/* Main 4 Criteria Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Location / District */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Khu vực / Quận</span>
          </label>
          <select aria-label="Khu vực / Quận"
            value={criteria.district}
            onChange={(e) => onChangeCriteria({ ...criteria, district: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
          >
            {availableDistricts.map((d) => (
              <option key={d} value={d === 'Tất cả quận/huyện' ? '' : d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Date */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ngày chơi</span>
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleQuickDate(todayStr)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium cursor-pointer ${
                  criteria.date === todayStr ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => handleQuickDate(tomorrowStr)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-medium cursor-pointer ${
                  criteria.date === tomorrowStr ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Ngày mai
              </button>
            </div>
          </div>
          <input
            type="date"
            value={criteria.date}
            onChange={(e) => onChangeCriteria({ ...criteria, date: e.target.value })}
            className="w-full px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* 3. Time Range */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Khung giờ liên tục</span>
          </label>
          <div className="flex items-center gap-1.5">
            <select aria-label="Khung giờ liên tục"
              value={criteria.startTime}
              onChange={(e) => onChangeCriteria({ ...criteria, startTime: e.target.value })}
              className="w-1/2 px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              {['17:00', '18:00', '19:00', '19:30', '20:00'].map((t) => (
                <option key={t} value={t}>
                  Từ {t}
                </option>
              ))}
            </select>
            <span className="text-slate-400 text-xs font-bold">-</span>
            <select aria-label="Khung giờ liên tục"
              value={criteria.endTime}
              onChange={(e) => onChangeCriteria({ ...criteria, endTime: e.target.value })}
              className="w-1/2 px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              {['19:00', '20:00', '21:00', '21:30', '22:00'].map((t) => (
                <option key={t} value={t}>
                  Đến {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Price & Search Button */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ngân sách tối đa</span>
          </label>
          <select aria-label="Ngân sách tối đa"
            value={criteria.maxPricePerHour || ''}
            onChange={(e) =>
              onChangeCriteria({
                ...criteria,
                maxPricePerHour: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
          >
            <option value="">Tất cả mức giá</option>
            <option value="120000">Dưới 120.000đ / giờ</option>
            <option value="150000">Dưới 150.000đ / giờ</option>
            <option value="200000">Dưới 200.000đ / giờ</option>
          </select>
        </div>
      </div>

      {/* Amenities Tags row */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">Tiện ích:</span>
          {availableAmenities.map((amenity) => {
            const isSelected = criteria.amenities?.includes(amenity)
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => handleToggleAmenity(amenity)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white '
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {amenity}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onSearch}
          disabled={isLoading}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ml-auto"
        >
          {isLoading ? (
            <span>Đang tra cứu availability...</span>
          ) : (
            <>
              <span>Tìm kiếm sân khả dụng</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
