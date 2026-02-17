"use client"

import { useState, useRef } from "react"
import {
    Music,
    Play,
    Download,
    Loader2,
    Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { aiContentApi } from "@/lib/api/ai-content"
import { cn } from "@/lib/utils"

interface MusicStudioProps {
    musicProvider?: string
}

interface GeneratedMusic {
    id: string
    url: string
    prompt: string
    timestamp: string
}

export function MusicStudio({ musicProvider }: MusicStudioProps) {
    const { toast } = useToast()
    const audioRef = useRef<HTMLAudioElement>(null)

    // State
    const [prompt, setPrompt] = useState("")
    const [duration, setDuration] = useState([10])
    const [isGenerating, setIsGenerating] = useState(false)
    const [currentMusic, setCurrentMusic] = useState<GeneratedMusic | null>(null)
    const [history, setHistory] = useState<GeneratedMusic[]>([])

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
            <aside className="w-full lg:w-[400px] shrink-0 flex flex-col gap-4 overflow-hidden h-full">
                <Card className="flex-1 flex flex-col overflow-hidden">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Music className="h-5 w-5 text-primary" />
                            AI Music Studio
                        </CardTitle>
                        <CardDescription>
                            Generate original music from text descriptions using AI.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto space-y-6">

                        {/* Prompt Input */}
                        <div className="space-y-2">
                            <Label>Music Description</Label>
                            <Textarea
                                placeholder="Describe the music (e.g., 'Uplifting cinematic orchestral track', 'Lo-fi hip hop beat for study')"
                                className="min-h-[150px] resize-none text-base"
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
