import React, { useEffect, useState } from 'react';
import { BookingResponse, BookingStatus } from '../types';

interface MyBookingsListProps {
  bookings: BookingResponse[];
  onCancelBooking: (id: number) => void;
  isLoading: boolean;
}

export const MyBookingsList: React.FC<MyBookingsListProps> = ({
  bookings,
  onCancelBooking,
  isLoading,
}) => {
  const [, setTick] = useState(0);

  // Tick mỗi giây để cập nhật đồng hồ đếm ngược giữ chỗ
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
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Đang giữ ({remaining})
          </span>
        );
      }
      case 'PENDING_PAYMENT':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-300">
            Chờ thanh toán
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            Đã xác nhận
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
            Hoàn thành
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800">
            Đã hủy
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-600">
            Hết hạn giữ chỗ
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-8">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Lịch Sử Đặt Sân Của Bạn</h2>
          <p className="text-xs text-gray-500">Quản lý và theo dõi trạng thái các đơn đặt sân gần đây</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-400 text-xs">Đang tải lịch sử đơn...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-xs">Bạn chưa có đơn đặt sân nào.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/50">
                <th className="py-2.5 px-3 font-semibold">Mã đơn</th>
                <th className="py-2.5 px-3 font-semibold">Sân & Cơ sở</th>
                <th className="py-2.5 px-3 font-semibold">Ngày chơi</th>
                <th className="py-2.5 px-3 font-semibold">Khung giờ</th>
                <th className="py-2.5 px-3 font-semibold">Tổng tiền</th>
                <th className="py-2.5 px-3 font-semibold">Trạng thái</th>
                <th className="py-2.5 px-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/60 transition">
                  <td className="py-3 px-3 font-mono font-bold text-gray-700">#{b.id}</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-gray-900">{b.courtName}</div>
                    <div className="text-[11px] text-gray-400">{b.facilityName}</div>
                  </td>
                  <td className="py-3 px-3 text-gray-700 font-medium">{b.bookingDate}</td>
                  <td className="py-3 px-3 text-emerald-700 font-semibold">
                    {formatTime(b.startTime)} - {formatTime(b.endTime)}
                  </td>
                  <td className="py-3 px-3 font-bold text-gray-900">{formatVND(b.totalAmount)}</td>
                  <td className="py-3 px-3">{renderStatusBadge(b.status, b.holdExpiresAt)}</td>
                  <td className="py-3 px-3 text-right">
                    {(b.status === 'HELD' || b.status === 'PENDING_PAYMENT') && (
                      <button
                        onClick={() => onCancelBooking(b.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition cursor-pointer"
                      >
                        Hủy giữ chỗ
                      </button>
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
