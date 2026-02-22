"use client"

import { useState, useRef } from "react"
import {
    Music,
    Play,
    Download,
    Loader2,
    Zap,
    Sparkles,
    ChevronDown,
    ChevronUp,
    ArrowRight,
    Tag,
    Gauge,
    Guitar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { aiContentApi } from "@/lib/api/ai-content"
import type { MusicRecommendation } from "@/lib/api/ai-content"
import { cn } from "@/lib/utils"

interface SceneData {
    script: string
    mood?: string
    tags?: string[]
    imageDescription?: string
}

interface MusicStudioProps {
    musicProvider?: string
    textProvider?: string
    scenes?: SceneData[]
}

interface GeneratedMusic {
    id: string
    url: string
    prompt: string
    timestamp: string
}

export function MusicStudio({ musicProvider, textProvider, scenes }: MusicStudioProps) {
    const { toast } = useToast()
    const audioRef = useRef<HTMLAudioElement>(null)
    const promptRef = useRef<HTMLTextAreaElement>(null)

    // State
    const [prompt, setPrompt] = useState("")
    const [duration, setDuration] = useState([10])
    const [isGenerating, setIsGenerating] = useState(false)
    const [currentMusic, setCurrentMusic] = useState<GeneratedMusic | null>(null)
    const [history, setHistory] = useState<GeneratedMusic[]>([])

    // Recommendation state
    const [recommendations, setRecommendations] = useState<MusicRecommendation[]>([])
    const [isRecommending, setIsRecommending] = useState(false)
    const [recommendOpen, setRecommendOpen] = useState(true)
    const [selectedRec, setSelectedRec] = useState<number | null>(null)

    const hasScenes = scenes && scenes.length > 0

    const handleRecommend = async () => {
        if (!hasScenes) {
            toast({
                title: "没有分镜内容",
                description: "请先在 Workbench 中生成视频分镜，然后返回此页面获取 BGM 推荐。",
                variant: "destructive"
            })
            return
        }

        setIsRecommending(true)
        setSelectedRec(null)
        try {
            const response = await aiContentApi.recommendMusic({
                scenes: scenes!.map(s => ({
                    script: s.script,
                    mood: s.mood,
                    tags: s.tags || [],
                })),
                textProvider: textProvider,
            })

            if (response.success && response.recommendations.length > 0) {
                setRecommendations(response.recommendations)
                setRecommendOpen(true)
                toast({
                    title: "推荐完成",
                    description: `已为您推荐 ${response.recommendations.length} 种背景音乐方案`,
                })
            }
        } catch (error: any) {
            toast({
                title: "推荐失败",
                description: error.message || "无法获取音乐推荐",
                variant: "destructive"
            })
        } finally {
            setIsRecommending(false)
        }
    }

    const applyRecommendation = (rec: MusicRecommendation, index: number) => {
        setPrompt(rec.prompt)
        setSelectedRec(index)
        // Auto-scroll to prompt textarea
        setTimeout(() => {
            promptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
            promptRef.current?.focus()
        }, 100)
        toast({
            title: "已填入推荐 Prompt",
            description: `风格: ${rec.genre} | 情绪: ${rec.mood}`,
        })
    }

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast({
                title: "Input Required",
                description: "Please enter a description for the music.",
                variant: "destructive"
            })
            return
        }

        setIsGenerating(true)
        try {
            const response = await aiContentApi.generateMusic({
                prompt,
                duration: duration[0],
                provider: musicProvider
            })

            if (response.success) {
                const newMusic: GeneratedMusic = {
                    id: `music_${Date.now()}`,
                    url: response.audioUrl,
                    prompt: prompt,
                    timestamp: new Date().toLocaleTimeString()
                }
                setCurrentMusic(newMusic)
                setHistory(prev => [newMusic, ...prev])
                toast({
                    title: "Music Generated",
                    description: "Music is ready to play.",
                })
            }
        } catch (error: any) {
            toast({
                title: "Generation Failed",
                description: error.message || "Failed to generate music.",
                variant: "destructive"
            })
        } finally {
            setIsGenerating(false)
        }
    }

    const downloadMusic = (music: GeneratedMusic) => {
        const a = document.createElement("a")
        a.href = music.url
        a.download = `music_${music.id}.mp3`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
    }

    return (
        <div className="flex h-full flex-col lg:flex-row gap-6 p-4 overflow-hidden">
            {/* Left Column: Controls */}
            <aside className="w-full lg:w-[420px] shrink-0 flex flex-col gap-4 overflow-y-auto h-full pr-1">

                {/* AI Smart Recommendation */}
                <Card className="border-primary/20">
                    <Collapsible open={recommendOpen} onOpenChange={setRecommendOpen}>
                        <CollapsibleTrigger className="w-full">
                            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                        AI 智能推荐
                                    </CardTitle>
                                    {recommendOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                </div>
                                <CardDescription className="text-left">
                                    基于视频分镜内容，AI自动推荐合适的BGM风格
                                </CardDescription>
                            </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <CardContent className="pt-0 space-y-3">
                                {/* Status indicator */}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className={cn(
                                        "h-2 w-2 rounded-full",
                                        hasScenes ? "bg-green-500" : "bg-orange-400"
                                    )} />
                                    {hasScenes
                                        ? `已检测到 ${scenes!.length} 个分镜场景`
                                        : "尚未生成分镜内容（请先在 Workbench 中生成）"
                                    }
                                </div>

                                {/* Recommend button */}
                                <Button
                                    className="w-full"
                                    variant={hasScenes ? "default" : "outline"}
                                    size="sm"
                                    onClick={handleRecommend}
                                    disabled={isRecommending || !hasScenes}
                                >
                                    {isRecommending ? (
                                        <>
                                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                            分析中...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-3 w-3" />
                                            获取 BGM 推荐
                                        </>
                                    )}
                                </Button>

                                {/* Recommendation cards */}
                                {recommendations.length > 0 && (
                                    <div className="space-y-2 pt-1">
                                        {recommendations.map((rec, i) => (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "rounded-lg border p-3 space-y-2 transition-all cursor-pointer hover:border-primary/50",
                                                    selectedRec === i
                                                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                                        : "border-border"
                                                )}
                                                onClick={() => applyRecommendation(rec, i)}
                                            >
                                                {/* Header */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="secondary" className="text-[10px] font-medium">
                                                            {rec.genre}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {rec.mood}
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-[10px] px-2"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            applyRecommendation(rec, i)
                                                        }}
                                                    >
                                                        <ArrowRight className="h-3 w-3 mr-1" />
                                                        使用
                                                    </Button>
                                                </div>

                                                {/* Details */}
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Gauge className="h-3 w-3" />
                                                        BPM {rec.bpmRange}
                                                    </span>
                                                    {rec.instruments.length > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <Guitar className="h-3 w-3" />
                                                            {rec.instruments.slice(0, 3).join(", ")}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Prompt Preview */}
                                                <div className="rounded-md bg-muted/60 px-3 py-2">
                                                    <p className="text-[10px] text-muted-foreground mb-1 font-medium">Prompt:</p>
                                                    <p className="text-xs leading-relaxed text-foreground">
                                                        {rec.prompt}
                                                    </p>
                                                </div>

                                                {/* Reason */}
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    💡 {rec.reason}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </CollapsibleContent>
                    </Collapsible>
                </Card>

                {/* Music Generation Card */}
                <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Music className="h-5 w-5 text-primary" />
                            AI Music Studio
                        </CardTitle>
                        <CardDescription>
                            Generate original music from text descriptions using AI.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* Prompt Input */}
                        <div className="space-y-2">
                            <Label>Music Description</Label>
                            <Textarea
                                ref={promptRef}
                                placeholder="Describe the music (e.g., 'Uplifting cinematic orchestral track', 'Lo-fi hip hop beat for study')"
                                className="min-h-[120px] resize-none text-base"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                        </div>

                        {/* Duration Settings */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Label>Duration (Seconds)</Label>
                                    <span className="text-xs text-muted-foreground">{duration[0]}s</span>
                                </div>
                                <Slider
                                    value={duration}
                                    min={5}
                                    max={30}
                                    step={1}
                                    onValueChange={setDuration}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Longer duration takes more time to generate.
                                </p>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="pt-2 pb-6">
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt.trim()}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Zap className="mr-2 h-4 w-4" />
                                    Generate Music
                                </>
                            )}
                        </Button>
                    </CardFooter>
                </Card>
            </aside>

            {/* Right Column: Output & History */}
            <main className="flex-1 flex flex-col gap-4 overflow-hidden h-full">

                {/* Current Output Player */}
                <div className="shrink-0">
                    <Card className={cn("h-full transition-all duration-500", !currentMusic ? "opacity-50" : "opacity-100")}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Play className="h-4 w-4" />
                                Preview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {currentMusic ? (
                                <div className="flex flex-col gap-4">
                                    <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-center">
                                        <audio
                                            ref={audioRef}
                                            controls
                                            src={currentMusic.url}
                                            className="w-full"
                                            autoPlay
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground line-clamp-1 flex-1 mr-4">
                                            {currentMusic.prompt}
                                        </p>
                                        <Button variant="outline" size="sm" onClick={() => downloadMusic(currentMusic)}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                                    <p>No music generated yet</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* History List */}
                <Card className="flex-1 flex flex-col overflow-hidden">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Music className="h-4 w-4" />
                            History
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto p-0">
                        <ScrollArea className="h-full">
                            <div className="flex flex-col">
                                {history.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-sm">
                                        Your generated music tracks will appear here.
                                    </div>
                                ) : (
                                    history.map((item) => (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "flex items-center gap-3 p-3 border-b hover:bg-muted/50 transition-colors cursor-pointer",
                                                currentMusic?.id === item.id ? "bg-muted" : ""
                                            )}
                                            onClick={() => setCurrentMusic(item)}
                                        >
                                            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                                <Music className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium line-clamp-1">{item.prompt}</p>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span>{item.timestamp}</span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    downloadMusic(item)
                                                }}
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
