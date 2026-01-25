"use client"

import React from "react"

import { useState, useCallback } from "react"
import { Upload, Film, X, FileVideo } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface UploadedFile {
  id: string
  name: string
  size: string
  progress: number
  status: "uploading" | "complete" | "error"
}

export function FileUploader() {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const simulateUpload = (file: File) => {
    const newFile: UploadedFile = {
      id: Math.random().toString(36).substring(7),
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      progress: 0,
      status: "uploading",
    }

    setFiles((prev) => [...prev, newFile])

    const interval = setInterval(() => {
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id === newFile.id && f.progress < 100) {
            const newProgress = Math.min(f.progress + Math.random() * 20, 100)
            return {
              ...f,
              progress: newProgress,
              status: newProgress >= 100 ? "complete" : "uploading",
            }
          }
          return f
        })
      )
    }, 300)

    setTimeout(() => clearInterval(interval), 3000)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    droppedFiles.forEach(simulateUpload)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(simulateUpload)
    }
  }

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Film className="h-4 w-4 text-primary" />
          Media Files
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
            isDragging
              ? "border-primary bg-primary/10"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <Upload className={`mb-2 h-8 w-8 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          <p className="text-sm font-medium text-foreground">Drop files here or click to upload</p>
          <p className="mt-1 text-xs text-muted-foreground">MP4, MOV, AVI up to 2GB</p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-md bg-secondary p-2"
              >
                <FileVideo className="h-8 w-8 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={file.progress} className="h-1 flex-1" />
                    <span className="text-xs text-muted-foreground">{file.size}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
