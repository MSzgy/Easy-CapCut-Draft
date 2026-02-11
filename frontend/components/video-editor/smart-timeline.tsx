"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
  Play,
  Pause,
  Video,
  Download,
  Loader2,
  SkipForward,
  SkipBack,
  Film,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { GeneratedOutput } from "./column-input"

interface SmartTimelineProps {
  content: GeneratedOutput | null
  onExportJson: () => void
  onRenderVideo: () => void
  isExporting: boolean
  exportType: "json" | "video" | null
  generatedVideos: string[]
  renderProgress: { current: number; total: number } | null
}

export function SmartTimeline({
  content,
  onExportJson,
  onRenderVideo,
  isExporting,
  exportType,
  generatedVideos,
  renderProgress,
}: SmartTimelineProps) {
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [clipDuration, setClipDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Filter out empty/failed video URLs
  const validVideos = generatedVideos.filter((url) => url && url.length > 0)
  const hasVideos = validVideos.length > 0
  const isRendering = renderProgress !== null

  // Sync play state with video element
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setClipDuration(video.duration || 0)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      // Auto-advance to next clip
      if (currentClipIndex < validVideos.length - 1) {
        setCurrentClipIndex((prev) => prev + 1)
      } else {
        setIsPlaying(false)
        setCurrentClipIndex(0) // Loop back to start
      }
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("durationchange", handleDurationChange)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("ended", handleEnded)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("durationchange", handleDurationChange)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("ended", handleEnded)
    }
  }, [currentClipIndex, validVideos.length])

  // Auto-play when clip changes
  useEffect(() => {
    const video = videoRef.current
    if (video && hasVideos && isPlaying) {
      video.play().catch(() => { })
    }
  }, [currentClipIndex, hasVideos, isPlaying])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play().catch(() => { })
    } else {
      video.pause()
    }
  }, [])

  const goToClip = useCallback((index: number) => {
    setCurrentClipIndex(index)
    setCurrentTime(0)
  }, [])

  const prevClip = useCallback(() => {
    if (currentClipIndex > 0) {
      setCurrentClipIndex((prev) => prev - 1)
      setCurrentTime(0)
    }
  }, [currentClipIndex])

  const nextClip = useCallback(() => {
    if (currentClipIndex < validVideos.length - 1) {
      setCurrentClipIndex((prev) => prev + 1)
      setCurrentTime(0)
    }
  }, [currentClipIndex, validVideos.length])

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Calculate total video duration
  const totalDuration = validVideos.length * 5 // Each clip is ~5s

  // ── Rendering in progress ──
  if (isRendering) {
    const progressPercent = renderProgress
      ? (renderProgress.current / renderProgress.total) * 100
      : 0

    return (
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            {/* Progress Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                  <div className="relative rounded-full bg-primary/10 p-1.5">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    Generating Scene {renderProgress?.current || 0} of {renderProgress?.total || 0}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Each scene takes ~30-60 seconds • Adjacent frames used for smooth transitions
                  </p>
                </div>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {generatedVideos.map((url, i) => (
                  <div key={i} className="flex items-center gap-0.5">
                    {url ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : i < (renderProgress?.current || 0) ? (
                      <XCircle className="h-3 w-3 text-red-400" />
                    ) : (
                      <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                    )}
                    <span className="text-[10px]">S{i + 1}</span>
                  </div>
                ))}
                {/* Show remaining unstarted scenes */}
                {Array.from({ length: (renderProgress?.total || 0) - generatedVideos.length }).map((_, i) => (
                  <div key={`pending-${i}`} className="flex items-center gap-0.5">
                    <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />
                    <span className="text-[10px]">S{generatedVideos.length + i + 1}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons (disabled during render) */}
            <div className="flex items-center gap-2 sm:flex-col">
              <Button disabled className="flex-1 sm:w-full opacity-50">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rendering...
              </Button>
              <Button
                variant="outline"
                onClick={onExportJson}
                disabled={!content}
                className="flex-1 sm:w-full bg-transparent"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Draft
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Videos generated — show player ──
  if (hasVideos) {
    const currentVideoSrc = validVideos[currentClipIndex] || ""

    return (
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Video Player */}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {/* Mini Player */}
                <div className="relative h-28 w-48 shrink-0 overflow-hidden rounded-lg bg-black shadow-lg">
                  <video
                    ref={videoRef}
                    src={currentVideoSrc}
                    className="h-full w-full object-contain"
                    playsInline
                    onError={(e) => console.error("Video playback error", e)}
                  />
                  {/* Play overlay on hover */}
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/30 group"
                  >
                    {!isPlaying && (
                      <Play className="h-8 w-8 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                    )}
                  </button>
                </div>

                {/* Controls & Info */}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={prevClip} disabled={currentClipIndex === 0}>
                      <SkipBack className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={togglePlay}>
                      {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={nextClip} disabled={currentClipIndex === validVideos.length - 1}>
                      <SkipForward className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(currentTime)} / {formatTime(clipDuration)}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      Scene {currentClipIndex + 1} / {validVideos.length}
                    </Badge>
                  </div>

                  {/* Scene filmstrip */}
                  <div className="flex gap-1 overflow-x-auto pb-1">
                    {generatedVideos.map((url, index) => {
                      const isActive = index === currentClipIndex
                      const isFailed = !url || url.length === 0
                      return (
                        <button
                          key={index}
                          onClick={() => !isFailed && goToClip(index)}
                          disabled={isFailed}
                          className={`relative flex h-10 w-16 shrink-0 items-center justify-center rounded border-2 transition-all text-[10px] font-medium ${isFailed
                              ? "border-red-500/30 bg-red-500/10 cursor-not-allowed text-red-400"
                              : isActive
                                ? "border-primary bg-primary/10 text-primary shadow-sm"
                                : "border-border bg-secondary/50 hover:border-primary/50 text-muted-foreground"
                            }`}
                        >
                          {isFailed ? (
                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                          ) : (
                            <>
                              <Film className="mr-0.5 h-3 w-3" />
                              S{index + 1}
                            </>
                          )}
                          {isActive && !isFailed && (
                            <div className="absolute -bottom-0.5 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-primary" />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {/* Total info */}
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Video className="h-3 w-3" />
                    Total: {validVideos.length} clips • ~{totalDuration}s
                    {generatedVideos.some((url) => !url) && (
                      <span className="flex items-center gap-0.5 text-amber-500">
                        <AlertCircle className="h-3 w-3" />
                        {generatedVideos.filter((url) => !url).length} failed
                      </span>
                    )}
                  </div>
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
                <Video className="mr-2 h-4 w-4" />
                Re-render
              </Button>
              <Button
                variant="outline"
                onClick={onExportJson}
                disabled={isExporting || !content}
                className="flex-1 bg-transparent lg:w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Draft
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ── Default state — no videos yet ──
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Placeholder */}
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="rounded-full bg-secondary p-2.5">
              <Video className="h-5 w-5 opacity-50" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Video Preview</p>
              <p className="text-xs">
                {content
                  ? `${content.scenes.length} scenes ready • Click Direct Render to generate videos`
                  : "Generate content first, then render scene videos"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:flex-col">
            <Button
              onClick={onRenderVideo}
              disabled={isExporting || !content}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-full"
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
              className="flex-1 bg-transparent sm:w-full"
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
