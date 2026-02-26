"use client"

import { useState, useEffect } from "react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Settings, Type, Image, Video, Palette, AlertCircle, CheckCircle2, Loader2, Music } from "lucide-react"
import { aiContentApi, type ProviderStatus, type ModelSelection } from "@/lib/api/ai-content"

interface ConfigPageProps {
    modelSelection: ModelSelection
    setModelSelection: (selection: ModelSelection) => void
}

export function ConfigPage({ modelSelection, setModelSelection }: ConfigPageProps) {
    const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchProviders() {
            try {
                const status = await aiContentApi.getProviders()
                setProviderStatus(status)
            } catch (e) {
                console.error("Failed to fetch providers:", e)
            } finally {
                setLoading(false)
            }
        }
        fetchProviders()
    }, [])

    const update = (key: keyof ModelSelection, value: string) => {
        setModelSelection({ ...modelSelection, [key]: value })
    }

    // Build option list for image models: gemini + HF image spaces
    const imageOptions: { value: string; label: string; configured: boolean }[] = []
    if (providerStatus) {
        // Gemini option
        const geminiInfo = providerStatus.image?.available?.gemini
        if (geminiInfo) {
            imageOptions.push({
                value: "gemini",
                label: "Google Gemini",
                configured: geminiInfo.configured,
            })
        }
        // HF image spaces
        Object.entries(providerStatus.hf_spaces || {}).forEach(([alias, info]) => {
            if (info.capability === "image") {
                if (alias === "image_turbo") {
                    imageOptions.push({
                        value: `hf:${alias}:Z-Image-Turbo`,
                        label: `Image Turbo (Z-Image)`,
                        configured: info.configured,
                    })
                    imageOptions.push({
                        value: `hf:${alias}:BitDance-14B-16x`,
                        label: `Image Turbo (BitDance)`,
                        configured: info.configured,
                    })
                } else {
                    imageOptions.push({
                        value: `hf:${alias}`,
                        label: `${info.display_name} (${info.space_id})`,
                        configured: info.configured,
                    })
                }
            }
        })
    }

    // Build option list for video models: HF video spaces
    const videoOptions: { value: string; label: string; configured: boolean }[] = []
    if (providerStatus) {
        Object.entries(providerStatus.hf_spaces || {}).forEach(([alias, info]) => {
            if (info.capability === "video") {
                videoOptions.push({
                    value: `hf:${alias}`,
                    label: `${info.display_name} (${info.space_id})`,
                    configured: info.configured,
                })
            }
        })
    }

    // Build option list for audio models: HF audio spaces
    const audioOptions: { value: string; label: string; configured: boolean }[] = []
    if (providerStatus) {
        Object.entries(providerStatus.hf_spaces || {}).forEach(([alias, info]) => {
            if (info.capability === "audio") {
                audioOptions.push({
                    value: `hf:${alias}`,
                    label: `${info.display_name || alias} (${info.space_id})`,
                    configured: info.configured,
                })
            }
        })
    }

    // Build option list for music models: HF music spaces
    const musicOptions: { value: string; label: string; configured: boolean }[] = []
    if (providerStatus) {
        Object.entries(providerStatus.hf_spaces || {}).forEach(([alias, info]) => {
            if (info.capability === "music") {
                musicOptions.push({
                    value: `hf:${alias}`,
                    label: `${info.display_name || alias} (${info.space_id})`,
                    configured: info.configured,
                })
            }
        })
    }

    // Build option list for text providers
    const textOptions: { value: string; label: string; configured: boolean }[] = []
    if (providerStatus) {
        Object.entries(providerStatus.text?.available || {}).forEach(([name, info]) => {
            textOptions.push({
                value: name,
                label: info.displayName,
                configured: info.configured,
            })
        })
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col gap-6 p-6 overflow-auto">
            <div className="flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">模型配置</h1>
            </div>
            <p className="text-sm text-muted-foreground -mt-4">
                为每种 AI 任务选择模型。前端选择优先级最高，未选择时使用默认模型。
            </p>

            <div className="grid gap-6">
                {/* ─── 文本模型 ─── */}
                <ModelCard
                    icon={<Type className="h-5 w-5" />}
                    title="文本生成模型"
                    description="用于脚本创作、分镜写作、元数据生成等文本任务"
                    value={modelSelection.textProvider}
                    onChange={(v) => update("textProvider", v)}
                    options={textOptions}
                    defaultLabel="默认: Google Gemini"
                />

                {/* ─── 文生图模型 ─── */}
                <ModelCard
                    icon={<Image className="h-5 w-5" />}
                    title="文生图模型"
                    description="从文字提示词生成封面图片"
                    value={modelSelection.imageProvider}
                    onChange={(v) => update("imageProvider", v)}
                    options={imageOptions}
                    defaultLabel="默认: Google Gemini"
                />

                {/* ─── 图生图模型 ─── */}
                <ModelCard
                    icon={<Palette className="h-5 w-5" />}
                    title="图生图模型"
                    description="基于参考图片进行风格迁移和重绘"
                    value={modelSelection.imageToImageProvider}
                    onChange={(v) => update("imageToImageProvider", v)}
                    options={imageOptions}
                    defaultLabel="默认: Google Gemini"
                />

                {/* ─── 视频模型 ─── */}
                <ModelCard
                    icon={<Video className="h-5 w-5" />}
                    title="视频生成模型"
                    description="从图片生成视频片段"
                    value={modelSelection.videoProvider}
                    onChange={(v) => update("videoProvider", v)}
                    options={videoOptions}
                    defaultLabel="默认: I2V 视频生成"
                />

                {/* ─── 音频模型 ─── */}
                <ModelCard
                    icon={<Music className="h-5 w-5" />}
                    title="音频生成模型"
                    description="从文字生成语音 (TTS)"
                    value={modelSelection.audioProvider}
                    onChange={(v) => update("audioProvider", v)}
                    options={audioOptions}
                    defaultLabel="默认: Qwen3语音生成"
                />

                {/* ─── 音乐模型 ─── */}
                <ModelCard
                    icon={<Music className="h-5 w-5" />}
                    title="音乐生成模型"
                    description="从文字生成背景音乐"
                    value={modelSelection.musicProvider}
                    onChange={(v) => update("musicProvider", v)}
                    options={musicOptions}
                    defaultLabel="默认: MusicGen 音乐生成"
                />
            </div>
        </div>
    )
}

// ─── Reusable ModelCard Component ────────────────────────────────────────────

interface ModelCardProps {
    icon: React.ReactNode
    title: string
    description: string
    value: string
    onChange: (value: string) => void
    options: { value: string; label: string; configured: boolean }[]
    defaultLabel: string
}

function ModelCard({ icon, title, description, value, onChange, options, defaultLabel }: ModelCardProps) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    {icon}
                    {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <Select value={value} onValueChange={onChange}>
                        <SelectTrigger className="bg-secondary">
                            <SelectValue placeholder={defaultLabel} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((opt) => (
                                <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                    disabled={!opt.configured}
                                >
                                    <div className="flex items-center gap-2 w-full">
                                        {opt.configured ? (
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                        ) : (
                                            <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                                        )}
                                        <span>{opt.label}</span>
                                        {!opt.configured && (
                                            <Badge variant="outline" className="text-[10px] ml-auto text-destructive border-destructive/30">
                                                未配置
                                            </Badge>
                                        )}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Currently selected info */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>当前:</span>
                        {value ? (
                            <Badge variant="secondary" className="text-xs">
                                {options.find(o => o.value === value)?.label || value}
                            </Badge>
                        ) : (
                            <span className="italic">{defaultLabel}</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
