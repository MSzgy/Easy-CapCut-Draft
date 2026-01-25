"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"
import { Play, Pause, SkipBack, SkipForward, Volume2, Maximize2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

interface TimelineClip {
  id: string
  name: string
  start: number
  duration: number
  color: string
  type: "video" | "audio" | "text"
}

const sampleClips: TimelineClip[] = [
  { id: "1", name: "Intro.mp4", start: 0, duration: 15, color: "bg-primary", type: "video" },
  { id: "2", name: "Main Content", start: 15, duration: 45, color: "bg-chart-2", type: "video" },
  { id: "3", name: "B-Roll", start: 60, duration: 20, color: "bg-chart-3", type: "video" },
  { id: "4", name: "Outro.mp4", start: 80, duration: 10, color: "bg-chart-4", type: "video" },
  { id: "5", name: "Background Music", start: 0, duration: 90, color: "bg-chart-5", type: "audio" },
  { id: "6", name: "Title Text", start: 5, duration: 8, color: "bg-primary/60", type: "text" },
]

const totalDuration = 90

export function TimelinePreview() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState([75])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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
  }, [isPlaying])

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

  const videoClips = sampleClips.filter((c) => c.type === "video")
  const audioClips = sampleClips.filter((c) => c.type === "audio")
  const textClips = sampleClips.filter((c) => c.type === "text")

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-foreground">
          <span>Timeline Preview</span>
          <span className="text-xs text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Preview Area */}
        <div className="relative aspect-video overflow-hidden rounded-lg bg-secondary">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-4xl font-bold text-foreground">{formatTime(currentTime)}</div>
              <p className="text-sm text-muted-foreground">Preview Window</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 bg-background/50 text-foreground backdrop-blur-sm"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}
          >
            <SkipBack className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-10 w-10 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setCurrentTime(Math.min(totalDuration, currentTime + 5))}
          >
            <SkipForward className="h-4 w-4" />
          </Button>
          <div className="ml-4 flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={volume}
              onValueChange={setVolume}
              max={100}
              step={1}
              className="w-20"
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {/* Time markers */}
          <div className="flex justify-between text-[10px] text-muted-foreground px-1">
            {[0, 30, 60, 90].map((t) => (
              <span key={t}>{formatTime(t)}</span>
            ))}
          </div>

          {/* Timeline tracks */}
          <div
            className="relative cursor-pointer space-y-1 rounded-lg bg-secondary p-2"
            onClick={handleTimelineClick}
          >
            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 z-10 w-0.5 bg-foreground"
              style={{ left: `calc(${(currentTime / totalDuration) * 100}% + 8px)` }}
            >
              <div className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-foreground" />
            </div>

            {/* Video Track */}
            <div className="relative h-8 rounded bg-muted">
              <span className="absolute left-1 top-0.5 text-[9px] font-medium text-muted-foreground">VIDEO</span>
              {videoClips.map((clip) => (
                <div
                  key={clip.id}
                  className={`absolute top-3 h-4 rounded ${clip.color} flex items-center px-1`}
                  style={{
                    left: `${(clip.start / totalDuration) * 100}%`,
                    width: `${(clip.duration / totalDuration) * 100}%`,
                  }}
                >
                  <span className="truncate text-[9px] font-medium text-primary-foreground">{clip.name}</span>
                </div>
              ))}
            </div>

            {/* Text Track */}
            <div className="relative h-6 rounded bg-muted">
              <span className="absolute left-1 top-0.5 text-[9px] font-medium text-muted-foreground">TEXT</span>
              {textClips.map((clip) => (
                <div
                  key={clip.id}
                  className={`absolute top-2.5 h-3 rounded ${clip.color} flex items-center px-1`}
                  style={{
                    left: `${(clip.start / totalDuration) * 100}%`,
                    width: `${(clip.duration / totalDuration) * 100}%`,
                  }}
                >
                  <span className="truncate text-[8px] font-medium text-primary-foreground">{clip.name}</span>
                </div>
              ))}
            </div>

            {/* Audio Track */}
            <div className="relative h-6 rounded bg-muted">
              <span className="absolute left-1 top-0.5 text-[9px] font-medium text-muted-foreground">AUDIO</span>
              {audioClips.map((clip) => (
                <div
                  key={clip.id}
                  className={`absolute top-2.5 h-3 rounded ${clip.color} flex items-center px-1`}
                  style={{
                    left: `${(clip.start / totalDuration) * 100}%`,
                    width: `${(clip.duration / totalDuration) * 100}%`,
                  }}
                >
                  <span className="truncate text-[8px] font-medium text-primary-foreground">{clip.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
