"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { authApi, type AuthUser, getToken, getCachedUser, removeToken } from "@/lib/api/auth"

interface UseAuthReturn {
    user: AuthUser | null
    isLoading: boolean
    isAdmin: boolean
    login: (email: string, password: string) => Promise<void>
    register: (email: string, username: string, password: string) => Promise<void>
    logout: () => void
}

export function useAuth(): UseAuthReturn {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const verifiedRef = useRef(false)

    // 组件挂载时验证 token
    useEffect(() => {
        if (verifiedRef.current) return
        verifiedRef.current = true

        const token = getToken()
        if (!token) {
            setIsLoading(false)
            return
        }

        // 先用缓存的用户信息快速渲染
        const cached = getCachedUser()
        if (cached) {
            setUser(cached)
        }

        // 然后异步验证 token
        authApi
            .getMe()
            .then((serverUser) => {
                setUser(serverUser)
            })
            .catch(() => {
                setUser(null)
                removeToken()
            })
            .finally(() => {
                setIsLoading(false)
            })
    }, [])

    const login = useCallback(async (email: string, password: string) => {
        const res = await authApi.login(email, password)
        setUser(res.user)
    }, [])

    const register = useCallback(async (email: string, username: string, password: string) => {
        const res = await authApi.register(email, username, password)
        setUser(res.user)
    }, [])

    const logout = useCallback(() => {
        authApi.logout()
        setUser(null)
    }, [])

    return {
        user,
        isLoading,
        isAdmin: user?.role === "admin",
        login,
        register,
        logout,
    }
}
