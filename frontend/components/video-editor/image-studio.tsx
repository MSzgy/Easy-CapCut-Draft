"use client"

import { useState } from "react"
import {
    Wand2,
    ImageIcon,
    Sparkles,
    Download,
    RefreshCw,
    Star,
    Trash2,
    Copy,
    ChevronDown,
    Loader2,
    Plus,
    X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { aiContentApi } from "@/lib/api/ai-content"

interface GeneratedImage {
    id: string
    url: string
    prompt: string
    style: string
    timestamp: string
    isFavorite: boolean
}

const imageStyles = [
    { id: "photorealistic", name: "📷 写实摄影", keywords: ["photographic", "detailed", "lifelike"] },
    { id: "cinematic", name: "🎬 电影感", keywords: ["dramatic-lighting", "film-quality", "atmospheric"] },
    { id: "anime", name: "🎨 动漫风格", keywords: ["anime", "manga", "cel-shaded"] },
    { id: "oil-painting", name: "🖌️ 油画", keywords: ["textured", "classical", "brushwork"] },
    { id: "watercolor", name: "💧 水彩", keywords: ["painted", "soft", "artistic"] },
    { id: "3d-render", name: "🎮 3D渲染", keywords: ["depth", "dimensional", "realistic-rendering"] },
    { id: "cyberpunk", name: "⚡ 赛博朋克", keywords: ["neon", "dystopian", "high-tech"] },
    { id: "fantasy", name: "✨ 奇幻风", keywords: ["magical", "ethereal", "dreamlike"] },
    { id: "minimalist", name: "⬜ 极简", keywords: ["clean", "simple", "negative-space"] },
    { id: "vintage", name: "📼 复古", keywords: ["retro", "aged", "nostalgic"] },
]

const aspectRatios = [
    { id: "1:1", name: "1:1 (Square)", value: "1:1" },
    { id: "16:9", name: "16:9 (Landscape)", value: "16:9" },
    { id: "9:16", name: "9:16 (Portrait)", value: "9:16" },
    { id: "4:3", name: "4:3 (Classic)", value: "4:3" },
    { id: "3:4", name: "3:4 (Portrait)", value: "3:4" },
]

const resolutions = [
    { id: "512", name: "512x512 (Fast)", value: "512x512" },
    { id: "768", name: "768x768 (Balanced)", value: "768x768" },
    { id: "1024", name: "1024x1024 (High)", value: "1024x1024" },
    { id: "2048", name: "2048x2048 (Ultra)", value: "2048x2048" },
]

export function ImageStudio() {
    const { toast } = useToast()

    // Generation settings
    const [prompt, setPrompt] = useState("")
    const [negativePrompt, setNegativePrompt] = useState("")
    const [selectedStyle, setSelectedStyle] = useState("photorealistic")
    const [styleStrength, setStyleStrength] = useState([70])
    const [batchCount, setBatchCount] = useState(4)
    const [aspectRatio, setAspectRatio] = useState("1:1")
    const [resolution, setResolution] = useState("1024")
    const [advancedOpen, setAdvancedOpen] = useState(false)

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false)
    const [progress, setProgress] = useState(0)
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
    const [history, setHistory] = useState<GeneratedImage[]>([])

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: "错误",
                description: "请输入图片描述",
                variant: "destructive",
            })
            return
        }

        setIsGenerating(true)
        setProgress(0)
        setGeneratedImages([])

        try {
            // Simulate batch generation
            const batch: GeneratedImage[] = []

            for (let i = 0; i < batchCount; i++) {
                setProgress(((i + 1) / batchCount) * 100)

                // Get style keywords
                const style = imageStyles.find(s => s.id === selectedStyle)

                // Call API for each image
                const response = await aiContentApi.generateCover({
                    prompt: prompt,
                    negativePrompt: negativePrompt,
                    style: selectedStyle,
                    styleKeywords: style?.keywords,
                    size: aspectRatio,
                    resolution: resolution,
                })

                if (response.success) {
                    const newImage: GeneratedImage = {
                        id: `img_${Date.now()}_${i}`,
                        url: response.coverUrl,
                        prompt: prompt,
                        style: selectedStyle,
                        timestamp: new Date().toLocaleString(),
                        isFavorite: false,
                    }

                    batch.push(newImage)
                }

                // Small delay between generations
                await new Promise(resolve => setTimeout(resolve, 500))
            }

            setGeneratedImages(batch)
            setHistory(prev => [...batch, ...prev])

            toast({
                title: "生成成功",
                description: `已生成 ${batch.length} 张图片`,
            })
        } catch (error) {
            toast({
                title: "生成失败",
                description: error instanceof Error ? error.message : "未知错误",
                variant: "destructive",
            })
        } finally {
            setIsGenerating(false)
            setProgress(0)
        }
    }

    const toggleFavorite = (id: string) => {
        setHistory(prev =>
            prev.map(img =>
                img.id === id ? { ...img, isFavorite: !img.isFavorite } : img
            )
        )
    }

    const deleteImage = (id: string) => {
        setHistory(prev => prev.filter(img => img.id !== id))
    }

    const regenerateImage = (img: GeneratedImage) => {
        setPrompt(img.prompt)
        setSelectedStyle(img.style)
    }

    const downloadImage = async (img: GeneratedImage, index?: number) => {
        try {
            // Fetch the image
            const response = await fetch(img.url)
            const blob = await response.blob()

            // Create download link
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `ai-generated-${img.style}-${index !== undefined ? index + 1 : Date.now()}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)

            toast({
                title: "下载成功",
                description: "图片已保存到下载文件夹",
            })
        } catch (error) {
            toast({
                title: "下载失败",
                description: error instanceof Error ? error.message : "未知错误",
                variant: "destructive",
            })
        }
    }


    return (
        <div className="flex h-full flex-col gap-4 overflow-auto lg:flex-row lg:overflow-hidden">
            {/* Left Panel - Generation Controls */}
            <aside className="w-full shrink-0 space-y-4 overflow-auto lg:w-96">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            AI Image Studio
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Prompt */}
                        <div className="space-y-2">
                            <Label>📝 图片描述</Label>
                            <Textarea
                                placeholder="描述你想生成的图片，越详细越好..."
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={4}
                                className="resize-none"
                            />
                        </div>

                        {/* Negative Prompt */}
                        <div className="space-y-2">
                            <Label>🚫 负面提示词 (可选)</Label>
                            <Textarea
                                placeholder="不想出现的元素..."
                                value={negativePrompt}
                                onChange={(e) => setNegativePrompt(e.target.value)}
                                rows={2}
                                className="resize-none"
                            />
                        </div>

                        {/* Style Selection */}
                        <div className="space-y-2">
                            <Label>🎨 艺术风格</Label>
                            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    {imageStyles.map((style) => (
                                        <SelectItem key={style.id} value={style.id}>
                                            {style.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Style Strength */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>⚖️ 风格强度</Label>
                                <span className="text-sm text-muted-foreground">{styleStrength[0]}%</span>
                            </div>
                            <Slider
                                value={styleStrength}
                                onValueChange={setStyleStrength}
                                max={100}
                                step={5}
                                className="w-full"
                            />
                        </div>

                        {/* Batch Count */}
                        <div className="space-y-2">
                            <Label>🎲 批量生成数量</Label>
                            <Select value={batchCount.toString()} onValueChange={(v) => setBatchCount(Number(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">1 张</SelectItem>
                                    <SelectItem value="2">2 张</SelectItem>
                                    <SelectItem value="4">4 张</SelectItem>
                                    <SelectItem value="8">8 张</SelectItem>
                                    <SelectItem value="16">16 张</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Advanced Settings */}
                        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                            <CollapsibleTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    <span>🎛️ 高级设置</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-4 pt-4">
                                {/* Aspect Ratio */}
                                <div className="space-y-2">
                                    <Label>📐 宽高比</Label>
                                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {aspectRatios.map((ratio) => (
                                                <SelectItem key={ratio.id} value={ratio.value}>
                                                    {ratio.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Resolution */}
                                <div className="space-y-2">
                                    <Label>🎯 分辨率</Label>
                                    <Select value={resolution} onValueChange={setResolution}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {resolutions.map((res) => (
                                                <SelectItem key={res.id} value={res.value}>
                                                    {res.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CollapsibleContent>
                        </Collapsible>

                        {/* Generate Button */}
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full"
                            size="lg"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    生成中... {Math.round(progress)}%
                                </>
                            ) : (
                                <>
                                    <Wand2 className="mr-2 h-4 w-4" />
                                    生成 {batchCount} 张图片
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </aside>

            {/* Center Panel - Generation Canvas */}
            <section className="flex min-w-0 flex-1 flex-col">
                <Card className="flex-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" />
                            生成画布
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isGenerating && (
                            <div className="flex h-[400px] items-center justify-center">
                                <div className="text-center">
                                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
                                    <p className="mt-4 text-lg font-medium">正在生成图片...</p>
                                    <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
                                </div>
                            </div>
                        )}

                        {!isGenerating && generatedImages.length === 0 && (
                            <div className="flex h-[400px] items-center justify-center">
                                <div className="text-center text-muted-foreground">
                                    <Sparkles className="mx-auto h-16 w-16 opacity-50" />
                                    <p className="mt-4">输入描述后点击生成按钮开始创作</p>
                                </div>
                            </div>
                        )}

                        {generatedImages.length > 0 && (
                            <div className={`grid gap-4 ${batchCount === 1 ? "grid-cols-1" :
                                batchCount === 2 ? "grid-cols-2" :
                                    batchCount <= 4 ? "grid-cols-2" :
                                        batchCount <= 9 ? "grid-cols-3" : "grid-cols-4"
                                }`}>
                                {generatedImages.map((img, index) => (
                                    <div key={img.id} className="group relative overflow-hidden rounded-lg border">
                                        <img
                                            src={img.url}
                                            alt={`Generated ${index + 1}`}
                                            className="aspect-square w-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                                            <div className="flex h-full items-center justify-center gap-2">
                                                <Button size="icon" variant="secondary" onClick={() => toggleFavorite(img.id)}>
                                                    <Star className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="secondary" onClick={() => downloadImage(img, index)}>
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                        <Badge className="absolute left-2 top-2">{index + 1}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>

            {/* Right Panel - History */}
            <aside className="w-full shrink-0 space-y-4 overflow-auto lg:w-80">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                📚 历史记录
                            </span>
                            <Badge variant="secondary">{history.length}</Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {history.length === 0 && (
                            <p className="text-center text-sm text-muted-foreground">暂无历史记录</p>
                        )}

                        {history.slice(0, 20).map((img) => (
                            <div key={img.id} className="group relative overflow-hidden rounded-lg border">
                                <img
                                    src={img.url}
                                    alt="History"
                                    className="aspect-square w-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent">
                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                        <p className="text-xs text-white/80 line-clamp-2">{img.prompt}</p>
                                        <p className="text-[10px] text-white/60">{img.timestamp}</p>
                                    </div>
                                </div>
                                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-7 w-7"
                                        onClick={() => toggleFavorite(img.id)}
                                    >
                                        <Star className={`h-3 w-3 ${img.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-7 w-7"
                                        onClick={() => downloadImage(img)}
                                    >
                                        <Download className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-7 w-7"
                                        onClick={() => regenerateImage(img)}
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="h-7 w-7"
                                        onClick={() => deleteImage(img.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </aside>
        </div>
    )
}
