import type { User, UserRole } from '../../types/user'
import { API_BASE_URL } from '../../../lib/apiConfig'

const AUTH_API_URL = `${API_BASE_URL}/v1`
const TOKEN_KEY = 'smashcourt_auth_token'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface AuthResponseData {
  accessToken: string
  tokenType: string
  user: User
}

export const authStorage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  setToken: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch (e) {
      console.error('Không thể lưu token vào localStorage', e)
    }
  },
  removeToken: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch (e) {
      console.error('Không thể xóa token khỏi localStorage', e)
    }
  },
}

export const authApi = {
  async login(payload: { email: string; password: string }): Promise<AuthResponseData> {
    const response = await fetch(`${AUTH_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result: ApiResponse<AuthResponseData> = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Đăng nhập thất bại. Vui lòng thử lại.')
    }

    if (result.data?.accessToken) {
      authStorage.setToken(result.data.accessToken)
    }
    return result.data
  },

  async register(payload: {
    email: string
    password: string
    fullName: string
    phone?: string
    role?: UserRole
  }): Promise<AuthResponseData> {
    const response = await fetch(`${AUTH_API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const result: ApiResponse<AuthResponseData> = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.')
    }

    if (result.data?.accessToken) {
      authStorage.setToken(result.data.accessToken)
    }
    return result.data
  },

  async getMe(): Promise<User | null> {
    const token = authStorage.getToken()
    if (!token) return null

    const response = await fetch(`${AUTH_API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      authStorage.removeToken()
      return null
    }

    const result: ApiResponse<User> = await response.json()
    if (!result.success || !result.data) {
      authStorage.removeToken()
      return null
    }

    return result.data
  },
}
