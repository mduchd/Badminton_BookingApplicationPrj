import axios from 'axios';
import { ApiResponse, BookingCreateRequest, BookingResponse, CourtAvailability } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
  async getMyBookings(customerId: number = 1): Promise<BookingResponse[]> {
    const response = await client.get<ApiResponse<BookingResponse[]>>('/bookings/me', {
      params: { customerId },
    });
    return response.data.data;
  },

  // Lấy chi tiết 1 booking
  async getBookingById(bookingId: number): Promise<BookingResponse> {
    const response = await client.get<ApiResponse<BookingResponse>>(`/bookings/${bookingId}`);
    return response.data.data;
  },

  // Hủy đơn đặt sân và giải phóng occupancy
  async cancelBooking(bookingId: number, customerId: number = 1): Promise<BookingResponse> {
    const response = await client.post<ApiResponse<BookingResponse>>(
      `/bookings/${bookingId}/cancel`,
      null,
      { params: { customerId } }
    );
    return response.data.data;
  },
};
