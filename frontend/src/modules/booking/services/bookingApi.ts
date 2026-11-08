import axios from 'axios';
import type { ApiResponse, BookingCreateRequest, BookingResponse, CheckoutRequest, CheckoutResponse, CourtAvailability } from '../types';
import { API_BASE_URL } from '../../../lib/apiConfig';
import { authStorage } from '../../user/auth/authApi';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use((config) => {
  const token = authStorage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const bookingApi = {
  // Lấy danh sách slot và trạng thái sân theo ngày
  async getCourtAvailability(courtId: number, date: string): Promise<CourtAvailability> {
    const response = await client.get<ApiResponse<CourtAvailability>>(
      `/courts/${courtId}/availability`,
      { params: { date } }
    );
    return response.data.data;
  },

  // Tạo đơn giữ chỗ (HELD 10 phút)
  async createHeldBooking(payload: BookingCreateRequest): Promise<BookingResponse> {
    const response = await client.post<ApiResponse<BookingResponse>>('/bookings', payload);
    return response.data.data;
  },

  // Lấy danh sách booking của khách hàng
  async getMyBookings(): Promise<BookingResponse[]> {
    const response = await client.get<ApiResponse<BookingResponse[]>>('/bookings/me');
    return response.data.data;
  },

  // Lấy chi tiết 1 booking
  async getBookingById(bookingId: number): Promise<BookingResponse> {
    const response = await client.get<ApiResponse<BookingResponse>>(`/bookings/${bookingId}`);
    return response.data.data;
  },

  // Hủy đơn đặt sân và giải phóng occupancy
  async cancelBooking(bookingId: number): Promise<BookingResponse> {
    const response = await client.post<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/cancel`
    );
    return response.data.data;
  },

  // Khởi tạo phiên thanh toán (MOCK hoặc PAYOS)
  async createCheckout(bookingId: number, payload: CheckoutRequest): Promise<CheckoutResponse> {
    const response = await client.post<ApiResponse<CheckoutResponse>>(
      `/bookings/${bookingId}/checkout`,
      payload
    );
    return response.data.data;
  },

  // Lấy thông tin thanh toán theo bookingId
  async getPaymentByBookingId(bookingId: number): Promise<any> {
    const response = await client.get<ApiResponse<any>>(
      `/payments/booking/${bookingId}`
    );
    return response.data.data;
  },
};

export const getCourtAvailability = bookingApi.getCourtAvailability;
export const createHeldBooking = bookingApi.createHeldBooking;
export const getMyBookings = bookingApi.getMyBookings;
export const getBookingById = bookingApi.getBookingById;
export const cancelBooking = bookingApi.cancelBooking;
export const createCheckout = bookingApi.createCheckout;
export const getPaymentByBookingId = bookingApi.getPaymentByBookingId;
