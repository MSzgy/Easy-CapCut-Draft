"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Video, Loader2, Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
    const router = useRouter()
    const { login } = useAuth()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            await login(email, password)
            router.push("/")
        } catch (err: any) {
            setError(err.message || "登录失败，请检查邮箱和密码")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0f]">
            {/* Animated Background Gradient */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
                <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-600/20 blur-[120px] animate-pulse [animation-delay:1s]" />
                <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-[100px] animate-pulse [animation-delay:2s]" />
            </div>

            {/* Grid Pattern Overlay */}
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Login Card */}
            <div className="relative z-10 w-full max-w-md px-4">
                {/* Logo */}
                <div className="mb-8 flex flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-500/25">
                        <Video className="h-7 w-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">
                        ClipForge
                    </h1>
                    <p className="text-sm text-gray-400">AI 驱动的智能视频创作平台</p>
                </div>

                {/* Glass Card */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur-xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-gray-300">
                                邮箱
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@clipforge.app"
                                required
                                className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white placeholder:text-gray-500 transition-all duration-200 focus:border-purple-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-gray-300">
                                密码
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 pr-12 text-white placeholder:text-gray-500 transition-all duration-200 focus:border-purple-500/50 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/25 transition-all duration-300 hover:shadow-xl hover:shadow-purple-600/30 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {/* Hover shimmer */}
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                            <span className="relative flex items-center justify-center gap-2">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        登录中...
                                    </>
                                ) : (
                                    "登录"
                                )}
                            </span>
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-gray-600">
                    Powered by AI · Easy-CapCut-Draft
                </p>
            </div>
        </div>
    )
}
