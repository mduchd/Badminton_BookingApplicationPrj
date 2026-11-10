import { useNow } from '../../../hooks/useNow'
import { DialogFrame } from '../../../components/shared/DialogFrame'
import React, { useState, useRef } from 'react';
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
  initialDate: string;
  initialSlot: TimeSlot;
  onClose: () => void;
  onBookingSuccess: (booking: BookingResponse) => void;
}

export const CourtBookingModal: React.FC<CourtBookingModalProps> = ({
  isOpen,
  courtId,
  courtName,
  facilityName,
  facilityAddress,
  initialDate,
  initialSlot,
  onClose,
  onBookingSuccess,
}) => {
  const queryClient = useQueryClient();
  const now = useNow();
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(initialSlot);
  const bookingAttempt = useRef<{ payload: string; key: string } | null>(null);
  const { data: intervalCheck } = useQuery({
    queryKey: ['intervalCheck', courtId, selectedDate, selectedSlot?.startTime, selectedSlot?.endTime],
    queryFn: () => bookingApi.checkInterval(courtId, selectedDate, selectedSlot!.startTime, selectedSlot!.endTime),
    enabled: isOpen && !!selectedSlot,
    staleTime: 0,
    refetchInterval: 15000,
  });

  // Lấy dữ liệu availability của sân
  const { data: availability, isLoading } = useQuery({
    queryKey: ['courtAvailability', courtId, selectedDate],
    queryFn: () => bookingApi.getCourtAvailability(courtId, selectedDate),
    enabled: isOpen && !!courtId,
  });

  const visibleAvailability = availability && {
    ...availability,
    slots: availability.slots.map((slot) =>
      new Date(`${selectedDate}T${slot.startTime}+07:00`).getTime() <= now
        ? { ...slot, available: false, reason: 'Đã qua' }
        : slot
    ),
  };

  // Only confirm a slot that the latest availability response still marks available.
  const currentSlot = selectedSlot && intervalCheck?.isAvailable
    ? { ...selectedSlot, price: intervalCheck.calculatedPrice } : null;

  // Mutation tạo đơn giữ chỗ HELD
  const createBookingMutation = useMutation({
    mutationFn: (note: string) => {
      if (!currentSlot) throw new Error('Khung giờ không còn trống. Vui lòng chọn lại!');
      const payload = {
        courtId,
        bookingDate: selectedDate,
        startTime: currentSlot.startTime,
        endTime: currentSlot.endTime,
        note,
      };
      const serialized = JSON.stringify(payload);
      if (bookingAttempt.current?.payload !== serialized) bookingAttempt.current = { payload: serialized, key: crypto.randomUUID() };
      return bookingApi.createHeldBooking(payload, bookingAttempt.current.key);
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
    <DialogFrame className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs" onClose={onClose} label="Đặt sân">
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
                <input aria-label="Chọn ngày đánh cầu:"
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
              Khung giờ trống màu xanh, bấm chọn để xem giá
            </p>
          </div>

          {createBookingMutation.isError && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {createBookingMutation.error.message}
            </p>
          )}

          {/* Lưới giờ & Card tóm tắt */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="order-2 lg:order-1 lg:col-span-2">
              <TimeSlotGrid
                availability={visibleAvailability}
                selectedSlot={selectedSlot}
                onSelectSlot={(slot) => setSelectedSlot(slot)}
                isLoading={isLoading}
              />
            </div>

            <div className="order-1 lg:order-2 lg:col-span-1">
              <BookingSummaryCard
                formId="booking-confirm-form"
                courtName={courtName}
                facilityName={facilityName}
                selectedDate={selectedDate}
                selectedSlot={currentSlot}
                onConfirmBooking={(note) => createBookingMutation.mutate(note)}
                isSubmitting={createBookingMutation.isPending}
              />
            </div>
          </div>
        </div>
        <footer className="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
          <button type="submit" form="booking-confirm-form" disabled={!currentSlot || createBookingMutation.isPending} className="w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 rounded-xl bg-[#1b7a42] hover:bg-[#156335] px-4 py-3 text-sm font-semibold text-white">{createBookingMutation.isPending ? 'Đang giữ chỗ…' : 'Xác nhận giữ chỗ'}</button>
        </footer>
      </div>
    </DialogFrame>
  );
};
