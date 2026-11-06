import React from 'react';
import { CourtAvailability, TimeSlot } from '../types';

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
      <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-500 font-medium">Đang tải lịch sân...</span>
        </div>
      </div>
    );
  }

  if (!availability || !availability.slots || availability.slots.length === 0) {
    return (
      <div className="flex justify-center items-center h-48 bg-gray-50 rounded-xl border border-dashed border-gray-300">
        <p className="text-gray-500 text-sm">Không có dữ liệu lịch sân trong ngày này.</p>
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      {/* Header trạng thái */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-gray-100 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{availability.courtName}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Giờ mở cửa: {formatTime(availability.openTime)} - {formatTime(availability.closeTime)}
          </p>
        </div>

        {/* Chú thích màu sắc */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-400"></span>
            <span className="text-gray-600">Trống</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-50 border border-amber-400"></span>
            <span className="text-gray-600">Đang giữ chỗ (10p)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-50 border border-rose-400"></span>
            <span className="text-gray-600">Đã đặt</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-gray-200"></span>
            <span className="text-gray-600">Bảo trì</span>
          </span>
        </div>
      </div>

      {/* Grid danh sách khung giờ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
        {availability.slots.map((slot) => {
          const isSelected = selectedSlot?.startTime === slot.startTime;
          const isAvailable = slot.available;

          let btnClass = "relative flex flex-col p-3 rounded-xl border transition-all text-left ";

          if (!isAvailable) {
            if (slot.slotStatus === 'HELD') {
              btnClass += "bg-amber-50/70 border-amber-200 text-amber-800 cursor-not-allowed opacity-80";
            } else if (slot.slotStatus === 'MAINTENANCE') {
              btnClass += "bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed opacity-75";
            } else {
              btnClass += "bg-rose-50/70 border-rose-200 text-rose-800 cursor-not-allowed opacity-80";
            }
          } else if (isSelected) {
            btnClass += "bg-emerald-600 border-emerald-600 text-white shadow-md ring-2 ring-emerald-500 ring-offset-2";
          } else {
            btnClass += "bg-white hover:bg-emerald-50/50 border-gray-200 hover:border-emerald-300 text-gray-800 cursor-pointer shadow-xs";
          }

          return (
            <button
              key={slot.startTime}
              disabled={!isAvailable}
              onClick={() => onSelectSlot(slot)}
              className={btnClass}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                </span>
              </div>

              <div className="text-[11px] font-medium mt-1">
                {isAvailable ? (
                  <span className={isSelected ? 'text-emerald-100 font-bold' : 'text-emerald-700 font-semibold'}>
                    {formatVND(slot.price)}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider">
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
