import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  X, 
  CreditCard, 
  QrCode, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  Check, 
  Calendar,
  ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';
import type { BookingResponse, CheckoutResponse } from '../types';
import { createCheckout, mockPaySuccess, getPaymentByBookingId } from '../services/bookingApi';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingResponse | null;
  onSuccess?: () => void;
  onPaymentSuccess?: () => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess,
  onPaymentSuccess,
}) => {
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<'MOCK' | 'PAYOS'>('MOCK');
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const handleComplete = () => {
    onSuccess?.();
    onPaymentSuccess?.();
    onClose();
  };

  // 1. Khởi tạo phiên checkout
  const { data: checkoutData } = useQuery<CheckoutResponse>({
    queryKey: ['checkout-session', booking?.id, paymentMethod],
    queryFn: () => createCheckout(booking!.id, { paymentMethod }),
    enabled: isOpen && !!booking && !isPaid,
  });

  // 2. Poll kiểm tra trạng thái thanh toán khi chọn payOS
  const { data: paymentStatus } = useQuery({
    queryKey: ['payment-status', booking?.id],
    queryFn: () => getPaymentByBookingId(booking!.id),
    enabled: isOpen && !!booking && paymentMethod === 'PAYOS' && !isPaid,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (paymentStatus?.status === 'SUCCESS') {
      setIsPaid(true);
      toast.success('Thanh toán thành công! Sân đã được xác nhận.');
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    }
  }, [paymentStatus, queryClient]);

  // 3. Mutation thanh toán Mock
  const mockPayMutation = useMutation({
    mutationFn: () => mockPaySuccess(booking!.id, checkoutData?.orderCode || Date.now()),
    onSuccess: (res: any) => {
      setIsPaid(true);
      toast.success(res?.message || 'Thanh toán giả lập thành công!');
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Lỗi khi xác nhận thanh toán giả lập!');
    },
  });

  // Đồng hồ đếm ngược giữ chỗ
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!booking?.holdExpiresAt) return;
    const calculateTime = () => {
      const expires = new Date(booking.holdExpiresAt!).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [booking?.holdExpiresAt]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Đã sao chép nội dung chuyển khoản!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-200 overflow-hidden max-h-[min(90vh,700px)] flex flex-col">
        {/* Header Modal - Phong cách nền sáng thanh lịch tuân thủ Rule 11 */}
        <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <span className="text-xs font-semibold text-[#1b7a42]">Thanh toán đặt sân</span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              Đơn đặt #{booking.id} - {booking.courtName}
            </h2>
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

        {/* Thân Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/60">
          {isPaid ? (
            /* Màn hình thông báo thanh toán thành công */
            <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-50 text-[#1b7a42] rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8 text-[#1b7a42]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Thanh toán thành công!</h3>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Lịch đặt sân #{booking.id} tại {booking.facilityName} đã được xác nhận chính thức.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1.5 text-left font-medium">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sân thi đấu:</span>
                  <span className="font-bold text-slate-900">{booking.courtName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thời gian:</span>
                  <span className="font-bold text-[#168039]">
                    {booking.startTime.substring(0, 5)} - {booking.endTime.substring(0, 5)} ({booking.bookingDate})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số tiền đã trả:</span>
                  <span className="font-bold text-slate-900">{formatVND(booking.totalAmount)}</span>
                </div>
              </div>

              {/* Nút thêm vào Google Calendar */}
              {booking.googleCalendarUrl && (
                <div className="pt-2">
                  <a
                    href={booking.googleCalendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-[#1b7a42] rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-emerald-300 cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-[#1b7a42]" />
                    <span>Thêm vào Google Calendar</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#1b7a42]" />
                  </a>
                </div>
              )}

              <button
                type="button"
                onClick={handleComplete}
                className="w-full py-2.5 px-4 bg-[#1b7a42] hover:bg-[#156335] text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                Hoàn tất & Xem danh sách sân đã đặt
              </button>
            </div>
          ) : (
            <>
              {/* Cảnh báo đếm ngược giữ chỗ */}
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 text-amber-900 text-xs">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-medium">Thời gian giữ chỗ còn lại:</span>
                </div>
                <span className="font-mono font-bold text-sm text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
                  {timeFormatted}
                </span>
              </div>

              {/* Chi tiết đơn */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Cơ sở:</span>
                  <span className="font-bold text-slate-800">{booking.facilityName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Ngày chơi:</span>
                  <span className="font-bold text-slate-800">{booking.bookingDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Khung giờ:</span>
                  <span className="font-bold text-[#168039]">
                    {booking.startTime.substring(0, 5)} - {booking.endTime.substring(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-2">
                  <span className="text-slate-700 font-semibold">Tổng tiền thanh toán:</span>
                  <span className="text-lg font-black text-[#1b7a42]">{formatVND(booking.totalAmount)}</span>
                </div>
              </div>

              {/* Lựa chọn phương thức thanh toán */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Chọn phương thức thanh toán:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('MOCK')}
                    className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'MOCK'
                        ? 'border-[#1b7a42] bg-emerald-50/60 ring-2 ring-[#1b7a42] ring-offset-1'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-4 h-4 text-[#1b7a42]" />
                      <span className="text-xs font-bold text-slate-900">Thanh toán Test Mock</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Dành cho dev & kiểm thử local không cần tiền thật</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAYOS')}
                    className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                      paymentMethod === 'PAYOS'
                        ? 'border-[#1b7a42] bg-emerald-50/60 ring-2 ring-[#1b7a42] ring-offset-1'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <QrCode className="w-4 h-4 text-[#1b7a42]" />
                      <span className="text-xs font-bold text-slate-900">payOS (VietQR)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">Quét mã QR chuyển khoản ngân hàng qua cổng payOS</p>
                  </button>
                </div>
              </div>

              {/* Khu vực hiển thị theo phương thức */}
              {paymentMethod === 'PAYOS' ? (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-col items-center text-center space-y-3">
                  <p className="text-xs text-slate-600 font-medium">
                    Mở ứng dụng Ngân hàng bất kỳ để quét mã VietQR bên dưới:
                  </p>
                  {checkoutData?.qrCode ? (
                    <img
                      src={checkoutData.qrCode}
                      alt="VietQR code"
                      className="w-48 h-48 rounded-xl border border-slate-200 p-1 bg-white"
                    />
                  ) : (
                    <div className="w-48 h-48 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-400">
                      Đang tải mã QR...
                    </div>
                  )}
                  <div className="w-full flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-slate-500">Nội dung chuyển khoản:</span>
                    <span className="font-mono font-bold text-slate-800">SmashCourt #{booking.id}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`SmashCourt #${booking.id}`)}
                      className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
                      title="Sao chép"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 text-xs text-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#1b7a42]">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Chế độ kiểm thử Mock Payment:</span>
                  </div>
                  <p className="leading-relaxed font-medium">
                    Khi bấm nút <strong>"Xác nhận thanh toán giả lập"</strong>, hệ thống sẽ tự động cập nhật đơn sang trạng thái <strong>CONFIRMED</strong>, khóa lịch chính thức và bắn sự kiện xác nhận đơn mà không trừ tiền thực tế.
                  </p>
                </div>
              )}

              {/* Nút hành động */}
              <div className="pt-2">
                {paymentMethod === 'MOCK' ? (
                  <button
                    type="button"
                    disabled={mockPayMutation.isPending}
                    onClick={() => mockPayMutation.mutate()}
                    className="w-full py-3 px-4 bg-[#1b7a42] hover:bg-[#156335] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {mockPayMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Đang xử lý thanh toán...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Xác nhận thanh toán giả lập (Mock Test)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      toast.info('Hệ thống đang chờ tín hiệu Webhook từ ngân hàng...');
                    }}
                    className="w-full py-3 px-4 bg-[#1b7a42] hover:bg-[#156335] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Đã chuyển khoản xong (Đang chờ đối soát)
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
