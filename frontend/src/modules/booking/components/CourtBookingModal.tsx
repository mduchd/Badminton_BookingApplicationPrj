import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../services/bookingApi';
import type { TimeSlot, BookingResponse } from '../types';
import { TimeSlotGrid } from './TimeSlotGrid';
import { BookingSummaryCard } from './BookingSummaryCard';

interface CourtBookingModalProps {
  isOpen: boolean;
  courtId: number;
  courtName: string;
  facilityName: string;
  facilityAddress?: string;
  onClose: () => void;
  onBookingSuccess: (booking: BookingResponse) => void;
}

export const CourtBookingModal: React.FC<CourtBookingModalProps> = ({
  isOpen,
  courtId,
  courtName,
  facilityName,
  facilityAddress,
  onClose,
  onBookingSuccess,
}) => {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Lấy dữ liệu availability của sân
  const { data: availability, isLoading } = useQuery({
    queryKey: ['courtAvailability', courtId, selectedDate],
    queryFn: () => bookingApi.getCourtAvailability(courtId, selectedDate),
    enabled: isOpen && !!courtId,
  });

  // Mutation tạo đơn giữ chỗ HELD
  const createBookingMutation = useMutation({
    mutationFn: (note: string) => {
      if (!selectedSlot) throw new Error('Vui lòng chọn khung giờ trống!');
      return bookingApi.createHeldBooking({
        courtId,
        bookingDate: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        note,
        customerId: 1,
      });
    },
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: ['courtAvailability'] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      onBookingSuccess(booking);
      onClose();
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl border border-slate-200 overflow-hidden max-h-[min(90vh,720px)] flex flex-col">
        {/* Header Modal thanh lịch nền sáng */}
        <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs font-semibold text-[#1b7a42]">{facilityName}</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">{courtName}</h2>
            {facilityAddress && (
              <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{facilityAddress}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thân Modal cuộn */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          {/* Bộ chọn ngày */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-[#1b7a42]" />
              <div>
                <label className="block text-xs font-bold text-slate-800">Chọn ngày đánh cầu:</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={todayStr}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1b7a42] cursor-pointer mt-1"
                />
              </div>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Khung giờ trống màu xanh, bấm chọn để xem giá snapshot
            </p>
          </div>

          {/* Lưới giờ & Card tóm tắt */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2">
              <TimeSlotGrid
                availability={availability}
                selectedSlot={selectedSlot}
                onSelectSlot={(slot) => setSelectedSlot(slot)}
                isLoading={isLoading}
              />
            </div>

            <div className="lg:col-span-1">
              <BookingSummaryCard
                courtName={courtName}
                facilityName={facilityName}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                onConfirmBooking={(note) => createBookingMutation.mutate(note)}
                isSubmitting={createBookingMutation.isPending}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
