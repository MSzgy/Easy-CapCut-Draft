"use client"

import React from "react"

import { useState, useRef, useCallback } from "react"
import {
  Type,
  Globe,
  Wand2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ImageIcon,
  Palette,
  Upload,
  X,
  FileVideo,
  FileAudio,
  FileImage,
  FolderOpen,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { aiContentApi } from "@/lib/api/ai-content"
import { useToast } from "@/hooks/use-toast"

interface UploadedAsset {
  id: string
  name: string
  type: "video" | "image" | "audio"
  size: string
  url: string
  progress: number
  content?: string // Base64 content
}

export interface SceneContent {
  id: string
  timestamp: string
  script: string
  imageUrl: string
  imageDescription: string
}

export interface GeneratedOutput {
  scenes: SceneContent[]
  coverUrl?: string
}

interface ColumnInputProps {
  onGenerate: (output: GeneratedOutput) => void
}

const crawlerSteps = [
  { id: 1, text: "Connecting to website...", done: false },
  { id: 2, text: "Extracting page content...", done: false },
  { id: 3, text: "Analyzing text and images...", done: false },
  { id: 4, text: "Generating video script...", done: false },
  { id: 5, text: "Creating scene visuals...", done: false },
]

const coverStyles = [
  { id: "3d", name: "3D Style", icon: "cube" },
  { id: "minimal", name: "Minimalist", icon: "minus" },
  { id: "cinematic", name: "Cinematic", icon: "film" },
  { id: "gradient", name: "Gradient", icon: "palette" },
]

export function ColumnInput({ onGenerate }: ColumnInputProps) {
  const [activeTab, setActiveTab] = useState("upload")
  const [prompt, setPrompt] = useState("")
  const [url, setUrl] = useState("")
  const [urlError, setUrlError] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [crawlerProgress, setCrawlerProgress] = useState<typeof crawlerSteps>([])
  const [crawlerSummary, setCrawlerSummary] = useState<string[]>([])
  const [scriptType, setScriptType] = useState("promo")
  const [coverStyle, setCoverStyle] = useState("3d")
  const [isGeneratingCover, setIsGeneratingCover] = useState(false)
  const [generatedCover, setGeneratedCover] = useState<string | null>(null)
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const getFileType = (file: File): "video" | "image" | "audio" => {
    if (file.type.startsWith("video/")) return "video"
    if (file.type.startsWith("audio/")) return "audio"
    return "image"
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => {
        const result = reader.result as string
        // Remove the prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(",")[1]
        resolve(base64)
      }
      reader.onerror = (error) => reject(error)
    })
  }

  const handleFiles = useCallback((files: FileList) => {
    const newAssets: UploadedAsset[] = Array.from(files).map((file) => ({
      id: `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: getFileType(file),
      size: formatFileSize(file.size),
      url: URL.createObjectURL(file),
      progress: 0,
    }))

    setUploadedAssets((prev) => [...prev, ...newAssets])

    // Load base64 for images
    Array.from(files).forEach(async (file, index) => {
      const type = getFileType(file)
      if (type === "image") {
        try {
          const base64 = await fileToBase64(file)
          setUploadedAssets((prev) =>
            prev.map((a, i) => (a.id === newAssets[index].id ? { ...a, content: base64 } : a))
          )
        } catch (error) {
          console.error("Failed to convert file to base64", error)
        }
      }
    })

    // Simulate upload progress
    newAssets.forEach((asset) => {
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 30
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
        }
        setUploadedAssets((prev) =>
          prev.map((a) => (a.id === asset.id ? { ...a, progress } : a))
        )
      }, 200)
    })
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const removeAsset = (id: string) => {
    setUploadedAssets((prev) => prev.filter((a) => a.id !== id))
  }

  const getAssetIcon = (type: "video" | "image" | "audio") => {
    switch (type) {
      case "video":
        return <FileVideo className="h-4 w-4 text-blue-500" />
      case "audio":
        return <FileAudio className="h-4 w-4 text-purple-500" />
      default:
        return <FileImage className="h-4 w-4 text-green-500" />
    }
  }

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  const simulateCrawler = async () => {
    const steps = [...crawlerSteps]
    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      steps[i].done = true
      setCrawlerProgress([...steps])

      if (i === 2) {
        setCrawlerSummary([
          "Found: Product landing page",
          "Main headline extracted",
          "3 key features identified",
          "CTA section detected",
        ])
      }
    }
  }

  const handleGenerate = async () => {
    if (activeTab === "url") {
      if (!url.trim()) {
        setUrlError("Please enter a URL")
        return
      }
      if (!isValidUrl(url)) {
        setUrlError("Please enter a valid URL")
        return
      }
    } else if (activeTab === "prompt" && !prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a prompt",
        variant: "destructive",
      })
      return
    }

    setUrlError("")
    setIsGenerating(true)
    setCrawlerProgress([])
    setCrawlerSummary([])

    try {
      if (activeTab === "url") {
        await simulateCrawler()
      }

      // 调用后端API
      const response = await aiContentApi.generateContent({
        mode: activeTab as "upload" | "prompt" | "url",
        prompt: activeTab === "prompt" ? prompt : undefined,
        videoStyle: activeTab === "prompt" ? scriptType : undefined,
        url: activeTab === "url" ? url : undefined,
        uploadedAssets: activeTab === "upload" ? uploadedAssets.map(asset => ({
          id: asset.id,
          name: asset.name,
          type: asset.type,
          size: asset.size,
          content: asset.content,
        })) : undefined,
      })

      if (response.success) {
        onGenerate({
          scenes: response.scenes,
          coverUrl: response.coverUrl || generatedCover || undefined
        })

        toast({
          title: "Success",
          description: response.message || "Content generated successfully",
        })
      }
    } catch (error) {
      console.error("Generation error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive",
      })

      // 如果API调用失败，仍然使用模拟数据
      const mockScenes: SceneContent[] = [
        {
          id: "scene_1",
          timestamp: "0:00 - 0:03",
          script: "Discover the future of productivity...\nVisual: Dynamic website showcase with animated elements",
          imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
          imageDescription: "Hero section with dynamic intro",
        },
        {
          id: "scene_2",
          timestamp: "0:03 - 0:10",
          script: "This platform is changing the game.\nText overlay: Key headline from site\nTransition: Smooth zoom in",
          imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop",
          imageDescription: "Features showcase section",
        },
        {
          id: "scene_3",
          timestamp: "0:10 - 0:25",
          script: "Here's what makes it special:\n- Feature 1 with icon animation\n- Feature 2 with demo clip\n- Feature 3 with testimonial",
          imageUrl: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop",
          imageDescription: "Detailed feature breakdown",
        },
        {
          id: "scene_4",
          timestamp: "0:25 - 0:30",
          script: "Ready to get started?\nShow: Pricing/signup button\nAdd: Urgency text overlay",
          imageUrl: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=400&h=300&fit=crop",
          imageDescription: "Call to action section",
        },
      ]

      onGenerate({ scenes: mockScenes, coverUrl: generatedCover || undefined })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateCover = async () => {
    setIsGeneratingCover(true)

    try {
      const response = await aiContentApi.generateCover({
        style: coverStyle,
        prompt: prompt || undefined,
        theme: activeTab === "url" ? url : prompt,
      })

      if (response.success) {
        setGeneratedCover(response.coverUrl)
        toast({
          title: "Success",
          description: response.message || "Cover generated successfully",
        })
      }
    } catch (error) {
      console.error("Cover generation error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate cover",
        variant: "destructive",
      })

      // 如果API调用失败，使用模拟数据
      setGeneratedCover("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=600&fit=crop")
    } finally {
      setIsGeneratingCover(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Input Tabs Card */}
      <Card className="flex-1 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Content Source
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Step 1-2
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 bg-secondary">
              <TabsTrigger value="upload" className="flex items-center gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </TabsTrigger>
              <TabsTrigger value="prompt" className="flex items-center gap-1.5 text-xs">
                <Type className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Prompt</span>
              </TabsTrigger>
              <TabsTrigger value="url" className="flex items-center gap-1.5 text-xs">
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">URL</span>
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab Content */}
            <TabsContent value="upload" className="mt-3 space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,image/*,audio/*"
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/50 hover:border-primary/50 hover:bg-secondary"
                  }`}
              >
                <div className={`rounded-full p-3 ${isDragging ? "bg-primary/20" : "bg-secondary"}`}>
                  <FolderOpen className={`h-6 w-6 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {isDragging ? "Drop files here" : "Click or drag files"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Video, Image, or Audio files
                </p>
              </div>

              {/* Uploaded Assets List */}
              {uploadedAssets.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Uploaded Assets ({uploadedAssets.length})
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                      onClick={() => setUploadedAssets([])}
                    >
                      Clear all
                    </Button>
                  </div>
                  <div className="max-h-[200px] space-y-2 overflow-auto">
                    {uploadedAssets.map((asset) => (
                      <div
                        key={asset.id}
                        className="flex items-center gap-3 rounded-md bg-secondary p-2"
                      >
                        {getAssetIcon(asset.type)}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-foreground">
                            {asset.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">{asset.size}</span>
                            {asset.progress < 100 && (
                              <Progress value={asset.progress} className="h-1 flex-1" />
                            )}
                            {asset.progress >= 100 && (
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removeAsset(asset.id)}
                        >
                          <X className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="prompt" className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">AI Prompt</Label>
                <Textarea
                  placeholder="Describe the video you want to create... e.g., 'Create a promotional video for a SaaS product that helps teams collaborate better'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[100px] resize-none bg-secondary text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Video Style</Label>
                <Select value={scriptType} onValueChange={setScriptType}>
                  <SelectTrigger className="bg-secondary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promo">Promotional</SelectItem>
                    <SelectItem value="tutorial">Tutorial</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="story">Storytelling</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="url" className="mt-3 space-y-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Website URL</Label>
                <div className="relative">
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value)
                      setUrlError("")
                    }}
                    className={`bg-secondary pr-10 ${urlError ? "border-destructive" : ""}`}
                  />
                  {url && isValidUrl(url) && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                {urlError && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {urlError}
                  </p>
                )}
              </div>

              {/* AI Crawler Status */}
              {crawlerProgress.length > 0 && (
                <div className="space-y-2 rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs font-medium text-foreground">AI Reading Website Content...</p>
                  <div className="space-y-1.5">
                    {crawlerProgress.map((step) => (
                      <div key={step.id} className="flex items-center gap-2">
                        {step.done ? (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        ) : (
                          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                        <span className={`text-xs ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  {crawlerSummary.length > 0 && (
                    <div className="mt-2 space-y-1 border-t border-border pt-2">
                      <p className="text-[10px] font-medium text-muted-foreground">Summary:</p>
                      {crawlerSummary.map((item, i) => (
                        <p key={i} className="text-xs text-foreground">
                          • {item}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {activeTab === "url" ? "Scanning & Generating..." : "Generating..."}
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Cover Designer Card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ImageIcon className="h-4 w-4 text-primary" />
            AI Cover Designer
            <Badge variant="secondary" className="ml-auto text-[10px]">
              Step 3
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Style Preset</Label>
            <div className="grid grid-cols-4 gap-2">
              {coverStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setCoverStyle(style.id)}
                  className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors ${coverStyle === style.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                    }`}
                >
                  <Palette className="h-4 w-4" />
                  <span className="text-[10px]">{style.name}</span>
                </button>
              ))}
            </div>
          </div>

          {generatedCover && (
            <div className="relative overflow-hidden rounded-lg border border-border">
              <img
                src={generatedCover || "/placeholder.svg"}
                alt="Generated cover"
                className="aspect-[9/16] w-full object-cover"
                crossOrigin="anonymous"
              />
              <Badge className="absolute right-2 top-2 bg-primary/80">9:16</Badge>
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleGenerateCover}
            disabled={isGeneratingCover}
            className="w-full bg-transparent"
          >
            {isGeneratingCover ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating Cover...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
