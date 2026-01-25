"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import {
  Play,
  Pause,
  Video,
  ImageIcon,
  Music,
  Type,
  Download,
  Loader2,
  Settings2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { GeneratedOutput } from "./column-input"

interface SmartTimelineProps {
  content: GeneratedOutput | null
  onExportJson: () => void
  onRenderVideo: () => void
  isExporting: boolean
  exportType: "json" | "video" | null
}

export function SmartTimeline({
  content,
  onExportJson,
  onRenderVideo,
  isExporting,
  exportType,
}: SmartTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [canvasRatio, setCanvasRatio] = useState<"9:16" | "16:9">("9:16")
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const totalDuration = content ? content.scenes.length * 7.5 : 30
  const sceneColors = ["bg-primary", "bg-chart-2", "bg-chart-3", "bg-chart-4", "bg-chart-5"]

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 0.1
        })
      }, 100)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, totalDuration])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    setCurrentTime(percentage * totalDuration)
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Timeline Tracks */}
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-transparent"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {formatTime(currentTime)} / {formatTime(totalDuration)}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                    <Settings2 className="h-3.5 w-3.5" />
                    {canvasRatio}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setCanvasRatio("9:16")}>
                    9:16 (Portrait)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCanvasRatio("16:9")}>
                    16:9 (Landscape)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Timeline Visualization */}
            <div
              className="relative cursor-pointer space-y-1 rounded-lg bg-secondary p-2"
              onClick={handleTimelineClick}
            >
              {/* Playhead */}
              <div
                className="absolute bottom-0 top-0 z-10 w-0.5 bg-foreground"
                style={{ left: `calc(${(currentTime / totalDuration) * 100}% + 8px)` }}
              >
                <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-foreground" />
              </div>

              {/* Video Track */}
              <div className="relative h-6 rounded bg-muted/50">
                <div className="absolute left-1 top-0.5 flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                  <Video className="h-3 w-3" />
                  VIDEO
                </div>
                {content?.scenes.map((scene, i) => (
                  <div
                    key={scene.id}
                    className={`absolute top-2.5 h-3 rounded ${sceneColors[i % sceneColors.length]}`}
                    style={{
                      left: `${(i / content.scenes.length) * 100}%`,
                      width: `${100 / content.scenes.length}%`,
                    }}
                  />
                ))}
              </div>

              {/* Cover/Image Track */}
              <div className="relative h-5 rounded bg-muted/50">
                <div className="absolute left-1 top-0.5 flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                  <ImageIcon className="h-3 w-3" />
                  COVER
                </div>
                {content?.coverUrl && (
                  <div
                    className="absolute top-2 h-2.5 rounded bg-chart-4"
                    style={{ left: "0%", width: "15%" }}
                  />
                )}
              </div>

              {/* Audio Track */}
              <div className="relative h-5 rounded bg-muted/50">
                <div className="absolute left-1 top-0.5 flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                  <Music className="h-3 w-3" />
                  AUDIO
                </div>
                <div
                  className="absolute top-2 h-2.5 rounded bg-chart-5"
                  style={{ left: "0%", width: "100%" }}
                />
              </div>

              {/* Subtitle Track */}
              <div className="relative h-5 rounded bg-muted/50">
                <div className="absolute left-1 top-0.5 flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
                  <Type className="h-3 w-3" />
                  TEXT
                </div>
                {content?.scenes.map((scene, i) => (
                  <div
                    key={`text-${scene.id}`}
                    className="absolute top-2 h-2.5 rounded bg-primary/60"
                    style={{
                      left: `${(i / content.scenes.length) * 100 + 2}%`,
                      width: `${100 / content.scenes.length - 4}%`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 lg:ml-4 lg:flex-col">
            <Button
              onClick={onRenderVideo}
              disabled={isExporting || !content}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 lg:w-full"
            >
              {isExporting && exportType === "video" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rendering...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-4 w-4" />
                  Direct Render
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onExportJson}
              disabled={isExporting || !content}
              className="flex-1 lg:w-full bg-transparent"
            >
              {isExporting && exportType === "json" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export Draft
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
