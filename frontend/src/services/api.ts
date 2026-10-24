import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

class ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000,
    })

    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('auth_token')
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  async get<T>(url: string, params?: Record<string, any>) {
    const response = await this.client.get<T>(url, { params })
    return response.data
  }

  async post<T>(url: string, data?: any) {
    const headers =
      data instanceof FormData
        ? // Deixa o browser definir o boundary do multipart
          { 'Content-Type': undefined as unknown as undefined }
        : undefined
    const response = await this.client.post<T>(url, data, headers ? { headers } : undefined)
    return response.data
  }

  async patch<T>(url: string, data?: any) {
    const response = await this.client.patch<T>(url, data)
    return response.data
  }

  async put<T>(url: string, data?: any) {
    const response = await this.client.put<T>(url, data)
    return response.data
  }

  async delete<T>(url: string) {
    const response = await this.client.delete<T>(url)
    return response.data
  }
}

export const api = new ApiClient()

/** Converte URLs relativas do backend (/media/...) em absolutas. */
export function mediaUrl(path?: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '')
  return `${base}${path}`
}