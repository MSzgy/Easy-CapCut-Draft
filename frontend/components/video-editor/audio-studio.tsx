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
    Trash2,
    Upload
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
    onAudioGenerated?: (audio: GeneratedAudio) => void
}

interface GeneratedAudio {
    id: string
    url: string
    text: string
    timestamp: string
    mode: "tts" | "clone"
}

export function AudioStudio({ audioProvider, onAudioGenerated }: AudioStudioProps) {
    const { toast } = useToast()
    const audioRef = useRef<HTMLAudioElement>(null)

    // State
    const [mode, setMode] = useState<"tts" | "clone">("tts")
    const [text, setText] = useState("")
    const [voiceDescription, setVoiceDescription] = useState("A clear and professional voice.")
    // Clone mode state
    const [referenceAudio, setReferenceAudio] = useState<string | null>(null)
    const [referenceText, setReferenceText] = useState("")
    const [fileName, setFileName] = useState("")

    const [language, setLanguage] = useState("Auto")
    const [speed, setSpeed] = useState([1.0])
    const [isGenerating, setIsGenerating] = useState(false)
    const [currentAudio, setCurrentAudio] = useState<GeneratedAudio | null>(null)
    const [history, setHistory] = useState<GeneratedAudio[]>([])

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            toast({
                title: "File too large",
                description: "Please upload an audio file smaller than 10MB.",
                variant: "destructive"
            })
            return
        }

        setFileName(file.name)
        const reader = new FileReader()
        reader.onload = (event) => {
            const result = event.target?.result as string
            setReferenceAudio(result)
        }
        reader.readAsDataURL(file)
    }

    const handleGenerate = async () => {
        if (!text.trim()) {
            toast({
                title: "Input Required",
                description: "Please enter text to generate speech.",
                variant: "destructive"
            })
            return
        }

        if (mode === "clone" && !referenceAudio) {
            toast({
                title: "Reference Audio Required",
                description: "Please upload a reference audio file for voice cloning.",
                variant: "destructive"
            })
            return
        }

        setIsGenerating(true)
        try {
            const response = await aiContentApi.generateSpeech({
                text,
                voiceDescription: mode === "tts" ? voiceDescription : undefined,
                language,
                speed: speed[0],
                provider: audioProvider,
                referenceAudio: mode === "clone" ? referenceAudio! : undefined,
                referenceText: mode === "clone" ? referenceText : undefined
            })

            if (response.success) {
                const newAudio: GeneratedAudio = {
                    id: `audio_${Date.now()}`,
                    url: response.audioUrl,
                    text: text,
                    timestamp: new Date().toLocaleTimeString(),
                    mode: mode
                }
                setCurrentAudio(newAudio)
                setHistory(prev => [newAudio, ...prev])
                // Notify parent to add to Media Vault
                onAudioGenerated?.(newAudio)

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
                            Generate lifelike speech or clone voices using AI.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto space-y-6">

                        <Tabs defaultValue="tts" value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="tts">Text to Speech</TabsTrigger>
                                <TabsTrigger value="clone">Voice Clone</TabsTrigger>
                            </TabsList>

                            <div className="mt-4 space-y-4">
                                {/* Common Text Input */}
                                <div className="space-y-2">
                                    <Label>Script / Target Text</Label>
                                    <Textarea
                                        placeholder="Enter the text you want the voice to speak..."
                                        className="min-h-[100px] resize-none text-base"
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                    />
                                    <div className="text-xs text-muted-foreground text-right">
                                        {text.length} characters
                                    </div>
                                </div>

                                <TabsContent value="tts" className="space-y-4 mt-0">
                                    <div className="space-y-2">
                                        <Label>Voice Description</Label>
                                        <Textarea
                                            placeholder="Describe the voice (e.g., 'A deep, resonant male voice', 'A cheerful young female voice')"
                                            className="h-20 resize-none"
                                            value={voiceDescription}
                                            onChange={(e) => setVoiceDescription(e.target.value)}
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="clone" className="space-y-4 mt-0">
                                    <div className="space-y-2">
                                        <Label>Reference Audio</Label>
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="w-full relative cursor-pointer" asChild>
                                                <label>
                                                    <Upload className="mr-2 h-4 w-4" />
                                                    {fileName || "Upload Audio Sample"}
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="audio/*"
                                                        onChange={handleFileUpload}
                                                    />
                                                </label>
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Upload a clear recording of the voice you want to clone (WAV/MP3).
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Reference Text (Optional)</Label>
                                        <Textarea
                                            placeholder="What is being said in the reference audio? (Improves quality)"
                                            className="h-20 resize-none"
                                            value={referenceText}
                                            onChange={(e) => setReferenceText(e.target.value)}
                                        />
                                    </div>
                                </TabsContent>
                            </div>
                        </Tabs>

                        {/* Common Settings */}
                        <div className="space-y-4 pt-4 border-t">
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
                            disabled={isGenerating || !text.trim() || (mode === "clone" && !referenceAudio)}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Volume2 className="mr-2 h-4 w-4" />
                                    {mode === "clone" ? "Clone Voice & Generate" : "Generate Speech"}
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
                                        <div className="flex-1 mr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={cn(
                                                    "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold",
                                                    currentAudio.mode === "clone" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                                )}>
                                                    {currentAudio.mode}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{currentAudio.timestamp}</span>
                                            </div>
                                            <p className="text-sm text-foreground line-clamp-2">
                                                {currentAudio.text}
                                            </p>
                                        </div>
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
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={cn(
                                                        "text-[10px] px-1.5 py-0.5 rounded uppercase font-bold",
                                                        item.mode === "clone" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                                    )}>
                                                        {item.mode}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{item.timestamp}</span>
                                                </div>
                                                <p className="text-sm font-medium line-clamp-1">{item.text}</p>
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
