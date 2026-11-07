import React, { useEffect, useState } from 'react';
import type { BookingResponse, BookingStatus } from '../types';

interface MyBookingsListProps {
  bookings: BookingResponse[];
  onCancelBooking: (id: number) => void;
  onPayBooking?: (booking: BookingResponse) => void;
  isLoading: boolean;
}

export const MyBookingsList: React.FC<MyBookingsListProps> = ({
  bookings,
  onCancelBooking,
  onPayBooking,
  isLoading,
}) => {
  const [, setTick] = useState(0);

  // Cập nhật mỗi giây cho đồng hồ đếm ngược
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5);
  };

  const getRemainingHoldTime = (expiresAtStr?: string) => {
    if (!expiresAtStr) return null;
    const expires = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diff = expires - now;
    if (diff <= 0) return 'Hết hạn';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const renderStatusBadge = (status: BookingStatus, expiresAt?: string) => {
    switch (status) {
      case 'HELD': {
        const remaining = getRemainingHoldTime(expiresAt);
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Đang giữ ({remaining})
          </span>
        );
      }
      case 'PENDING_PAYMENT':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-50 text-sky-800 border border-sky-300">
            Chờ thanh toán
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300">
            Đã thanh toán / Xác nhận
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-700">
            Đã hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
            Đã hủy
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 text-slate-600">
            Hết hạn giữ chỗ
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 mt-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Danh sách đơn đặt sân của bạn</h2>
          <p className="text-xs text-slate-600 mt-0.5 font-medium">Theo dõi thời hạn giữ chỗ và trạng thái thanh toán đơn</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-slate-500 text-xs">Đang tải lịch sử đơn...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs font-medium">Bạn chưa có đơn đặt sân nào.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/70">
                <th className="py-2.5 px-3 font-semibold">Mã đơn</th>
                <th className="py-2.5 px-3 font-semibold">Sân đấu</th>
                <th className="py-2.5 px-3 font-semibold">Ngày chơi</th>
                <th className="py-2.5 px-3 font-semibold">Khung giờ</th>
                <th className="py-2.5 px-3 font-semibold">Tổng tiền</th>
                <th className="py-2.5 px-3 font-semibold">Trạng thái</th>
                <th className="py-2.5 px-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-slate-700">#SMC-{b.id}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">{b.courtName}</div>
                    <div className="text-[11px] text-slate-600">{b.facilityName}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-700 font-medium">{b.bookingDate}</td>
                  <td className="py-3 px-3 text-[#168039] font-bold">
                    {formatTime(b.startTime)} - {formatTime(b.endTime)}
                  </td>
                  <td className="py-3 px-3 font-bold text-slate-900">{formatVND(b.totalAmount)}</td>
                  <td className="py-3 px-3">{renderStatusBadge(b.status, b.holdExpiresAt)}</td>
                  <td className="py-3 px-3 text-right">
                    {(b.status === 'HELD' || b.status === 'PENDING_PAYMENT') && (
                      <div className="flex items-center justify-end gap-1.5">
                        {onPayBooking && (
                          <button
                            type="button"
                            onClick={() => onPayBooking(b)}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-[#1b7a42] hover:bg-[#156335] rounded-lg transition-colors cursor-pointer"
                          >
                            Thanh toán
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onCancelBooking(b.id)}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
