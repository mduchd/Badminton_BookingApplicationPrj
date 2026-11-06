// VITE_API_URL is the API root (for example, https://backend.example.com/api).
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')
