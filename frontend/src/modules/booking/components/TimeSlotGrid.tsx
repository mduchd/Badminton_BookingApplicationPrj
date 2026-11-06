import React from 'react';
import type { CourtAvailability, TimeSlot } from '../types';

interface TimeSlotGridProps {
  availability?: CourtAvailability;
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  isLoading: boolean;
}

export const TimeSlotGrid: React.FC<TimeSlotGridProps> = ({
  availability,
  selectedSlot,
  onSelectSlot,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-2xl border border-slate-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-3 border-[#1b7a42] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-600 font-medium">Đang tải lịch sân...</span>
        </div>
      </div>
    );
  }

  if (!availability || !availability.slots || availability.slots.length === 0) {
    return (
      <div className="flex justify-center items-center h-48 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
        <p className="text-slate-600 text-xs font-medium">Không có dữ liệu lịch sân trong ngày này.</p>
      </div>
    );
  }

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5);
  };

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6">
      {/* Header trạng thái */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">{availability.courtName}</h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Giờ mở cửa: {formatTime(availability.openTime)} – {formatTime(availability.closeTime)}
          </p>
        </div>

        {/* Chú thích màu sắc phẳng */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-500"></span>
            <span className="text-slate-700 font-medium">Trống</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-50 border border-amber-400"></span>
            <span className="text-slate-700 font-medium">Đang giữ chỗ</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-50 border border-rose-400"></span>
            <span className="text-slate-700 font-medium">Đã đặt</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-200 border border-slate-300"></span>
            <span className="text-slate-700 font-medium">Bảo trì</span>
          </span>
        </div>
      </div>

      {/* Grid danh sách khung giờ phẳng */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-5">
        {availability.slots.map((slot) => {
          const isSelected = selectedSlot?.startTime === slot.startTime;
          const isAvailable = slot.available;

          let btnClass = "relative flex flex-col p-3 rounded-xl border transition-colors text-left ";

          if (!isAvailable) {
            if (slot.slotStatus === 'HELD') {
              btnClass += "bg-amber-50 border-amber-200 text-amber-900 cursor-not-allowed opacity-85";
            } else if (slot.slotStatus === 'MAINTENANCE') {
              btnClass += "bg-slate-100 border-slate-200 text-slate-600 cursor-not-allowed opacity-80";
            } else {
              btnClass += "bg-rose-50 border-rose-200 text-rose-900 cursor-not-allowed opacity-85";
            }
          } else if (isSelected) {
            btnClass += "bg-[#1b7a42] border-[#1b7a42] text-white cursor-pointer ring-2 ring-[#1b7a42] ring-offset-1";
          } else {
            btnClass += "bg-white hover:bg-emerald-50/60 border-slate-200 hover:border-[#1b7a42] text-slate-800 cursor-pointer";
          }

          return (
            <button
              type="button"
              key={slot.startTime}
              disabled={!isAvailable}
              onClick={() => onSelectSlot(slot)}
              className={btnClass}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                </span>
              </div>

              <div className="text-[11px] font-medium mt-0.5">
                {isAvailable ? (
                  <span className={isSelected ? 'text-emerald-100 font-bold' : 'text-[#168039] font-bold'}>
                    {formatVND(slot.price)}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold">
                    {slot.slotStatus === 'HELD' ? 'Đang giữ' : slot.slotStatus === 'MAINTENANCE' ? 'Bảo trì' : 'Đã đặt'}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
