// API服务配置和通用方法

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/proxy'

export interface ApiError {
  detail: string
  status?: number
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 30_000
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        const error: ApiError = await response.json().catch(() => ({
          detail: `HTTP error! status: ${response.status}`,
          status: response.status,
        }))
        throw error
      }

      return await response.json()
    } catch (error) {
      if ((error as ApiError).detail) {
        throw error
      }
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw {
          detail: '请求超时，请稍后重试',
          status: 408,
        } as ApiError
      }
      throw {
        detail: 'Network error or server is unavailable',
        status: 0,
      } as ApiError
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown, opts?: { timeoutMs?: number }): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, opts?.timeoutMs ?? 30_000)
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
