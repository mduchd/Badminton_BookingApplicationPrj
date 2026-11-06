import React, { useState } from 'react';
import { TimeSlot } from '../types';

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
  facilityName = 'Cụm Sân Cầu Lông Pro',
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
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center h-full min-h-[320px]">
        <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900 text-sm">Chưa chọn khung giờ</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">
          Vui lòng bấm vào một ô giờ màu xanh trống trên bảng lưới để xem chi tiết giá và tiến hành đặt giữ chỗ.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-base">Tóm Tắt Đơn Đặt Sân</h3>
          <span className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
            Giữ chỗ 10 phút
          </span>
        </div>

        <div className="space-y-3 mt-4 text-sm">
          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500 text-xs">Cơ sở:</span>
            <span className="font-semibold text-gray-800 text-xs">{facilityName}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500 text-xs">Sân:</span>
            <span className="font-semibold text-gray-800 text-xs">{courtName}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500 text-xs">Ngày chơi:</span>
            <span className="font-semibold text-gray-800 text-xs">{selectedDate}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-gray-50">
            <span className="text-gray-500 text-xs">Khung giờ:</span>
            <span className="font-bold text-emerald-600 text-xs">
              {formatTime(selectedSlot.startTime)} - {formatTime(selectedSlot.endTime)}
            </span>
          </div>

          <div className="flex justify-between items-baseline pt-2">
            <span className="text-gray-700 font-medium text-xs">Giá snapshot:</span>
            <span className="text-lg font-extrabold text-emerald-600">
              {formatVND(selectedSlot.price)}
            </span>
          </div>
        </div>

        {/* Ghi chú */}
        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Ghi chú (tùy chọn):</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ví dụ: Cần mượn vợt, nước uống..."
            className="w-full text-xs px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
          />
        </div>

        {/* Cảnh báo giữ chỗ */}
        <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
          <div className="flex items-start gap-1.5 font-semibold text-amber-900 mb-0.5">
            <svg className="w-4 h-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Chính sách giữ chỗ:
          </div>
          Sau khi bấm đặt, sân sẽ được khóa cho bạn trong đúng <strong>10 phút</strong>. Hết 10 phút nếu chưa thanh toán, hệ thống sẽ tự động giải phóng cho người khác đặt.
        </div>
      </div>

      <button
        disabled={isSubmitting}
        onClick={() => onConfirmBooking(note)}
        className="w-full mt-6 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Đang xử lý giữ chỗ...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            Xác Nhận Giữ Chỗ (10 Phút)
          </>
        )}
      </button>
    </div>
  );
};
