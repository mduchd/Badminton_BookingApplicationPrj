import { isAxiosError } from 'axios'

export function errorMessage(error: unknown, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.'): string {
  if (isAxiosError<{ message?: string }>(error)) return error.response?.data?.message || error.message || fallback
  return error instanceof Error ? error.message : fallback
}
