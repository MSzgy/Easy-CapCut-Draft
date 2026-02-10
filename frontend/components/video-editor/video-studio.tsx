"use client"

import { useState, useRef } from "react"
import {
    Video,
    Upload,
    Music,
    Settings2,
    Play,
    Download,
    Loader2,
    Image as ImageIcon,
    RefreshCw,
    Film
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { aiContentApi } from "@/lib/api/ai-content"
import { cn } from "@/lib/utils"
// import { Card } from "@/components/ui/card" // Not used directly, using div with classes

const CAMERA_LORA_OPTIONS = [
    "No LoRA",
    "Zoom In",
    "Zoom Out",
    "Pan Left",
    "Pan Right",
    "Tilt Up",
    "Tilt Down",
    "Static",
    "Orbit Left",
    "Orbit Right"
]

const RESOLUTIONS = [
    { label: "Landscape (16:9)", width: 1024, height: 576 },
    { label: "Portrait (9:16)", width: 576, height: 1024 },
    { label: "Square (1:1)", width: 768, height: 768 },
    { label: "Standard (4:3)", width: 768, height: 512 }, // Approx
    { label: "Standard (3:4)", width: 512, height: 768 }, // Approx
    { label: "Widescreen (21:9)", width: 1024, height: 432 },
    { label: "Classic (3:2)", width: 768, height: 512 }
]
// Default to the user request's 512x768 (which is roughly 2:3) or similar. 
// I'll stick to fixed values or let user select. 
// The API schema has ge=256, le=1024.
// Let's use a custom resolution selector or predefined.

export function VideoStudio() {
    const { toast } = useToast()

    // -- State --
    const [firstFrame, setFirstFrame] = useState<string | null>(null)
    const [endFrame, setEndFrame] = useState<string | null>(null)
    const [audioPath, setAudioPath] = useState<string | null>(null)
    const [inputVideo, setInputVideo] = useState<string | null>(null)

    const [prompt, setPrompt] = useState("Make this image come alive with cinematic motion, smooth animation")
    const [duration, setDuration] = useState(5)
    const [generationMode, setGenerationMode] = useState<"Image-to-Video" | "Video-to-Video">("Image-to-Video")
    const [enhancePrompt, setEnhancePrompt] = useState(true)
    const [seed, setSeed] = useState(10)
    const [randomizeSeed, setRandomizeSeed] = useState(true)
    const [cameraLora, setCameraLora] = useState("No LoRA")

    const [width, setWidth] = useState(768)
    const [height, setHeight] = useState(512)

    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedVideo, setGeneratedVideo] = useState<string | null>(null)

    // -- File Handlers --
    const handleFileUpload = (
        e: React.ChangeEvent<HTMLInputElement>,
        setter: (val: string | null) => void
    ) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = (event) => {
                if (event.target?.result) {
                    setter(event.target.result as string)
                }
            }
            reader.readAsDataURL(file)
        }
    }

    // -- Generate --
    const handleGenerate = async () => {
        if (!firstFrame) {
            toast({
                title: "Missing First Frame",
                description: "Please upload a first frame image to start.",
                variant: "destructive"
            })
            return
        }

        setIsGenerating(true)
        setGeneratedVideo(null)

        try {
            const response = await aiContentApi.generateVideoImageAudio({
                firstFrame,
                endFrame: endFrame || undefined,
                prompt,
                duration,
                generationMode,
                enhancePrompt,
                seed,
                randomizeSeed,
                width,
                height,
                cameraLora,
                audioPath: audioPath || undefined,
                inputVideo: inputVideo || undefined
            })

            if (response.success && response.videoUrl) {
                setGeneratedVideo(response.videoUrl)
                toast({
                    title: "Video Generated",
                    description: "Your video has been successfully created!",
                })
            } else {
                throw new Error(response.message || "Generation failed")
            }
        } catch (error: any) {
            toast({
                title: "Generation Failed",
                description: error.message || "An unexpected error occurred.",
                variant: "destructive"
            })
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <div className="flex h-full flex-col lg:flex-row gap-6 p-2">

            {/* --- Left Column: Controls --- */}
            <aside className="w-full lg:w-[400px] shrink-0 flex flex-col gap-4 overflow-hidden">
                <ScrollArea className="flex-1 pr-4">
                    <div className="flex flex-col gap-6 p-1">

                        {/* 1. Prompt */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Prompt</Label>
                            <Textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the motion..."
                                className="h-24 resize-none"
                            />
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="enhance-prompt"
                                    checked={enhancePrompt}
                                    onCheckedChange={setEnhancePrompt}
                                />
                                <Label htmlFor="enhance-prompt" className="text-xs text-muted-foreground">Auto-enhance prompt</Label>
                            </div>
                        </div>

                        {/* 2. Frames Upload */}
                        <div className="space-y-4">
                            <Label className="text-sm font-medium">Keyframes</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {/* First Frame */}
                                <div className="space-y-2">
                                    <div
                                        className={cn(
                                            "relative aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-accent/5 transition-colors overflow-hidden group",
                                            firstFrame ? "border-primary/50" : "border-muted-foreground/25"
                                        )}
                                        onClick={() => document.getElementById("first-frame-upload")?.click()}
                                    >
                                        {firstFrame ? (
                                            <>
                                                <img src={firstFrame} alt="First Frame" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-xs text-white font-medium">Change</span>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-muted-foreground p-2 text-center">
                                                <ImageIcon className="w-6 h-6" />
                                                <span className="text-xs">First Frame</span>
                                            </div>
                                        )}
                                        <input
                                            id="first-frame-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, setFirstFrame)}
                                        />
                                    </div>
                                </div>

                                {/* End Frame */}
                                <div className="space-y-2">
                                    <div
                                        className={cn(
                                            "relative aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-accent/5 transition-colors overflow-hidden group",
                                            endFrame ? "border-primary/50" : "border-muted-foreground/25"
                                        )}
                                        onClick={() => document.getElementById("end-frame-upload")?.click()}
                                    >
                                        {endFrame ? (
                                            <>
                                                <img src={endFrame} alt="End Frame" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-xs text-white font-medium">Change</span>
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setEndFrame(null)
                                                    }}
                                                >
                                                    <RefreshCw className="w-3 h-3" />
                                                    <span className="sr-only">Remove</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x w-3 h-3"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                </Button>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center gap-1 text-muted-foreground p-2 text-center">
                                                <ImageIcon className="w-6 h-6 opacity-50" />
                                                <span className="text-xs">End Frame (Optional)</span>
                                            </div>
                                        )}
                                        <input
                                            id="end-frame-upload"
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, setEndFrame)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Audio Source (Optional)</Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-muted-foreground"
                                        onClick={() => document.getElementById("audio-upload")?.click()}
                                    >
                                        <Music className="w-4 h-4 mr-2" />
                                        <span className="truncate">{audioPath ? "Audio Selected" : "Upload Audio File"}</span>
                                    </Button>
                                    {audioPath && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setAudioPath(null)}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x w-4 h-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                        </Button>
                                    )}
                                    <input
                                        id="audio-upload"
                                        type="file"
                                        accept="audio/*"
                                        className="hidden"
                                        onChange={(e) => handleFileUpload(e, setAudioPath)}
                                    />
                                </div>
                            </div>

                            {/* Input Video (Visible only for Video-to-Video) */}
                            {generationMode === "Video-to-Video" && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Input Video</Label>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-muted-foreground"
                                            onClick={() => document.getElementById("video-upload")?.click()}
                                        >
                                            <Video className="w-4 h-4 mr-2" />
                                            <span className="truncate">{inputVideo ? "Video Selected" : "Upload Input Video"}</span>
                                        </Button>
                                        {inputVideo && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setInputVideo(null)}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x w-4 h-4"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                            </Button>
                                        )}
                                        <input
                                            id="video-upload"
                                            type="file"
                                            accept="video/*"
                                            className="hidden"
                                            onChange={(e) => handleFileUpload(e, setInputVideo)}
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">Used as reference for Video-to-Video generation.</p>
                                </div>
                            )}

                        </div>

                        {/* 3. Settings */}
                        <div className="space-y-4 border-t pt-4">
                            <div className="flex items-center gap-2">
                                <Settings2 className="w-4 h-4" />
                                <h3 className="text-sm font-medium">Generation Settings</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Duration */}
                                <div className="space-y-2 col-span-2">
                                    <div className="flex justify-between">
                                        <Label className="text-xs">Duration</Label>
                                        <span className="text-xs text-muted-foreground">{duration}s</span>
                                    </div>
                                    <Slider
                                        value={[duration]}
                                        min={1}
                                        max={10}
                                        step={1}
                                        onValueChange={([v]) => setDuration(v)}
                                    />
                                </div>

                                {/* Resolution */}
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs">Resolution</Label>
                                    <Select
                                        value={`${width}x${height}`}
                                        onValueChange={(val) => {
                                            const [w, h] = val.split('x').map(Number)
                                            setWidth(w)
                                            setHeight(h)
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select resolution" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {RESOLUTIONS.map(r => (
                                                <SelectItem key={r.label} value={`${r.width}x${r.height}`}>
                                                    {r.label} ({r.width}x{r.height})
                                                </SelectItem>
                                            ))}
                                            <SelectItem value="512x768">Custom (512x768)</SelectItem>
                                            <SelectItem value="768x768">Custom (768x768)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Camera LoRA */}
                                <div className="space-y-2 col-span-2">
                                    <Label className="text-xs">Camera Motion</Label>
                                    <Select value={cameraLora} onValueChange={setCameraLora}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CAMERA_LORA_OPTIONS.map(opt => (
                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Generation Mode */}
                                <div className="space-y-2">
                                    <Label className="text-xs">Mode</Label>
                                    <Select value={generationMode} onValueChange={(v: any) => setGenerationMode(v)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Image-to-Video">Image-to-Video</SelectItem>
                                            <SelectItem value="Video-to-Video">Video-to-Video</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Seed */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-xs">Seed</Label>
                                        <div className="flex items-center gap-1">
                                            <Switch
                                                id="random-seed"
                                                checked={randomizeSeed}
                                                onCheckedChange={setRandomizeSeed}
                                                className="scale-75"
                                            />
                                            <Label htmlFor="random-seed" className="text-[10px] text-muted-foreground">Random</Label>
                                        </div>
                                    </div>
                                    <Input
                                        type="number"
                                        value={seed}
                                        onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                                        disabled={randomizeSeed}
                                        className="h-8"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className="mt-2 w-full"
                            onClick={handleGenerate}
                            disabled={isGenerating || !firstFrame}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating Video...
                                </>
                            ) : (
                                <>
                                    <Film className="mr-2 h-4 w-4" />
                                    Generate Video
                                </>
                            )}
                        </Button>

                    </div>
                </ScrollArea>
            </aside>

            {/* --- Right Column: Preview --- */}
            <main className="flex-1 flex flex-col min-h-0 bg-muted/30 rounded-lg border border-dashed border-border/50 overflow-hidden relative">
                {generatedVideo ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
                        <div className="relative w-full max-w-3xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
                            <video
                                src={generatedVideo}
                                controls
                                autoPlay
                                loop
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => window.open(generatedVideo, '_blank')}>
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                            <Button variant="secondary" onClick={() => setGeneratedVideo(null)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Generate New
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2 p-8 text-center">
                        {isGenerating ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
                                    <div className="relative bg-background p-4 rounded-full border shadow-lg">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-medium text-foreground">Creating Magic...</h3>
                                    <p className="text-sm max-w-xs mx-auto">AI is generating your video content. This usually takes 30-60 seconds.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mb-2">
                                    <Video className="w-8 h-8 opacity-50" />
                                </div>
                                <h3 className="font-medium text-lg">AI Video Studio</h3>
                                <p className="text-sm max-w-sm">
                                    Configure your settings on the left and click Generate to create stunning videos from your images.
                                </p>
                            </>
                        )}
                    </div>
                )}
            </main>

        </div>
    )
}
