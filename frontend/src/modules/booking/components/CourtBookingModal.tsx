import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../services/bookingApi';
import { TimeSlot, BookingResponse } from '../types';
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
      <div className="relative w-full max-w-5xl bg-white rounded-3xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header Modal phẳng */}
        <div className="p-5 sm:p-6 bg-[#1b7a42] text-white flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">{facilityName}</span>
            <h2 className="text-lg sm:text-xl font-black mt-0.5">{courtName}</h2>
            {facilityAddress && (
              <p className="text-xs text-emerald-100 flex items-center gap-1 mt-1 font-medium">
                <MapPin className="w-3.5 h-3.5" />
                <span>{facilityAddress}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Thân Modal cuộn */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/60">
          {/* Bộ chọn ngày */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-[#1b7a42]" />
              <div>
                <label className="block text-xs font-bold text-slate-700">Chọn ngày đánh cầu:</label>
                <input
                  type="date"
                  value={selectedDate}
                  min={todayStr}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="text-xs font-bold px-3 py-1.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1b7a42] cursor-pointer"
                />
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium">
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
