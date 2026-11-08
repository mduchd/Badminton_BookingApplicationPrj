import React, { useState } from 'react';
import { Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { TimeSlot } from '../types';

interface BookingSummaryCardProps {
  courtName?: string;
  facilityName?: string;
  selectedDate: string;
  selectedSlot: TimeSlot | null;
  onConfirmBooking: (note: string) => void;
  isSubmitting: boolean;
}

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  courtName = 'Sân 1',
  facilityName = 'Cụm Sân Cầu Lông SmashCourt',
  selectedDate,
  selectedSlot,
  onConfirmBooking,
  isSubmitting,
}) => {
  const [note, setNote] = useState('');

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  if (!selectedSlot) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#1b7a42] flex items-center justify-center mb-3">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-900 text-sm">Chưa chọn khung giờ</h3>
        <p className="text-xs text-slate-600 font-medium mt-1 max-w-xs leading-relaxed">
          Vui lòng bấm vào ô giờ màu xanh trống trên bảng lưới để xem chi tiết giá và tiến hành giữ chỗ.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/90 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900 text-base">Tóm tắt đơn đặt sân</h3>
          <span className="px-2.5 py-1 text-[11px] font-bold bg-amber-50 text-amber-900 rounded-lg border border-amber-300">
            Giữ chỗ 10 phút
          </span>
        </div>

        <div className="space-y-3 mt-4 text-xs">
          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-600 font-medium">Cơ sở:</span>
            <span className="font-bold text-slate-900">{facilityName}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-600 font-medium">Sân đấu:</span>
            <span className="font-bold text-slate-900">{courtName}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-600 font-medium">Ngày chơi:</span>
            <span className="font-bold text-slate-900">{selectedDate}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-100">
            <span className="text-slate-600 font-medium">Khung giờ:</span>
            <span className="font-extrabold text-[#168039]">
              {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-2">
            <span className="text-slate-700 font-semibold text-xs">Giá snapshot:</span>
            <span className="text-lg font-black text-[#1b7a42]">
              {formatVND(selectedSlot.price)}
            </span>
          </div>
        </div>

        {/* Ghi chú */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ghi chú (tùy chọn):</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Cần mượn vợt, nước uống..."
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1b7a42] transition"
          />
        </div>

        {/* Cảnh báo giữ chỗ */}
        <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
          <div className="flex items-center gap-1.5 font-bold mb-0.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
            <span>Lưu ý giữ chỗ 10 phút:</span>
          </div>
          Liên hệ chủ sân để được hướng dẫn thanh toán và xác nhận đơn. Khung giờ sẽ tự động mở lại khi hết thời hạn giữ chỗ.
        </div>
      </div>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => onConfirmBooking(note)}
        className="w-full mt-6 py-3 px-4 bg-[#1b7a42] hover:bg-[#156335] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Đang xử lý giữ chỗ...
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            Xác nhận giữ chỗ (10 phút)
          </>
        )}
      </button>
    </div>
  );
};
