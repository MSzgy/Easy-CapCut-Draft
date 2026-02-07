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
    Upload,
    Palette,
    Image as ImageIconLucide,
    Sliders,
    Film,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
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
import { DrawingCanvas } from "./drawing-canvas"

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

// Phase 3: 艺术风格库 (风格迁移)
const artStyles = [
    // 艺术大师
    { id: "vangogh_starry", name: "🌌 梵高星空", category: "艺术大师", description: "后印象派，旋转笔触" },
    { id: "monet_impressionist", name: "🌸 莫奈印象派", category: "艺术大师", description: "柔和光线，柔美笔触" },
    { id: "picasso_cubist", name: "🔷 毕加索立体", category: "艺术大师", description: "立体主义，几何图形" },
    { id: "ukiyoe", name: "🗾 日本浮世绘", category: "艺术大师", description: "木版画，平面色彩" },
    { id: "kandinsky_abstract", name: "🎨 康定斯基抽象", category: "艺术大师", description: "抽象几何，鲜艳色彩" },
    // 流行风格  
    { id: "pixar_animation", name: "🎬 皮克斯动画", category: "流行风格", description: "3D渲染，可爱角色" },
    { id: "lego_bricks", name: "🧱 乐高积木", category: "流行风格", description: "积木拼搭，玩具感" },
    { id: "cyberpunk", name: "⚡ 赛博朋克", category: "流行风格", description: "霓虹灯光，科幻未来" },
    { id: "vaporwave", name: "🌈 蒸汽波", category: "流行风格", description: "复古80年代，粉蓝渐变" },
    { id: "anime", name: "⭐ 日本动漫", category: "流行风格", description: "卡通渲染，鲜艳色彩" },
    // 材质风格
    { id: "crystal", name: "💎 水晶材质", category: "材质风格", description: "透明晶体，折射光效" },
    { id: "metallic", name: "🔩 金属质感", category: "材质风格", description: "金属表面，反光效果" },
    { id: "wood_carving", name: "🪵 木雕", category: "材质风格", description: "木质纹理，雕刻感" },
    { id: "paper_art", name: "📄 纸艺", category: "材质风格", description: "剪纸层叠，折纸风" },
    { id: "watercolor", name: "🎨 水彩画", category: "材质风格", description: "水彩晕染，流动色彩" },
]

const resolutions = [
    { id: "512", name: "512x512 (Fast)", value: "512x512" },
    { id: "768", name: "768x768 (Balanced)", value: "768x768" },
    { id: "1024", name: "1024x1024 (High)", value: "1024x1024" },
    { id: "2048", name: "2048x2048 (Ultra)", value: "2048x2048" },
]

interface ImageStudioProps {
    onStoryboardGenerated?: (frames: any[]) => void
    modelProvider?: "gemini" | "huggingface"
}

export function ImageStudio({ onStoryboardGenerated, modelProvider = "gemini" }: ImageStudioProps = {}) {
    const { toast } = useToast()

    // Phase 2 & 3: Generation mode 
    const [mode, setMode] = useState<'text-to-image' | 'image-to-image' | 'style-mix' | 'style-transfer' | 'sketch-to-image' | 'face-portrait' | 'background-removal' | 'background-replacement' | 'storyboard'>('text-to-image')

    // Generation settings
    const [prompt, setPrompt] = useState("")
    const [negativePrompt, setNegativePrompt] = useState("")
    const [selectedStyle, setSelectedStyle] = useState("photorealistic")
    const [styleStrength, setStyleStrength] = useState([70])
    const [batchCount, setBatchCount] = useState(4)
    const [aspectRatio, setAspectRatio] = useState("1:1")
    const [resolution, setResolution] = useState("1024")
    const [advancedOpen, setAdvancedOpen] = useState(false)

    // Phase 2: Image-to-image
    const [referenceImage, setReferenceImage] = useState<string | null>(null)
    const [denoisingStrength, setDenoisingStrength] = useState([70])
    const [preserveComposition, setPreserveComposition] = useState(false)

    // Phase 2: Style mixing
    const [selectedStyles, setSelectedStyles] = useState<string[]>(["photorealistic"])
    const [styleWeights, setStyleWeights] = useState<{ [key: string]: number }>({ "photorealistic": 100 })

    // Phase 3: Style transfer
    const [styleTransferImage, setStyleTransferImage] = useState<string | null>(null)
    const [selectedArtStyle, setSelectedArtStyle] = useState("pixar_animation")
    const [styleIntensity, setStyleIntensity] = useState([80])

    // Phase 3: Sketch-to-image
    const [sketchData, setSketchData] = useState<string | null>(null)

    // Phase 3: AI Face Portrait
    const [faceImage, setFaceImage] = useState<string | null>(null)
    const [faceMode, setFaceMode] = useState<'portrait' | 'swap'>('portrait')
    const [scenePrompt, setScenePrompt] = useState("")
    const [targetSwapImage, setTargetSwapImage] = useState<string | null>(null)
    const [preserveFace, setPreserveFace] = useState([30])
    const [blendStrength, setBlendStrength] = useState([70])

    // Background Removal & Replacement
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null)
    const [backgroundSubject, setBackgroundSubject] = useState<'person' | 'object' | 'auto'>('auto')
    const [backgroundScene, setBackgroundScene] = useState<'office' | 'nature' | 'tech' | 'fantasy' | 'solid' | 'blur'>('nature')
    const [customBackgroundPrompt, setCustomBackgroundPrompt] = useState("")
    const [backgroundColor, setBackgroundColor] = useState("#FFFFFF")
    const [matchLighting, setMatchLighting] = useState(true)
    const [addDepth, setAddDepth] = useState(true)

    // Storyboard Generation
    const [storyPrompt, setStoryPrompt] = useState("")
    const [storyCharacterImage, setStoryCharacterImage] = useState<string | null>(null)
    const [numFrames, setNumFrames] = useState(6)
    const [storyboardFrames, setStoryboardFrames] = useState<any[]>([])
    const [expandedStoryboards, setExpandedStoryboards] = useState<Set<string>>(new Set())

    // Generation state
    const [isGenerating, setIsGenerating] = useState(false)
    const [isOptimizing, setIsOptimizing] = useState(false)
    const [progress, setProgress] = useState(0)
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([])
    const [history, setHistory] = useState<GeneratedImage[]>([])

    // Shot type translations
    const shotTypeTranslations: { [key: string]: string } = {
        'closeup': '特写',
        'medium': '中景',
        'wide': '全景',
        'over_shoulder': '过肩',
        'birds_eye': '鸟瞰'
    }

    // Group storyboard images in history
    const groupStoryboards = (images: GeneratedImage[]) => {
        const groups: Array<{ type: 'storyboard' | 'single', id: string, images: GeneratedImage[], timestamp: string }> = []
        const storyboards: { [key: string]: GeneratedImage[] } = {}

        images.forEach(img => {
            if (img.id.startsWith('story_')) {
                const storyId = img.timestamp
                if (!storyboards[storyId]) {
                    storyboards[storyId] = []
                }
                storyboards[storyId].push(img)
            } else {
                groups.push({ type: 'single', id: img.id, images: [img], timestamp: img.timestamp })
            }
        })

        Object.entries(storyboards).forEach(([storyId, imgs]) => {
            groups.push({
                type: 'storyboard',
                id: `storyboard_${storyId}`,
                images: imgs.sort((a, b) => parseInt(a.id.split('_')[1]) - parseInt(b.id.split('_')[1])),
                timestamp: storyId
            })
        })

        return groups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }

    const toggleStoryboard = (id: string) => {
        setExpandedStoryboards(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Check file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "文件过大",
                description: "图片大小不能超过 5MB",
                variant: "destructive",
            })
            return
        }

        const reader = new FileReader()
        reader.onload = (event) => {
            setReferenceImage(event.target?.result as string)
        }
        reader.readAsDataURL(file)
    }

    const handleOptimizePrompt = async () => {
        if (!prompt.trim()) {
            toast({
                title: "提示",
                description: "请先输入提示词",
                variant: "default",
            })
            return
        }

        setIsOptimizing(true)
        try {
            const result = await aiContentApi.optimizePrompt(prompt)
            setPrompt(result.optimized)
            toast({
                title: "优化成功",
                description: "提示词已优化",
            })
        } catch (error) {
            toast({
                title: "优化失败",
                description: error instanceof Error ? error.message : "未知错误",
                variant: "destructive",
            })
        } finally {
            setIsOptimizing(false)
        }
    }

    const handleGenerate = async () => {
        if (!prompt.trim() && mode !== 'style-transfer' && mode !== 'sketch-to-image' && mode !== 'face-portrait' && mode !== 'background-removal' && mode !== 'background-replacement' && mode !== 'storyboard') {
            toast({
                title: "错误",
                description: "请输入图片描述",
                variant: "destructive",
            })
            return
        }

        if (mode === 'image-to-image' && !referenceImage) {
            toast({
                title: "错误",
                description: "请先上传参考图片",
                variant: "destructive",
            })
            return
        }

        if (mode === 'style-transfer' && !styleTransferImage) {
            toast({
                title: "错误",
                description: "请先上传要转换风格的照片",
                variant: "destructive",
            })
            return
        }

        if (mode === 'sketch-to-image' && !sketchData) {
            toast({
                title: "错误",
                description: "请先绘制草图",
                variant: "destructive",
            })
            return
        }

        if (mode === 'sketch-to-image' && !prompt.trim()) {
            toast({
                title: "错误",
                description: "请输入描述",
                variant: "destructive",
            })
            return
        }

        if (mode === 'face-portrait' && !faceImage) {
            toast({
                title: "错误",
                description: "请先上传人脸照片",
                variant: "destructive",
            })
            return
        }

        if (mode === 'face-portrait' && faceMode === 'portrait' && !scenePrompt.trim()) {
            toast({
                title: "错误",
                description: "请选择场景或输入场景描述",
                variant: "destructive",
            })
            return
        }

        if (mode === 'face-portrait' && faceMode === 'swap' && !targetSwapImage) {
            toast({
                title: "错误",
                description: "请上传目标场景图片",
                variant: "destructive",
            })
            return
        }

        if ((mode === 'background-removal' || mode === 'background-replacement') && !backgroundImage) {
            toast({
                title: "错误",
                description: "请先上传要处理的图片",
                variant: "destructive",
            })
            return
        }

        if (mode === 'storyboard' && !storyPrompt.trim()) {
            toast({
                title: "错误",
                description: "请输入故事描述",
                variant: "destructive",
            })
            return
        }

        setIsGenerating(true)
        setProgress(0)
        setGeneratedImages([])

        try {
            const batch: GeneratedImage[] = []

            // Phase 3: Style transfer mode
            if (mode === 'style-transfer' && styleTransferImage) {
                for (let i = 0; i < batchCount; i++) {
                    setProgress(((i + 1) / batchCount) * 100)

                    const response = await aiContentApi.styleTransfer(
                        styleTransferImage,
                        selectedArtStyle,
                        styleIntensity[0] / 100,
                        prompt || undefined
                    )

                    if (response.success) {
                        const newImage: GeneratedImage = {
                            id: `img_${Date.now()}_${i}`,
                            url: response.imageUrl,
                            prompt: `Style: ${artStyles.find(s => s.id === selectedArtStyle)?.name || selectedArtStyle}`,
                            style: selectedArtStyle,
                            timestamp: new Date().toLocaleString(),
                            isFavorite: false,
                        }
                        batch.push(newImage)
                    }

                    await new Promise(resolve => setTimeout(resolve, 500))
                }
            } else if (mode === 'sketch-to-image' && sketchData) {
                // Phase 3: Sketch-to-image mode
                for (let i = 0; i < batchCount; i++) {
                    setProgress(((i + 1) / batchCount) * 100)

                    const response = await aiContentApi.sketchToImage(
                        sketchData,
                        prompt,
                        selectedStyle
                    )

                    if (response.success) {
                        const newImage: GeneratedImage = {
                            id: `img_${Date.now()}_${i}`,
                            url: response.imageUrl,
                            prompt: `Sketch: ${prompt}`,
                            style: selectedStyle,
                            timestamp: new Date().toLocaleString(),
                            isFavorite: false,
                        }
                        batch.push(newImage)
                    }

                    await new Promise(resolve => setTimeout(resolve, 500))
                }
            } else if (mode === 'face-portrait' && faceImage) {
                // Phase 3: AI Face Portrait mode
                for (let i = 0; i < batchCount; i++) {
                    setProgress(((i + 1) / batchCount) * 100)

                    let response
                    let promptText = ''

                    if (faceMode === 'portrait') {
                        // AI写真模式
                        response = await aiContentApi.facePortrait(
                            faceImage,
                            scenePrompt,
                            selectedStyle,
                            preserveFace[0] / 100
                        )
                        promptText = `Portrait: ${scenePrompt}`
                    } else {
                        // 人脸融合模式
                        response = await aiContentApi.faceSwap(
                            faceImage,
                            targetSwapImage!,
                            blendStrength[0] / 100
                        )
                        promptText = 'Face Swap'
                    }

                    if (response.success) {
                        const newImage: GeneratedImage = {
                            id: `img_${Date.now()}_${i}`,
                            url: response.imageUrl,
                            prompt: promptText,
                            style: faceMode === 'portrait' ? selectedStyle : 'face-swap',
                            timestamp: new Date().toLocaleString(),
                            isFavorite: false,
                        }
                        batch.push(newImage)
                    }

                    await new Promise(resolve => setTimeout(resolve, 500))
                }
            } else if ((mode === 'background-removal' || mode === 'background-replacement') && backgroundImage) {
                // Background Removal & Replacement mode
                for (let i = 0; i < batchCount; i++) {
                    setProgress(((i + 1) / batchCount) * 100)

                    let response
                    let promptText = ''

                    if (mode === 'background-removal') {
                        // 智能抠图模式
                        response = await aiContentApi.removeBackground(
                            backgroundImage,
                            backgroundSubject,
                            true
                        )
                        promptText = 'Background Removed'
                    } else {
                        // 背景替换模式
                        response = await aiContentApi.replaceBackground(
                            backgroundImage,
                            backgroundScene,
                            customBackgroundPrompt || undefined,
                            backgroundColor,
                            matchLighting,
                            addDepth
                        )
                        promptText = `Background: ${customBackgroundPrompt || backgroundScene}`
                    }

                    if (response.success) {
                        const newImage: GeneratedImage = {
                            id: `img_${Date.now()}_${i}`,
                            url: response.imageUrl,
                            prompt: promptText,
                            style: mode === 'background-removal' ? 'cutout' : backgroundScene,
                            timestamp: new Date().toLocaleString(),
                            isFavorite: false,
                        }
                        batch.push(newImage)
                    }

                    await new Promise(resolve => setTimeout(resolve, 500))
                }
            } else if (mode === 'storyboard') {
                // Storyboard Generation mode
                setProgress(20)

                try {
                    const response = await aiContentApi.generateStoryboard(
                        storyPrompt,
                        storyCharacterImage || undefined,
                        numFrames,
                        selectedStyle
                    )

                    if (response.success) {
                        setProgress(100)
                        setStoryboardFrames(response.frames)

                        // Notify parent component with storyboard data
                        onStoryboardGenerated?.(response.frames)

                        toast({
                            title: "生成成功",
                            description: `故事板生成完成，共${response.frames.length}个分镜`,
                        })

                        // 同时添加到普通图片列表
                        response.frames.forEach((frame: any) => {
                            const newImage: GeneratedImage = {
                                id: `story_${frame.frameNumber}`,
                                url: frame.imageUrl,
                                prompt: frame.description,
                                style: frame.shotType,
                                timestamp: new Date().toLocaleString(),
                                isFavorite: false,
                            }
                            batch.push(newImage)
                        })
                    }
                } catch (error) {
                    toast({
                        title: "生成失败",
                        description: error instanceof Error ? error.message : "未知错误",
                        variant: "destructive",
                    })
                }
            } else {
                // Phase 1 & 2: Normal generation modes
                for (let i = 0; i < batchCount; i++) {
                    setProgress(((i + 1) / batchCount) * 100)

                    // Prepare style-related data
                    let style = selectedStyle
                    let keywords: string[] | undefined
                    let weights: { [key: string]: number } | undefined

                    if (mode === 'style-mix' && selectedStyles.length > 0) {
                        // Use first style as main style, but pass all weights
                        style = selectedStyles[0]
                        weights = styleWeights
                    } else {
                        const styleObj = imageStyles.find(s => s.id === selectedStyle)
                        keywords = styleObj?.keywords
                    }

                    // Call API for each image
                    const response = await aiContentApi.generateCover({
                        prompt: prompt,
                        negativePrompt: negativePrompt,
                        style: style,
                        styleKeywords: keywords,
                        size: aspectRatio,
                        resolution: resolution,
                        // Phase 2 parameters
                        mode: mode,
                        referenceImage: referenceImage || undefined,
                        denoisingStrength: denoisingStrength[0] / 100,
                        preserveComposition: preserveComposition,
                        styleWeights: weights,
                        provider: modelProvider,
                    })

                    if (response.success) {
                        const newImage: GeneratedImage = {
                            id: `img_${Date.now()}_${i}`,
                            url: response.coverUrl,
                            prompt: prompt,
                            style: mode === 'style-mix' ? selectedStyles.join('+') : selectedStyle,
                            timestamp: new Date().toLocaleString(),
                            isFavorite: false,
                        }

                        batch.push(newImage)
                    }

                    // Small delay between generations
                    await new Promise(resolve => setTimeout(resolve, 500))
                }
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
                        {/* Phase 2 & 3: Mode Selector */}
                        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="text-to-image">📝 文本</TabsTrigger>
                                <TabsTrigger value="image-to-image">🖼️ 图生图</TabsTrigger>
                                <TabsTrigger value="style-mix">🎨 混合</TabsTrigger>
                            </TabsList>
                            <TabsList className="grid w-full grid-cols-3 mt-2">
                                <TabsTrigger value="style-transfer">🖌️ 风格迁移</TabsTrigger>
                                <TabsTrigger value="sketch-to-image">✍️ 灵魂画手</TabsTrigger>
                                <TabsTrigger value="face-portrait">👤 AI写真</TabsTrigger>
                            </TabsList>
                            <TabsList className="grid w-full grid-cols-2 mt-2">
                                <TabsTrigger value="background-removal">✂️ 智能抠图</TabsTrigger>
                                <TabsTrigger value="background-replacement">🌄 背景替换</TabsTrigger>
                            </TabsList>
                            <TabsList className="grid w-full grid-cols-1 mt-2">
                                <TabsTrigger value="storyboard">🎬 故事板生成</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Phase 3: AI Face Portrait - Face Photo Upload */}
                        {mode === 'face-portrait' && (
                            <>
                                <div className="space-y-2">
                                    <Label>👤 上传人脸照片</Label>
                                    {!faceImage ? (
                                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                                            onClick={() => document.getElementById('face-upload')?.click()}>
                                            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">点击上传人脸照片</p>
                                            <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG，最大 5MB</p>
                                            <input
                                                id="face-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        toast({
                                                            title: "文件过大",
                                                            description: "图片大小不能超过 5MB",
                                                            variant: "destructive",
                                                        })
                                                        return
                                                    }
                                                    const reader = new FileReader()
                                                    reader.onload = (event) => {
                                                        setFaceImage(event.target?.result as string)
                                                    }
                                                    reader.readAsDataURL(file)
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <img src={faceImage} alt="Face" className="w-full rounded-lg" />
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                className="absolute top-2 right-2"
                                                onClick={() => setFaceImage(null)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Mode: AI写真 vs 人脸融合 */}
                                <div className="space-y-2">
                                    <Label>🎭 模式选择</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div
                                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${faceMode === 'portrait'
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-primary/50'
                                                }`}
                                            onClick={() => setFaceMode('portrait')}
                                        >
                                            <div className="font-medium text-sm">📸 AI写真</div>
                                            <div className="text-xs text-muted-foreground mt-1">生成特定场景写真</div>
                                        </div>
                                        <div
                                            className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${faceMode === 'swap'
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-primary/50'
                                                }`}
                                            onClick={() => setFaceMode('swap')}
                                        >
                                            <div className="font-medium text-sm">🔄 人脸融合</div>
                                            <div className="text-xs text-muted-foreground mt-1">融合到目标场景</div>
                                        </div>
                                    </div>
                                </div>

                                {/* AI写真模式：场景选择 */}
                                {faceMode === 'portrait' && (
                                    <div className="space-y-2">
                                        <Label>🏞️ 场景预设</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'business', name: '💼 商务写真', prompt: 'professional business portrait in modern office' },
                                                { id: 'casual', name: '👕 休闲写真', prompt: 'casual outdoor portrait, natural lighting' },
                                                { id: 'traditional', name: '👘 古风写真', prompt: 'traditional Chinese style portrait' },
                                                { id: 'beach', name: '🏖️ 海滩写真', prompt: 'beach portrait at sunset' },
                                                { id: 'studio', name: '📷 棚拍写真', prompt: 'professional studio portrait' },
                                                { id: 'sci-fi', name: '🚀 科幻写真', prompt: 'futuristic sci-fi portrait' },
                                            ].map((scene) => (
                                                <Button
                                                    key={scene.id}
                                                    variant={scenePrompt === scene.prompt ? 'default' : 'outline'}
                                                    className="h-auto py-2 px-3 text-xs justify-start"
                                                    onClick={() => setScenePrompt(scene.prompt)}
                                                >
                                                    <span className="truncate">{scene.name}</span>
                                                </Button>
                                            ))}
                                        </div>
                                        <Textarea
                                            placeholder="或输入自定义场景描述..."
                                            value={scenePrompt}
                                            onChange={(e) => setScenePrompt(e.target.value)}
                                            rows={2}
                                            className="resize-none text-sm"
                                        />
                                    </div>
                                )}

                                {/* 人脸融合模式：目标图片上传 */}
                                {faceMode === 'swap' && (
                                    <div className="space-y-2">
                                        <Label>🎯 目标场景图片</Label>
                                        {!targetSwapImage ? (
                                            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                                                onClick={() => document.getElementById('target-swap-upload')?.click()}>
                                                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                                <p className="text-sm text-muted-foreground">上传目标场景图片</p>
                                                <p className="text-xs text-muted-foreground mt-1">将把人脸融合到这张图片中</p>
                                                <input
                                                    id="target-swap-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0]
                                                        if (!file) return
                                                        if (file.size > 5 * 1024 * 1024) {
                                                            toast({
                                                                title: "文件过大",
                                                                description: "图片大小不能超过 5MB",
                                                                variant: "destructive",
                                                            })
                                                            return
                                                        }
                                                        const reader = new FileReader()
                                                        reader.onload = (event) => {
                                                            setTargetSwapImage(event.target?.result as string)
                                                        }
                                                        reader.readAsDataURL(file)
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <img src={targetSwapImage} alt="Target" className="w-full rounded-lg" />
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute top-2 right-2"
                                                    onClick={() => setTargetSwapImage(null)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* 高级选项 */}
                                {faceMode === 'portrait' && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>👤 人脸保留强度</Label>
                                            <span className="text-sm text-muted-foreground">{preserveFace[0]}%</span>
                                        </div>
                                        <Slider
                                            value={preserveFace}
                                            onValueChange={setPreserveFace}
                                            max={100}
                                            step={10}
                                            className="w-full"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            值越高，越保留原人脸特征；值越低，AI创作自由度越高
                                        </p>
                                    </div>
                                )}

                                {faceMode === 'swap' && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label>🔄 融合强度</Label>
                                            <span className="text-sm text-muted-foreground">{blendStrength[0]}%</span>
                                        </div>
                                        <Slider
                                            value={blendStrength}
                                            onValueChange={setBlendStrength}
                                            max={100}
                                            step={10}
                                            className="w-full"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            值越高，融合越自然；值越低，越保留原场景
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Background Removal & Replacement - Image Upload */}
                        {(mode === 'background-removal' || mode === 'background-replacement') && (
                            <>
                                <div className="space-y-2">
                                    <Label>📸 上传图片</Label>
                                    {!backgroundImage ? (
                                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                                            onClick={() => document.getElementById('background-upload')?.click()}>
                                            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">点击上传要处理的图片</p>
                                            <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG，最大 5MB</p>
                                            <input
                                                id="background-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        toast({
                                                            title: "文件过大",
                                                            description: "图片大小不能超过 5MB",
                                                            variant: "destructive",
                                                        })
                                                        return
                                                    }
                                                    const reader = new FileReader()
                                                    reader.onload = (event) => {
                                                        setBackgroundImage(event.target?.result as string)
                                                    }
                                                    reader.readAsDataURL(file)
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <img src={backgroundImage} alt="Background" className="w-full rounded-lg" />
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                className="absolute top-2 right-2"
                                                onClick={() => setBackgroundImage(null)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Background Removal: Subject Type */}
                                {mode === 'background-removal' && (
                                    <div className="space-y-2">
                                        <Label>🎯 主体类型</Label>
                                        <Select value={backgroundSubject} onValueChange={(v: any) => setBackgroundSubject(v)}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="选择主体类型" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="auto">🤖 自动识别</SelectItem>
                                                <SelectItem value="person">👤 人物</SelectItem>
                                                <SelectItem value="object">📦 物品</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Background Replacement: Scene Selection */}
                                {mode === 'background-replacement' && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>🏞️ 背景场景</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                {[
                                                    { id: 'office', name: '💼 现代办公', emoji: '💼' },
                                                    { id: 'nature', name: '🌳 自然风光', emoji: '🌳' },
                                                    { id: 'tech', name: '⚡ 科技未来', emoji: '⚡' },
                                                    { id: 'fantasy', name: '✨ 梦幻场景', emoji: '✨' },
                                                    { id: 'solid', name: '🎨 纯色背景', emoji: '🎨' },
                                                    { id: 'blur', name: '💫 模糊背景', emoji: '💫' },
                                                ].map((scene) => (
                                                    <Button
                                                        key={scene.id}
                                                        variant={backgroundScene === scene.id ? 'default' : 'outline'}
                                                        className="h-auto py-2 px-3 text-xs justify-start"
                                                        onClick={() => setBackgroundScene(scene.id as any)}
                                                    >
                                                        <span className="truncate">{scene.name}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Custom Prompt */}
                                        <div className="space-y-2">
                                            <Label>💬 自定义场景 (可选)</Label>
                                            <Textarea
                                                placeholder="可输入自定义场景描述覆盖预设..."
                                                value={customBackgroundPrompt}
                                                onChange={(e) => setCustomBackgroundPrompt(e.target.value)}
                                                rows={2}
                                                className="resize-none text-sm"
                                            />
                                        </div>

                                        {/* Color Picker for Solid Background */}
                                        {backgroundScene === 'solid' && (
                                            <div className="space-y-2">
                                                <Label>🎨 背景颜色</Label>
                                                <Input
                                                    type="color"
                                                    value={backgroundColor}
                                                    onChange={(e) => setBackgroundColor(e.target.value)}
                                                    className="h-12 w-full"
                                                />
                                            </div>
                                        )}

                                        {/* Advanced Options */}
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="match-lighting"
                                                    checked={matchLighting}
                                                    onCheckedChange={(checked) => setMatchLighting(checked as boolean)}
                                                />
                                                <Label htmlFor="match-lighting" className="text-sm cursor-pointer">
                                                    💡 匹配光照效果
                                                </Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="add-depth"
                                                    checked={addDepth}
                                                    onCheckedChange={(checked) => setAddDepth(checked as boolean)}
                                                />
                                                <Label htmlFor="add-depth" className="text-sm cursor-pointer">
                                                    🌫️ 添加景深效果
                                                </Label>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* Storyboard Generation UI */}
                        {mode === 'storyboard' && (
                            <>
                                <div className="space-y-2">
                                    <Label>📖 故事描述</Label>
                                    <Textarea
                                        placeholder="输入故事情节，例如：一个年轻冒险家在森林中探险，遭遇神秘生物，最终成为朋友..."
                                        value={storyPrompt}
                                        onChange={(e) => setStoryPrompt(e.target.value)}
                                        rows={4}
                                        className="resize-none"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        AI将自动把故事拆分为{numFrames}个连续分镜
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label>👤 角色参考图 (可选)</Label>
                                    {!storyCharacterImage ? (
                                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                                            onClick={() => document.getElementById('story-character-upload')?.click()}>
                                            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                            <p className="text-sm text-muted-foreground">点击上传角色照片</p>
                                            <p className="text-xs text-muted-foreground mt-1">可选 - 用于保持角色外观一致</p>
                                            <input
                                                id="story-character-upload"
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (!file) return
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        toast({
                                                            title: "文件过大",
                                                            description: "图片大小不能超过 5MB",
                                                            variant: "destructive",
                                                        })
                                                        return
                                                    }
                                                    const reader = new FileReader()
                                                    reader.onload = (event) => {
                                                        setStoryCharacterImage(event.target?.result as string)
                                                    }
                                                    reader.readAsDataURL(file)
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <img src={storyCharacterImage} alt="Character" className="w-full rounded-lg" />
                                            <Button
                                                size="icon"
                                                variant="destructive"
                                                className="absolute top-2 right-2"
                                                onClick={() => setStoryCharacterImage(null)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>🎞️ 分镜数量: {numFrames}</Label>
                                    <Slider
                                        value={[numFrames]}
                                        onValueChange={(value) => setNumFrames(value[0])}
                                        min={4}
                                        max={8}
                                        step={1}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>4帧</span>
                                        <span>8帧</span>
                                    </div>
                                </div>

                                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                                    <p className="text-xs font-medium">💡 使用建议：</p>
                                    <ul className="text-xs text-muted-foreground space-y-1 ml-4 list-disc">
                                        <li>故事情节尽量具体，包含情节发展</li>
                                        <li>上传角色图可保持人物一致性</li>
                                        <li>生成时间较长，请耐心等待</li>
                                    </ul>
                                </div>
                            </>
                        )}

                        {/* Phase 3: Style Transfer Image Upload */}
                        {mode === 'style-transfer' && (
                            <div className="space-y-2">
                                <Label>📸 上传照片</Label>
                                {!styleTransferImage ? (
                                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                                        onClick={() => document.getElementById('style-transfer-upload')?.click()}>
                                        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">点击上传要转换风格的照片</p>
                                        <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG，最大 5MB</p>
                                        <input
                                            id="style-transfer-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0]
                                                if (!file) return
                                                if (file.size > 5 * 1024 * 1024) {
                                                    toast({
                                                        title: "文件过大",
                                                        description: "图片大小不能超过 5MB",
                                                        variant: "destructive",
                                                    })
                                                    return
                                                }
                                                const reader = new FileReader()
                                                reader.onload = (event) => {
                                                    setStyleTransferImage(event.target?.result as string)
                                                }
                                                reader.readAsDataURL(file)
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <img src={styleTransferImage} alt="Style Transfer" className="w-full rounded-lg" />
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="absolute top-2 right-2"
                                            onClick={() => setStyleTransferImage(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Phase 2: Reference Image Upload (for image-to-image mode) */}
                        {mode === 'image-to-image' && (
                            <div className="space-y-2">
                                <Label>📸 参考图片</Label>
                                {!referenceImage ? (
                                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                                        onClick={() => document.getElementById('image-upload')?.click()}>
                                        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                        <p className="text-sm text-muted-foreground">点击上传图片</p>
                                        <p className="text-xs text-muted-foreground mt-1">支持 JPG、PNG，最大 5MB</p>
                                        <input
                                            id="image-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleImageUpload}
                                        />
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <img src={referenceImage} alt="Reference" className="w-full rounded-lg" />
                                        <Button
                                            size="icon"
                                            variant="destructive"
                                            className="absolute top-2 right-2"
                                            onClick={() => setReferenceImage(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
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

                        {/* Phase 2: AI Prompt Optimizer */}
                        <div>
                            <Button
                                onClick={handleOptimizePrompt}
                                disabled={isOptimizing || !prompt.trim()}
                                variant="outline"
                                className="w-full"
                                size="sm"
                            >
                                {isOptimizing ? (
                                    <>
                                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                        优化中...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-3 w-3" />
                                        ✨ 优化提示词
                                    </>
                                )}
                            </Button>
                        </div>

                        {/* Phase 2: Image-to-Image Controls */}
                        {mode === 'image-to-image' && referenceImage && (
                            <>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>🎨 重绘强度</Label>
                                        <span className="text-sm text-muted-foreground">{denoisingStrength[0]}%</span>
                                    </div>
                                    <Slider
                                        value={denoisingStrength}
                                        onValueChange={setDenoisingStrength}
                                        max={100}
                                        step={5}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        值越低，保留原图特征越多；值越高，自由度越大
                                    </p>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="preserve-composition"
                                        checked={preserveComposition}
                                        onCheckedChange={(checked) => setPreserveComposition(!!checked)}
                                    />
                                    <Label htmlFor="preserve-composition" className="text-sm cursor-pointer">
                                        📐 保留原图构图和布局
                                    </Label>
                                </div>
                            </>
                        )}

                        {/* Phase 3: Drawing Canvas (for sketch-to-image mode) */}
                        {mode === 'sketch-to-image' && (
                            <div className="space-y-3">
                                <Label>✍️ 绘制草图</Label>
                                <DrawingCanvas
                                    onSketchChange={setSketchData}
                                    width={400}
                                    height={400}
                                />
                            </div>
                        )}

                        {/* Phase 3: Sticker Style Selector (for sticker-maker mode))
                        {mode === 'sticker-maker' && (
                            <div className="space-y-3">
                                <Label>🎨 贴纸风格</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div
                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${stickerStyle === 'cartoon'
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-primary/50'
                                            }`}
                                        onClick={() => setStickerStyle('cartoon')}
                                    >
                                        <div className="font-medium text-sm">🎭 卡通风格</div>
                                        <div className="text-xs text-muted-foreground mt-1">简洁设计，可爱卡通</div>
                                    </div>
                                    <div
                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${stickerStyle === 'pixel'
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-primary/50'
                                            }`}
                                        onClick={() => setStickerStyle('pixel')}
                                    >
                                        <div className="font-medium text-sm">👾 像素风格</div>
                                        <div className="text-xs text-muted-foreground mt-1">8位复古像素艺术</div>
                                    </div>
                                    <div
                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${stickerStyle === '3d'
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-primary/50'
                                            }`}
                                        onClick={() => setStickerStyle('3d')}
                                    >
                                        <div className="font-medium text-sm">🎮 3D渲染</div>
                                        <div className="text-xs text-muted-foreground mt-1">光滑3D质感</div>
                                    </div>
                                    <div
                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${stickerStyle === 'hand-drawn'
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:border-primary/50'
                                            }`}
                                        onClick={() => setStickerStyle('hand-drawn')}
                                    >
                                        <div className="font-medium text-sm">✏️ 手绘风格</div>
                                        <div className="text-xs text-muted-foreground mt-1">艺术线条，水彩风</div>
                                    </div>
                                </div>
                            </div>
                        )} */}

                        {/* Phase 3: Art Style Gallery (for style-transfer mode) */}
                        {mode === 'style-transfer' && (
                            <>
                                <div className="space-y-3">
                                    <Label>🎨 选择艺术风格</Label>
                                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                                        {artStyles.map((style) => (
                                            <div
                                                key={style.id}
                                                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedArtStyle === style.id
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-primary/50'
                                                    }`}
                                                onClick={() => setSelectedArtStyle(style.id)}
                                            >
                                                <div className="font-medium text-sm">{style.name}</div>
                                                <div className="text-xs text-muted-foreground mt-1">{style.description}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>🎚️ 风格强度</Label>
                                        <span className="text-sm text-muted-foreground">{styleIntensity[0]}%</span>
                                    </div>
                                    <Slider
                                        value={styleIntensity}
                                        onValueChange={setStyleIntensity}
                                        max={100}
                                        step={10}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        值越高，艺术风格越明显；值越低，越接近原图
                                    </p>
                                </div>
                            </>
                        )}

                        {/* Style Selection - Dynamic based on mode */}
                        {mode === 'style-mix' ? (
                            <div className="space-y-3">
                                <Label>🎨 风格混合 (最多3个)</Label>
                                <div className="space-y-2">
                                    {imageStyles.slice(0, 10).map((style) => {
                                        const isSelected = selectedStyles.includes(style.id)
                                        const weight = styleWeights[style.id] || 0

                                        return (
                                            <div key={style.id} className="space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <label className="flex items-center space-x-2 cursor-pointer">
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => {
                                                                if (checked && selectedStyles.length < 3) {
                                                                    const newStyles = [...selectedStyles, style.id]
                                                                    setSelectedStyles(newStyles)
                                                                    // Initialize weight
                                                                    const equalWeight = Math.floor(100 / newStyles.length)
                                                                    const newWeights: { [key: string]: number } = {}
                                                                    newStyles.forEach(s => newWeights[s] = equalWeight)
                                                                    setStyleWeights(newWeights)
                                                                } else if (!checked) {
                                                                    const newStyles = selectedStyles.filter(s => s !== style.id)
                                                                    setSelectedStyles(newStyles)
                                                                    const newWeights = { ...styleWeights }
                                                                    delete newWeights[style.id]
                                                                    // Redistribute weights
                                                                    if (newStyles.length > 0) {
                                                                        const equalWeight = Math.floor(100 / newStyles.length)
                                                                        newStyles.forEach(s => newWeights[s] = equalWeight)
                                                                    }
                                                                    setStyleWeights(newWeights)
                                                                }
                                                            }}
                                                            disabled={!isSelected && selectedStyles.length >= 3}
                                                        />
                                                        <span className="text-sm">{style.name}</span>
                                                    </label>
                                                    {isSelected && <span className="text-xs text-muted-foreground">{weight}%</span>}
                                                </div>
                                                {isSelected && (
                                                    <Slider
                                                        value={[weight]}
                                                        onValueChange={([v]) => {
                                                            setStyleWeights(prev => ({ ...prev, [style.id]: v }))
                                                        }}
                                                        max={100}
                                                        step={5}
                                                        className="w-full"
                                                    />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ) : (
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
                        )}

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

                        {/* Storyboard Grid Display */}
                        {mode === 'storyboard' && storyboardFrames.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold">故事板 ({storyboardFrames.length}个分镜)</h3>
                                </div>
                                <div className="max-h-[600px] overflow-y-auto overflow-x-hidden pr-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        {storyboardFrames.map((frame: any) => (
                                            <div key={frame.frameNumber} className="group relative overflow-hidden rounded-lg border bg-card">
                                                <div className="aspect-video w-full">
                                                    <img
                                                        src={frame.imageUrl}
                                                        alt={`Frame ${frame.frameNumber}`}
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                                <div className="p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <Badge variant="outline">分镜 {frame.frameNumber}</Badge>
                                                        <Badge variant="secondary">{shotTypeTranslations[frame.shotType] || frame.shotType}</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {frame.description}
                                                    </p>
                                                </div>
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        onClick={() => {
                                                            const img = generatedImages.find(i => i.id === `story_${frame.frameNumber}`)
                                                            if (img) downloadImage(img, frame.frameNumber - 1)
                                                        }}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Normal Grid Display */}
                        {mode !== 'storyboard' && generatedImages.length > 0 && (
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

                        {groupStoryboards(history).slice(0, 20).map((group) => {
                            if (group.type === 'storyboard') {
                                const isExpanded = expandedStoryboards.has(group.id)
                                const firstImage = group.images[0]

                                return (
                                    <div key={group.id} className="rounded-lg border overflow-hidden">
                                        {/* Storyboard Header */}
                                        <div
                                            className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer hover:bg-muted"
                                            onClick={() => toggleStoryboard(group.id)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Film className="h-4 w-4" />
                                                <span className="text-sm font-medium">故事板</span>
                                                <Badge variant="outline" className="text-xs">{group.images.length}帧</Badge>
                                            </div>
                                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>

                                        {/* Preview Grid (always visible) */}
                                        <div className="grid grid-cols-3 gap-1 p-1">
                                            {group.images.slice(0, 3).map((img) => (
                                                <img
                                                    key={img.id}
                                                    src={img.url}
                                                    alt="Preview"
                                                    className="aspect-video w-full object-cover rounded"
                                                />
                                            ))}
                                        </div>

                                        {/* Expanded View */}
                                        {isExpanded && (
                                            <div className="p-2 space-y-2 border-t">
                                                {group.images.map((img, idx) => (
                                                    <div key={img.id} className="group relative overflow-hidden rounded-lg border">
                                                        <div className="aspect-video">
                                                            <img
                                                                src={img.url}
                                                                alt={`Frame ${idx + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent">
                                                            <div className="absolute bottom-0 left-0 right-0 p-2">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Badge variant="outline" className="text-xs">分镜 {idx + 1}</Badge>
                                                                    <Badge variant="secondary" className="text-xs">{shotTypeTranslations[img.style] || img.style}</Badge>
                                                                </div>
                                                                <p className="text-xs text-white/80 line-clamp-1">{img.prompt}</p>
                                                            </div>
                                                        </div>
                                                        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                                                                onClick={() => deleteImage(img.id)}
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <p className="text-xs text-muted-foreground text-center">{group.timestamp}</p>
                                            </div>
                                        )}
                                    </div>
                                )
                            } else {
                                // Single image
                                const img = group.images[0]
                                return (
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
                                )
                            }
                        })}
                    </CardContent>
                </Card>
            </aside>
        </div>
    )
}
