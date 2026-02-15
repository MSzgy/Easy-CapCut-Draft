"use client"

import { useState, useRef } from "react"
import {
    Mic,
    Play,
    Download,
    Loader2,
    RefreshCw,
    Save,
    Music,
    Volume2,
    Trash2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { aiContentApi } from "@/lib/api/ai-content"
import { cn } from "@/lib/utils"

interface AudioStudioProps {
    audioProvider?: string
}

interface GeneratedAudio {
    id: string
    url: string
    text: string
    timestamp: string
}

export function AudioStudio({ audioProvider }: AudioStudioProps) {
    const { toast } = useToast()
    const audioRef = useRef<HTMLAudioElement>(null)

    // State
    const [text, setText] = useState("")
    const [voiceDescription, setVoiceDescription] = useState("A clear and professional voice.")
    const [language, setLanguage] = useState("Auto")
    const [speed, setSpeed] = useState([1.0])
    const [isGenerating, setIsGenerating] = useState(false)
    const [currentAudio, setCurrentAudio] = useState<GeneratedAudio | null>(null)
    const [history, setHistory] = useState<GeneratedAudio[]>([])

    const handleGenerate = async () => {
        if (!text.trim()) {
            toast({
                title: "Input Required",
                description: "Please enter text to generate speech.",
                variant: "destructive"
            })
            return
        }

        setIsGenerating(true)
        try {
            const response = await aiContentApi.generateSpeech({
                text,
                voiceDescription,
                language,
                speed: speed[0],
                provider: audioProvider
            })

            if (response.success) {
                const newAudio: GeneratedAudio = {
                    id: `audio_${Date.now()}`,
                    url: response.audioUrl,
                    text: text,
                    timestamp: new Date().toLocaleTimeString()
                }
                setCurrentAudio(newAudio)
                setHistory(prev => [newAudio, ...prev])
                toast({
                    title: "Speech Generated",
                    description: "Audio is ready to play.",
                })
            }
        } catch (error: any) {
            toast({
                title: "Generation Failed",
                description: error.message || "Failed to generate speech.",
                variant: "destructive"
            })
        } finally {
            setIsGenerating(false)
        }
    }

    const downloadAudio = (audio: GeneratedAudio) => {
        const a = document.createElement("a")
        a.href = audio.url
        a.download = `speech_${audio.id}.mp3`
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
                            <Mic className="h-5 w-5 text-primary" />
                            AI Audio Studio
                        </CardTitle>
                        <CardDescription>
                            Generate lifelike speech from text using AI.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto space-y-6">

                        {/* Text Input */}
                        <div className="space-y-2">
                            <Label>Script / Text</Label>
                            <Textarea
                                placeholder="Enter text to speak..."
                                className="min-h-[150px] resize-none text-base"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                            />
                            <div className="text-xs text-muted-foreground text-right">
                                {text.length} characters
                            </div>
                        </div>

                        {/* Voice Settings */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Voice Description</Label>
                                <Textarea
                                    placeholder="Describe the voice (e.g., 'A deep, resonant male voice', 'A cheerful young female voice')"
                                    className="h-20 resize-none"
                                    value={voiceDescription}
                                    onChange={(e) => setVoiceDescription(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Language</Label>
                                    <Select value={language} onValueChange={setLanguage}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Auto">Auto Detect</SelectItem>
                                            <SelectItem value="English">English</SelectItem>
                                            <SelectItem value="Chinese">Chinese</SelectItem>
                                            <SelectItem value="Japanese">Japanese</SelectItem>
                                            <SelectItem value="Korean">Korean</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label>Speed</Label>
                                        <span className="text-xs text-muted-foreground">{speed[0]}x</span>
                                    </div>
                                    <Slider
                                        value={speed}
                                        min={0.5}
                                        max={2.0}
                                        step={0.1}
                                        onValueChange={setSpeed}
                                    />
                                </div>
                            </div>
                        </div>

                    </CardContent>
                    <CardFooter className="pt-2 pb-6">
                        <Button
                            className="w-full"
                            size="lg"
                            onClick={handleGenerate}
                            disabled={isGenerating || !text.trim()}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Volume2 className="mr-2 h-4 w-4" />
                                    Generate Speech
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
                    <Card className={cn("h-full transition-all duration-500", !currentAudio ? "opacity-50" : "opacity-100")}>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Play className="h-4 w-4" />
                                Preview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {currentAudio ? (
                                <div className="flex flex-col gap-4">
                                    <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-center">
                                        <audio
                                            ref={audioRef}
                                            controls
                                            src={currentAudio.url}
                                            className="w-full"
                                            autoPlay
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground line-clamp-1 flex-1 mr-4">
                                            {currentAudio.text}
                                        </p>
                                        <Button variant="outline" size="sm" onClick={() => downloadAudio(currentAudio)}>
                                            <Download className="h-4 w-4 mr-2" />
                                            Download
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
                                    <p>No audio generated yet</p>
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
                                        Your generated audio clips will appear here.
                                    </div>
                                ) : (
                                    history.map((item) => (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "flex items-center gap-3 p-3 border-b hover:bg-muted/50 transition-colors cursor-pointer",
                                                currentAudio?.id === item.id ? "bg-muted" : ""
                                            )}
                                            onClick={() => setCurrentAudio(item)}
                                        >
                                            <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                                <Music className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium line-clamp-1">{item.text}</p>
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
                                                    downloadAudio(item)
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
