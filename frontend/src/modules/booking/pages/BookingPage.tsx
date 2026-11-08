import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../services/bookingApi';
import type { TimeSlot } from '../types';
import { TimeSlotGrid } from '../components/TimeSlotGrid';
import { BookingSummaryCard } from '../components/BookingSummaryCard';
import { MyBookingsList } from '../components/MyBookingsList';

export const BookingPage: React.FC = () => {
  const queryClient = useQueryClient();

  // State bộ lọc ngày và sân
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedCourtId, setSelectedCourtId] = useState<number>(1);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Query danh sách slot của sân
  const {
    data: availability,
    isLoading: isLoadingAvailability,
    refetch: refetchAvailability,
  } = useQuery({
    queryKey: ['courtAvailability', selectedCourtId, selectedDate],
    queryFn: () => bookingApi.getCourtAvailability(selectedCourtId, selectedDate),
  });

  // 2. Query danh sách booking của khách
  const {
    data: myBookings = [],
    isLoading: isLoadingMyBookings,
    refetch: refetchMyBookings,
  } = useQuery({
    queryKey: ['myBookings'],
    queryFn: () => bookingApi.getMyBookings(),
  });

  // 3. Mutation tạo đơn giữ chỗ HELD (10 phút)
  const createBookingMutation = useMutation({
    mutationFn: (note: string) => {
      if (!selectedSlot) throw new Error('Chưa chọn khung giờ!');
      return bookingApi.createHeldBooking({
        courtId: selectedCourtId,
        bookingDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        note,
      });
    },
    onSuccess: (data) => {
      showToast(`Giữ chỗ thành công! Mã đơn #${data.id}. Thời gian giữ chỗ: 10 phút.`);
      setSelectedSlot(null);
      queryClient.invalidateQueries({ queryKey: ['courtAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Không thể đặt sân vào khung giờ này!';
      showToast(msg, 'error');
    },
  });

  // 4. Mutation hủy đơn đặt sân
  const cancelBookingMutation = useMutation({
    mutationFn: (bookingId: number) => bookingApi.cancelBooking(bookingId),
    onSuccess: (data) => {
      showToast(`Đã hủy đơn #${data.id} và giải phóng khung giờ thành công.`);
      queryClient.invalidateQueries({ queryKey: ['courtAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Hủy đơn thất bại!';
      showToast(msg, 'error');
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Toast thông báo */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50">
          <div
            className={`px-4 py-3 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-[#1b7a42] text-white border-emerald-700'
                : 'bg-rose-600 text-white border-rose-700'
            }`}
          >
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header thanh điều hướng */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1b7a42] text-white flex items-center justify-center font-black text-xl">
              🏸
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-lg leading-tight">SmashCourt Booking</h1>
              <p className="text-[11px] text-slate-500 font-medium">Hệ thống đặt sân & giữ chỗ thông minh</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-700">Nguyễn Văn Khách (ID: #1)</span>
          </div>
        </div>
      </header>

      {/* Nội dung chính */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Bộ điều khiển chọn ngày và chọn sân con */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Chọn Ngày */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày đặt sân:</label>
              <input
                type="date"
                value={selectedDate}
                min={todayStr}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-[#1b7a42] focus:outline-none cursor-pointer"
              />
            </div>

            {/* Chọn Sân con */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Chọn sân:</label>
              <div className="flex items-center gap-1.5">
                {[
                  { id: 1, name: 'Sân 1 (Yonex)' },
                  { id: 2, name: 'Sân 2 (Yonex)' },
                ].map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      setSelectedCourtId(c.id);
                      setSelectedSlot(null);
                    }}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                      selectedCourtId === c.id
                        ? 'bg-[#1b7a42] text-white border-[#1b7a42]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              refetchAvailability();
              refetchMyBookings();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#1b7a42] px-3 py-2 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors cursor-pointer"
          >
            Làm mới lịch
          </button>
        </div>

        {/* Khu vực Lưới Lịch + Thẻ Tóm Tắt */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <TimeSlotGrid
              availability={availability}
              selectedSlot={selectedSlot}
              onSelectSlot={(slot) => setSelectedSlot(slot)}
              isLoading={isLoadingAvailability}
            />
          </div>

          <div className="lg:col-span-1">
            <BookingSummaryCard
              courtName={availability?.courtName}
              facilityName={availability?.facilityName}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              onConfirmBooking={(note) => createBookingMutation.mutate(note)}
              isSubmitting={createBookingMutation.isPending}
            />
          </div>
        </div>

        {/* Danh sách đơn đặt sân của khách */}
        <MyBookingsList
          bookings={myBookings}
          onCancelBooking={(id) => cancelBookingMutation.mutate(id)}
          isLoading={isLoadingMyBookings}
        />
      </main>
    </div>
  );
};
