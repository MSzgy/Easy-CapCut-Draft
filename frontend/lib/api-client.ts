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

    // 从 localStorage 读取 token（仅客户端）
    let authToken: string | null = null
    if (typeof window !== 'undefined') {
      authToken = localStorage.getItem('clipforge_token')
    }

    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...options.headers,
      },
      signal: AbortSignal.timeout(timeoutMs),
    }

    try {
      const response = await fetch(url, config)

      if (response.status === 401) {
        // Token 过期或无效，清除并跳转到登录页
        if (typeof window !== 'undefined') {
          localStorage.removeItem('clipforge_token')
          localStorage.removeItem('clipforge_user')
          // 避免在登录页时循环跳转
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login'
          }
        }
        throw { detail: '未认证，请重新登录', status: 401 } as ApiError
      }

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
