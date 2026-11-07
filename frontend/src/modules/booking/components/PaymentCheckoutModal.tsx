import React, { useState, useEffect } from 'react';
import { X, CreditCard, QrCode, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../services/bookingApi';
import type { BookingResponse, CheckoutResponse } from '../types';
import { toast } from 'sonner';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  booking: BookingResponse | null;
  onClose: () => void;
  onPaymentSuccess: (bookingId: number) => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  booking,
  onClose,
  onPaymentSuccess,
}) => {
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<'PAYOS' | 'MOCK'>('MOCK');
  const [checkoutData, setCheckoutData] = useState<CheckoutResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(600);

  // Đếm ngược 10 phút giữ chỗ
  useEffect(() => {
    if (!isOpen || !booking) return;

    const expiresAt = booking.holdExpiresAt ? new Date(booking.holdExpiresAt).getTime() : Date.now() + 600000;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        toast.error('Hết thời gian giữ chỗ 10 phút! Vui lòng chọn lại sân.');
        onClose();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, booking, onClose]);

  // Mutation khởi tạo checkout
  const createCheckoutMutation = useMutation({
    mutationFn: (method: 'PAYOS' | 'MOCK') => {
      if (!booking) throw new Error('Không tìm thấy thông tin đơn đặt sân!');
      return bookingApi.createCheckout(booking.id, { paymentMethod: method });
    },
    onSuccess: (data) => {
      setCheckoutData(data);
    },
    onError: (err: any) => {
      toast.error('Khởi tạo thanh toán thất bại: ' + (err.response?.data?.message || err.message));
    },
  });

  // Tự động khởi tạo phiên checkout khi mở modal
  useEffect(() => {
    if (isOpen && booking) {
      createCheckoutMutation.mutate(paymentMethod);
    }
  }, [isOpen, booking, paymentMethod]);

  // Mutation giả lập thanh toán thành công (Mock test)
  const mockPayMutation = useMutation({
    mutationFn: () => {
      if (!booking) throw new Error('Không tìm thấy đơn!');
      return bookingApi.mockPaySuccess(booking.id, checkoutData?.orderCode);
    },
    onSuccess: () => {
      if (booking) {
        queryClient.invalidateQueries({ queryKey: ['myBookings'] });
        queryClient.invalidateQueries({ queryKey: ['courtAvailability'] });
        toast.success(`Thanh toán thành công đơn #SMC-${booking.id}! Lịch chơi đã được xác nhận.`);
        onPaymentSuccess(booking.id);
        onClose();
      }
    },
    onError: (err: any) => {
      toast.error('Thanh toán thất bại: ' + (err.response?.data?.message || err.message));
    },
  });

  if (!isOpen || !booking) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const formatVND = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="p-5 sm:p-6 bg-[#1b7a42] text-white flex items-center justify-between flex-shrink-0">
          <div>
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider">Thanh toán đặt sân</span>
            <h2 className="text-lg sm:text-xl font-black mt-0.5">Đơn đặt #{booking.id} - {booking.courtName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Thân Modal */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50/60">
          {/* Cảnh báo đếm ngược giữ chỗ */}
          <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Thời gian giữ chỗ còn lại:</span>
            </div>
            <span className="font-mono font-black text-sm text-amber-800 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-300">
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
              <span className="font-bold text-[#168039]">{booking.startTime.substring(0, 5)} - {booking.endTime.substring(0, 5)}</span>
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
                <p className="text-[11px] text-slate-500">Dành cho dev & kiểm thử local không cần tiền thật</p>
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
                <p className="text-[11px] text-slate-500">Quét mã QR chuyển khoản ngân hàng qua cổng payOS</p>
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
              <p className="leading-relaxed">
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
                    Đang xử lý thanh toán...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Xác nhận thanh toán giả lập (Mock Test)
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
        </div>
      </div>
    </div>
  );
};
