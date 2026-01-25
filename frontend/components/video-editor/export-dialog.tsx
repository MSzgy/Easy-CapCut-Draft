"use client"

import { useState } from "react"
import {
  ExternalLink,
  Loader2,
  FileJson,
  Video,
  CheckCircle2,
  AlertTriangle,
  Info,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface ValidationItem {
  id: string
  field: string
  status: "pass" | "warning" | "error"
  message: string
  explanation: string
}

// Sample CapCut JSON structure
const sampleCapCutJson = {
  version: "5.0.0",
  project: {
    id: "proj_" + Math.random().toString(36).substr(2, 9),
    name: "AI Generated Video",
    created_at: new Date().toISOString(),
    resolution: { width: 1920, height: 1080 },
    frame_rate: 30,
    duration: 30000,
  },
  tracks: [
    {
      id: "track_video",
      type: "video",
      segments: [
        {
          id: "seg_1",
          source: "hero-section.jpg",
          start_time: 0,
          end_time: 3000,
          effects: { transition_in: "fade", transition_out: "slide" },
        },
        {
          id: "seg_2",
          source: "features.jpg",
          start_time: 3000,
          end_time: 10000,
          effects: { zoom: 1.2, pan: "left-to-right" },
        },
        {
          id: "seg_3",
          source: "cta-section.jpg",
          start_time: 10000,
          end_time: 25000,
          effects: { transition_in: "slide" },
        },
      ],
    },
    {
      id: "track_text",
      type: "text",
      segments: [
        {
          id: "text_1",
          content: "Discover the future of productivity...",
          start_time: 0,
          end_time: 3000,
          style: {
            font: "Montserrat",
            size: 48,
            color: "#FFFFFF",
            position: { x: "center", y: "bottom" },
            animation: "fade_up",
          },
        },
        {
          id: "text_2",
          content: "This platform is changing the game",
          start_time: 3000,
          end_time: 10000,
          style: {
            font: "Montserrat",
            size: 36,
            color: "#FFFFFF",
            position: { x: "center", y: "center" },
            animation: "typewriter",
          },
        },
        {
          id: "text_3",
          content: "Ready to get started?",
          start_time: 25000,
          end_time: 30000,
          style: {
            font: "Montserrat Bold",
            size: 52,
            color: "#00FF88",
            position: { x: "center", y: "center" },
            animation: "bounce",
          },
        },
      ],
    },
    {
      id: "track_audio",
      type: "audio",
      segments: [
        {
          id: "audio_1",
          source: "background_music.mp3",
          start_time: 0,
          end_time: 30000,
          volume: 0.6,
          fade_in: 1000,
          fade_out: 2000,
        },
      ],
    },
  ],
  materials: {
    images: [
      { id: "img_1", name: "hero-section.jpg", path: "/assets/hero-section.jpg" },
      { id: "img_2", name: "features.jpg", path: "/assets/features.jpg" },
      { id: "img_3", name: "cta-section.jpg", path: "/assets/cta-section.jpg" },
    ],
    audio: [
      { id: "aud_1", name: "background_music.mp3", path: "/assets/background_music.mp3" },
    ],
  },
}

const validationItems: ValidationItem[] = [
  {
    id: "1",
    field: "project.resolution",
    status: "pass",
    message: "Resolution: 1920x1080",
    explanation: "Video resolution is set to Full HD (1080p), which is compatible with most platforms including TikTok, YouTube, and Instagram.",
  },
  {
    id: "2",
    field: "project.frame_rate",
    status: "pass",
    message: "Frame rate: 30fps",
    explanation: "Standard frame rate for smooth playback. CapCut supports 24fps, 30fps, and 60fps.",
  },
  {
    id: "3",
    field: "tracks.video.segments",
    status: "pass",
    message: "Video segments: 3 clips",
    explanation: "All video segments have valid source files and timing. Transitions are properly configured between clips.",
  },
  {
    id: "4",
    field: "tracks.text.segments",
    status: "pass",
    message: "Text overlays: 3 items",
    explanation: "Text segments have valid fonts, colors, and animations. All timing aligns with video segments.",
  },
  {
    id: "5",
    field: "tracks.audio",
    status: "warning",
    message: "Audio: Using placeholder",
    explanation: "Background music is set to a placeholder file. Consider adding your own licensed audio track for the final export.",
  },
  {
    id: "6",
    field: "materials.images",
    status: "pass",
    message: "Images: 3 files linked",
    explanation: "All image assets are properly linked and paths are valid. Images will be embedded during CapCut import.",
  },
  {
    id: "7",
    field: "project.duration",
    status: "pass",
    message: "Duration: 30 seconds",
    explanation: "Total video duration is 30 seconds. Ideal for social media short-form content.",
  },
]

export function ExportDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<"json" | "video" | null>(null)
  const [copied, setCopied] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const handleExport = (type: "json" | "video") => {
    setExportType(type)
    setIsExporting(true)
    setTimeout(() => {
      setIsExporting(false)
      if (type === "json") {
        const blob = new Blob([JSON.stringify(sampleCapCutJson, null, 2)], {
          type: "application/json",
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "capcut-project.json"
        a.click()
        URL.revokeObjectURL(url)
      }
    }, 2000)
  }

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(sampleCapCutJson, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const passCount = validationItems.filter((i) => i.status === "pass").length
  const warningCount = validationItems.filter((i) => i.status === "warning").length
  const errorCount = validationItems.filter((i) => i.status === "error").length

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          <ExternalLink className="mr-2 h-4 w-4" />
          Export to CapCut
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-5 w-5 text-primary" />
            Export to CapCut
          </DialogTitle>
          <DialogDescription>
            Review the configuration and export your project as a CapCut-compatible JSON file or generate a video directly.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="validation" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="validation" className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Configuration Check
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              JSON Preview
            </TabsTrigger>
          </TabsList>

          <TabsContent value="validation" className="mt-4">
            {/* Summary */}
            <div className="mb-4 flex items-center gap-4 rounded-lg bg-secondary/50 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-foreground">{passCount} Passed</span>
              </div>
              {warningCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm text-foreground">{warningCount} Warning</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-foreground">{errorCount} Error</span>
                </div>
              )}
            </div>

            {/* Validation Items */}
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {validationItems.map((item) => (
                  <Collapsible
                    key={item.id}
                    open={expandedItems.includes(item.id)}
                    onOpenChange={() => toggleExpanded(item.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <div
                        className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors hover:bg-secondary/50 ${
                          item.status === "pass"
                            ? "border-green-500/30 bg-green-500/5"
                            : item.status === "warning"
                              ? "border-yellow-500/30 bg-yellow-500/5"
                              : "border-red-500/30 bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.status === "pass" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : item.status === "warning" ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">{item.message}</p>
                            <p className="text-xs text-muted-foreground">{item.field}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="left" className="max-w-xs">
                                <p className="text-xs">{item.explanation}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {expandedItems.includes(item.id) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1 rounded-lg bg-secondary/30 p-3">
                        <p className="text-xs leading-relaxed text-muted-foreground">{item.explanation}</p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="preview" className="mt-4">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 z-10"
                onClick={copyJson}
              >
                {copied ? (
                  <Check className="mr-1 h-3 w-3" />
                ) : (
                  <Copy className="mr-1 h-3 w-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
              <ScrollArea className="h-[340px] rounded-lg border border-border bg-secondary/30">
                <pre className="p-4 text-xs leading-relaxed text-foreground">
                  {JSON.stringify(sampleCapCutJson, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        {/* Export Actions */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Select an export option below
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExport("json")}
              disabled={isExporting}
            >
              {isExporting && exportType === "json" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download JSON
            </Button>
            <Button
              onClick={() => handleExport("video")}
              disabled={isExporting}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isExporting && exportType === "video" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Generate Video
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Export Tips */}
        <div className="rounded-lg bg-primary/10 p-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> Import the JSON file into CapCut by going to{" "}
            <span className="font-mono text-primary">File &gt; Import Project</span> and selecting the downloaded file.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
