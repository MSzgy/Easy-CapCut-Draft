/**
 * 鉴权 API 客户端
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/proxy'

const AUTH_TOKEN_KEY = 'clipforge_token'
const AUTH_USER_KEY = 'clipforge_user'

export interface AuthUser {
    id: string
    email: string
    username: string
    role: 'admin' | 'subscriber'
}

export interface TokenResponse {
    access_token: string
    token_type: string
    user: AuthUser
}

// ── Token 管理 ────────────────────────────────────────────────────────────

export function getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function removeToken(): void {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
}

export function getCachedUser(): AuthUser | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = localStorage.getItem(AUTH_USER_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

export function setCachedUser(user: AuthUser): void {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

// ── API 调用 ──────────────────────────────────────────────────────────────

export const authApi = {
    async login(email: string, password: string): Promise<TokenResponse> {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: '登录失败' }))
            const msg = typeof err.detail === 'string' ? err.detail
                : Array.isArray(err.detail) ? err.detail.map((e: any) => e.msg).join('; ')
                    : '登录失败，请检查邮箱和密码'
            throw new Error(msg)
        }
        const data: TokenResponse = await res.json()
        setToken(data.access_token)
        setCachedUser(data.user)
        return data
    },

    async register(email: string, username: string, password: string): Promise<TokenResponse> {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password }),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: '注册失败' }))
            const msg = typeof err.detail === 'string' ? err.detail
                : Array.isArray(err.detail) ? err.detail.map((e: any) => e.msg).join('; ')
                    : '注册失败'
            throw new Error(msg)
        }
        const data: TokenResponse = await res.json()
        setToken(data.access_token)
        setCachedUser(data.user)
        return data
    },

    async getMe(): Promise<AuthUser> {
        const token = getToken()
        if (!token) throw new Error('未登录')
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
            removeToken()
            throw new Error('Token 无效')
        }
        const user: AuthUser = await res.json()
        setCachedUser(user)
        return user
    },

    logout(): void {
        removeToken()
    },
}
