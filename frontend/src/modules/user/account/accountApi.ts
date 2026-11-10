import { API_BASE_URL } from '../../../lib/apiConfig'
import { authStorage, type ApiResponse } from '../auth/authApi'
import type { User } from '../../types/user'

export async function accountRequest<T>(path: string, method = 'GET', body?: unknown, accessToken?: string): Promise<T> {
  const token = accessToken || authStorage.getToken()
  const response = await fetch(`${API_BASE_URL}/v1/${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result: ApiResponse<T> = await response.json()
  if (!response.ok || !result.success) throw new Error(result.message || 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.')
  return result.data
}
export const accountApi = {
  updateProfile: (fullName: string, phone: string) => accountRequest<User>('account/profile', 'PATCH', { fullName, phone }),
  integrations: () => accountRequest<{ push: boolean; calendar: boolean }>('account/integrations'),
  subscribePush: (token: string) => accountRequest<User>('account/push', 'POST', { token }),
  unsubscribePush: (token?: string, accessToken?: string) => accountRequest<User>('account/push', 'DELETE', token ? { token } : undefined, accessToken),
  connectCalendar: () => accountRequest<{ url: string; callbackOrigin: string }>('account/calendar/connect', 'POST'),
  disconnectCalendar: () => accountRequest<User>('account/calendar', 'DELETE'),
  forgotPassword: (email: string) => accountRequest<void>('auth/forgot-password', 'POST', { email }),
  resetPassword: (token: string, password: string) => accountRequest<void>('auth/reset-password', 'POST', { token, password }),
}
