"use client"

import { useState, useEffect } from "react"
import {
  Brain,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  Info,
  ChevronDown,
  Download,
  Video,
  FileText,
  ImageIcon,
  Music,
  Settings2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
import type { GeneratedOutput } from "./column-input"

interface ColumnOrchestratorProps {
  content: GeneratedOutput | null
  isComposing: boolean
  composingStep: number
  onGenerateJson?: () => void
  onGenerateVideo?: () => void
  isExporting?: boolean
  exportType?: "json" | "video" | null
  enableCrossfade?: boolean
  onCrossfadeChange?: (enabled: boolean) => void
}

interface ContentSelection {
  script: boolean
  images: boolean
  cover: boolean
  audio: boolean
  subtitles: boolean
}

interface MappingStep {
  id: string
  label: string
  status: "pending" | "processing" | "done"
  detail?: string
}

interface ChecklistItem {
  id: string
  label: string
  status: "pass" | "warning" | "error" | "pending"
  explanation?: string
}

const initialMappingSteps: MappingStep[] = [
  { id: "1", label: "Parsing script segments", status: "pending" },
  { id: "2", label: "Calculating subtitle duration", status: "pending" },
  { id: "3", label: "Auto-aligning audio to keyframes", status: "pending" },
  { id: "4", label: "Mapping image transitions", status: "pending" },
  { id: "5", label: "Generating intra_v2 tags", status: "pending" },
  { id: "6", label: "Finalizing JSON structure", status: "pending" },
]

export function ColumnOrchestrator({
  content,
  isComposing,
  composingStep,
  onGenerateJson,
  onGenerateVideo,
  isExporting = false,
  exportType = null,
  enableCrossfade = true,
  onCrossfadeChange,
}: ColumnOrchestratorProps) {
  const [copied, setCopied] = useState(false)
  const [mappingSteps, setMappingSteps] = useState<MappingStep[]>(initialMappingSteps)
  const [showAnnotations, setShowAnnotations] = useState(true)
  const [jsonReady, setJsonReady] = useState(false)
  const [selection, setSelection] = useState<ContentSelection>({
    script: true,
    images: true,
    cover: true,
    audio: true,
    subtitles: true,
  })

  const toggleSelection = (key: keyof ContentSelection) => {
    setSelection((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const selectedCount = Object.values(selection).filter(Boolean).length
  const totalCountSelection = Object.keys(selection).length

  const checklist: ChecklistItem[] = [
    {
      id: "script",
      label: "Script ready",
      status: content?.scenes && content.scenes.length > 0 ? "pass" : "pending",
      explanation: "All scene scripts have been generated and validated",
    },
    {
      id: "images",
      label: "Images baked",
      status: content?.scenes?.every((s) => s.imageUrl) ? "pass" : "pending",
      explanation: "All scene images have been generated or uploaded",
    },
    {
      id: "json",
      label: "JSON syntax valid",
      status: jsonReady ? "pass" : "pending",
      explanation: "JSON structure passes CapCut schema validation",
    },
    {
      id: "media",
      label: "Media paths linked",
      status: jsonReady ? "pass" : "pending",
      explanation: "All media assets are correctly referenced in the JSON",
    },
  ]

  useEffect(() => {
    if (isComposing) {
      const newSteps = mappingSteps.map((step, index) => {
        if (index < composingStep) return { ...step, status: "done" as const }
        if (index === composingStep) return { ...step, status: "processing" as const }
        return { ...step, status: "pending" as const }
      })
      setMappingSteps(newSteps)
      if (composingStep >= mappingSteps.length) {
        setJsonReady(true)
      }
    }
  }, [isComposing, composingStep])

  const generateCapCutJson = () => {
    if (!content) return {}

    return {
      version: "5.0.0",
      /* intra_v2: Used by CapCut for internal track references */
      intra_v2: {
        enabled: true,
        track_refs: content.scenes.map((s) => s.id),
      },
      project: {
        id: `proj_${Date.now()}`,
        name: "AI Generated Video",
        /* Resolution: 1080x1920 for vertical (9:16) format */
        resolution: { width: 1080, height: 1920 },
        /* Frame rate: 30fps is optimal for social media */
        frame_rate: 30,
        /* Duration in milliseconds */
        duration: content.scenes.length * 7500,
      },
      tracks: [
        {
          id: "track_video",
          type: "video",
          /* segments: Each scene maps to a video segment */
          segments: content.scenes.map((scene, i) => ({
            id: scene.id,
            /* source: References the image asset */
            source: `scene_${i + 1}.jpg`,
            /* Timing in milliseconds */
            start_time: i * 7500,
            end_time: (i + 1) * 7500,
            /* effects: transition_type uses intra_v2 refs */
            effects: {
              transition_in: i === 0 ? "fade" : "slide",
              transition_out: "slide",
              /* zoom: Ken Burns effect value */
              zoom: 1.1,
            },
          })),
        },
        {
          id: "track_text",
          type: "text",
          /* Text overlays synced to video segments */
          segments: content.scenes.map((scene, i) => ({
            id: `text_${scene.id}`,
            /* content: First line of scene script */
            content: scene.script.split("\n")[0],
            start_time: i * 7500 + 500,
            end_time: (i + 1) * 7500 - 500,
            style: {
              font: "Montserrat",
              size: 42,
              color: "#FFFFFF",
              /* position: y=bottom for subtitles */
              position: { x: "center", y: "bottom" },
              /* animation: fade_up is CapCut default */
              animation: "fade_up",
            },
          })),
        },
        {
          id: "track_audio",
          type: "audio",
          segments: [
            {
              id: "audio_bg",
              source: "background_music.mp3",
              start_time: 0,
              end_time: content.scenes.length * 7500,
              /* volume: 0.5 allows voiceover priority */
              volume: 0.5,
              fade_in: 1000,
              fade_out: 2000,
            },
          ],
        },
      ],
      /* materials: Asset manifest for CapCut import */
      materials: {
        images: content.scenes.map((scene, i) => ({
          id: `img_${i + 1}`,
          name: `scene_${i + 1}.jpg`,
          path: scene.imageUrl,
        })),
        audio: [
          { id: "aud_1", name: "background_music.mp3", path: "/assets/audio/bg.mp3" },
        ],
      },
    }
  }

  const jsonData = generateCapCutJson()

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatJsonWithAnnotations = (json: ReturnType<typeof generateCapCutJson>) => {
    const jsonStr = JSON.stringify(json, null, 2)
    if (!showAnnotations) return jsonStr

    // Add inline annotations
    return jsonStr
      .replace(/"intra_v2"/, '/* CapCut internal references */ "intra_v2"')
      .replace(/"resolution"/, '/* Output dimensions */ "resolution"')
      .replace(/"frame_rate"/, '/* FPS setting */ "frame_rate"')
      .replace(/"transition_in"/, '/* Entry animation */ "transition_in"')
      .replace(/"zoom"/, '/* Ken Burns scale */ "zoom"')
  }

  const passCount = checklist.filter((i) => i.status === "pass").length
  const totalCountChecklist = checklist.length

  const totalCount = totalCountSelection; // Declare totalCount variable

  return (
    <div className="flex lg:h-full flex-col gap-4">
      {/* AI Layout Engine */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-primary" />
            AI Layout Engine
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Step 4
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Content Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Settings2 className="h-3.5 w-3.5 text-primary" />
                Select Content to Include
              </Label>
              <Badge variant="outline" className="text-[10px]">
                {selectedCount}/{totalCount}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div
                onClick={() => toggleSelection("script")}
                className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors ${selection.script ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
                  }`}
              >
                <Checkbox checked={selection.script} onCheckedChange={() => toggleSelection("script")} />
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">Script</span>
              </div>

              <div
                onClick={() => toggleSelection("images")}
                className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors ${selection.images ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
                  }`}
              >
                <Checkbox checked={selection.images} onCheckedChange={() => toggleSelection("images")} />
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">Images</span>
              </div>

              <div
                onClick={() => toggleSelection("cover")}
                className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors ${selection.cover ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
                  }`}
              >
                <Checkbox checked={selection.cover} onCheckedChange={() => toggleSelection("cover")} />
                <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">Cover</span>
              </div>

              <div
                onClick={() => toggleSelection("audio")}
                className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors ${selection.audio ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
                  }`}
              >
                <Checkbox checked={selection.audio} onCheckedChange={() => toggleSelection("audio")} />
                <Music className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">Audio</span>
              </div>

              <div
                onClick={() => toggleSelection("subtitles")}
                className={`col-span-2 flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors ${selection.subtitles ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
                  }`}
              >
                <Checkbox checked={selection.subtitles} onCheckedChange={() => toggleSelection("subtitles")} />
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">Subtitles / Text Overlays</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Mapping Steps */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Processing Status</Label>
            {mappingSteps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                {step.status === "done" ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : step.status === "processing" ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-border" />
                )}
                <span
                  className={`text-xs ${step.status === "done"
                    ? "text-foreground"
                    : step.status === "processing"
                      ? "text-primary"
                      : "text-muted-foreground"
                    }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
            {isComposing && (
              <Progress value={(composingStep / mappingSteps.length) * 100} className="h-1.5" />
            )}
          </div>

          <Separator />

          {/* Generate Actions */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Generate Output</Label>

            {/* Crossfade Toggle */}
            <div
              onClick={() => onCrossfadeChange?.(!enableCrossfade)}
              className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-colors ${enableCrossfade ? "border-primary bg-primary/10" : "border-border bg-secondary/50"
                }`}
            >
              <Checkbox
                checked={enableCrossfade}
                onCheckedChange={(checked) => onCrossfadeChange?.(!!checked)}
              />
              <Video className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs">Crossfade 转场</span>
              <span className="text-[10px] text-muted-foreground ml-auto">0.5s 淡入淡出</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
            size="sm"
            onClick={onGenerateJson}
            disabled={!content || isExporting || selectedCount === 0}
            className="bg-transparent"
              >
            {isExporting && exportType === "json" ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            <span className="text-xs">Export JSON</span>
          </Button>

          <Button
            size="sm"
            onClick={onGenerateVideo}
            disabled={!content || isExporting || selectedCount === 0}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isExporting && exportType === "video" ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Video className="mr-1.5 h-3.5 w-3.5" />
            )}
            <span className="text-xs">Render Video</span>
          </Button>
        </div>
        {selectedCount === 0 && (
          <p className="text-[10px] text-destructive">Please select at least one content type</p>
        )}
    </div>
        </CardContent >
      </Card >

    {/* JSON Debugger */ }
    < Card className = "flex flex-1 flex-col border-border bg-card" >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <div className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-primary" />
              JSON Inspector
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowAnnotations(!showAnnotations)}
                    >
                      <Info className={`h-3.5 w-3.5 ${showAnnotations ? "text-primary" : "text-muted-foreground"}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{showAnnotations ? "Hide" : "Show"} annotations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={copyJson}>
                {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
                <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <pre className="p-4 text-[10px] leading-relaxed text-foreground/80">
              {content ? formatJsonWithAnnotations(jsonData) : "// No content to preview"}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card >

    {/* Pre-export Checklist */ }
    < Card className = "border-border bg-card" >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span>Pre-export Checklist</span>
            <Badge
              variant={passCount === totalCountChecklist ? "default" : "secondary"}
              className="text-[10px]"
            >
              {passCount}/{totalCountChecklist} Ready
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {checklist.map((item) => (
            <Collapsible key={item.id}>
              <CollapsibleTrigger asChild>
                <div className="flex cursor-pointer items-center justify-between rounded-md bg-secondary/50 px-3 py-2 transition-colors hover:bg-secondary">
                  <div className="flex items-center gap-2">
                    {item.status === "pass" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : item.status === "warning" ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    ) : item.status === "error" ? (
                      <XCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className="text-xs text-foreground">{item.label}</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 rounded-md bg-secondary/30 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground">{item.explanation}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card >
    </div >
  )
}
