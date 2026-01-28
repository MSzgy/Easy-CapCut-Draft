"use client"

import { useState, useRef } from "react"
import {
  FileText,
  ImageIcon,
  RefreshCw,
  Clock,
  Pencil,
  Check,
  X,
  Sparkles,
  ArrowRight,
  Upload,
  ChevronLeft,
  ChevronRight,
  Layers,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { SceneContent, GeneratedOutput } from "./column-input"

// Sample AI-suggested images per scene
const aiSuggestedImages = [
  [
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=200&fit=crop",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=200&fit=crop",
    "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=300&h=200&fit=crop",
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=300&h=200&fit=crop",
  ],
  [
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&h=200&fit=crop",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&h=200&fit=crop",
    "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=300&h=200&fit=crop",
    "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=300&h=200&fit=crop",
  ],
  [
    "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=300&h=200&fit=crop",
    "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=300&h=200&fit=crop",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=200&fit=crop",
    "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=300&h=200&fit=crop",
  ],
]

interface ColumnContentProps {
  content: GeneratedOutput | null
  onContentUpdate: (content: GeneratedOutput) => void
  onComposeJson: () => void
  isComposing: boolean
}

export function ColumnContent({
  content,
  onContentUpdate,
  onComposeJson,
  isComposing,
}: ColumnContentProps) {

  // content = mockGeneratedOutput;
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [regeneratingScene, setRegeneratingScene] = useState<string | null>(null)
  const [regeneratingImage, setRegeneratingImage] = useState<string | null>(null)
  const [selectedImageIndex, setSelectedImageIndex] = useState<Record<string, number>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleSelectImage = (sceneId: string, imageUrl: string, index: number) => {
    if (!content) return
    setSelectedImageIndex((prev) => ({ ...prev, [sceneId]: index }))
    const updatedScenes = content.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, imageUrl } : scene
    )
    onContentUpdate({ ...content, scenes: updatedScenes })
  }

  const handleUploadCustomImage = (sceneId: string, file: File) => {
    if (!content) return
    const url = URL.createObjectURL(file)
    const updatedScenes = content.scenes.map((scene) =>
      scene.id === sceneId ? { ...scene, imageUrl: url, imageDescription: file.name } : scene
    )
    onContentUpdate({ ...content, scenes: updatedScenes })
    setSelectedImageIndex((prev) => ({ ...prev, [sceneId]: -1 })) // -1 indicates custom
  }

  const handleEditStart = (scene: SceneContent) => {
    setEditingSceneId(scene.id)
    setEditingText(scene.script)
  }

  const handleEditSave = () => {
    if (!content || !editingSceneId) return
    const updatedScenes = content.scenes.map((scene) =>
      scene.id === editingSceneId ? { ...scene, script: editingText } : scene
    )
    onContentUpdate({ ...content, scenes: updatedScenes })
    setEditingSceneId(null)
    setEditingText("")
  }

  const handleEditCancel = () => {
    setEditingSceneId(null)
    setEditingText("")
  }

  const handleRegenerateText = async (sceneId: string) => {
    setRegeneratingScene(sceneId)
    await new Promise((resolve) => setTimeout(resolve, 1200))
    if (!content) return
    const updatedScenes = content.scenes.map((scene) =>
      scene.id === sceneId
        ? {
          ...scene,
          script: scene.script + "\n[AI Enhanced: Added more engaging hooks]",
        }
        : scene
    )
    onContentUpdate({ ...content, scenes: updatedScenes })
    setRegeneratingScene(null)
  }

  const handleRegenerateImage = async (sceneId: string) => {
    setRegeneratingImage(sceneId)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    if (!content) return
    const newImages = [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&h=300&fit=crop",
      "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop",
    ]
    const updatedScenes = content.scenes.map((scene) =>
      scene.id === sceneId
        ? { ...scene, imageUrl: newImages[Math.floor(Math.random() * newImages.length)] }
        : scene
    )
    onContentUpdate({ ...content, scenes: updatedScenes })
    setRegeneratingImage(null)
  }

  if (!content) {
    return (
      <Card className="flex h-full flex-col border-border bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-primary" />
            Content Refinement
            <Badge variant="outline" className="ml-1 text-[10px]">
              The Kitchen
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            {/* 3D Style Illustration */}
            <div className="relative mx-auto mb-6 h-32 w-32">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <Layers className="h-16 w-16 text-primary/30" />
                  <Sparkles className="absolute -right-2 -top-2 h-6 w-6 animate-pulse text-primary" />
                </div>
              </div>
              <div className="absolute -bottom-1 left-1/2 h-4 w-24 -translate-x-1/2 rounded-full bg-black/10 blur-md" />
            </div>

            <h3 className="mb-2 text-lg font-semibold text-foreground">Awaiting AI Input...</h3>
            <p className="mx-auto max-w-xs text-sm text-muted-foreground">
              Generate content using the input panel on the left. Your AI-crafted scenes will appear here for refinement.
            </p>

            <div className="mt-6 flex items-center justify-center gap-2">
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: "0ms" }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: "150ms" }} />
              <div className="h-2 w-2 animate-bounce rounded-full bg-primary/50" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex h-full flex-col border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Content Refinement
            <Badge variant="outline" className="ml-1 text-[10px]">
              {content.scenes.length} Scenes
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={onComposeJson}
            disabled={isComposing}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isComposing ? (
              <>
                <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
                Composing...
              </>
            ) : (
              <>
                Compose JSON
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </>
            )}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 pb-4">
          <div className="space-y-4">
            {/* Generated Copy Section */}
            {content.copy && (
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    Social Media Copy
                  </Badge>
                </div>
                <div className="whitespace-pre-wrap rounded bg-background/50 p-2 text-xs leading-relaxed text-foreground">
                  {content.copy}
                </div>
              </div>
            )}

            {content.scenes.map((scene, index) => (
              <div
                key={scene.id}
                className="group rounded-lg border border-border bg-secondary/30 p-3 transition-colors hover:bg-secondary/50"
              >
                {/* Scene Header */}
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      Scene {index + 1}
                    </Badge>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {scene.timestamp}
                    </div>
                  </div>
                </div>

                {/* Scene Content Grid */}
                <div className="grid gap-3 lg:grid-cols-2">
                  {/* Script Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">SCRIPT</span>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {editingSceneId !== scene.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleEditStart(scene)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleRegenerateText(scene.id)}
                              disabled={regeneratingScene === scene.id}
                            >
                              <RefreshCw
                                className={`h-3 w-3 ${regeneratingScene === scene.id ? "animate-spin" : ""}`}
                              />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {editingSceneId === scene.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="min-h-[80px] resize-none bg-background text-xs"
                        />
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEditCancel}
                            className="h-7 px-2 text-xs"
                          >
                            <X className="mr-1 h-3 w-3" />
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleEditSave}
                            className="h-7 px-2 text-xs"
                          >
                            <Check className="mr-1 h-3 w-3" />
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap rounded bg-background/50 p-2 text-xs leading-relaxed text-foreground">
                        {scene.script}
                      </div>
                    )}
                  </div>

                  {/* Image Section - Multi-Image Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground">AI SUGGESTIONS</span>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => fileInputRefs.current[scene.id]?.click()}
                              >
                                <Upload className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Upload custom image</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={(el) => { fileInputRefs.current[scene.id] = el }}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleUploadCustomImage(scene.id, file)
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRegenerateImage(scene.id)}
                          disabled={regeneratingImage === scene.id}
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${regeneratingImage === scene.id ? "animate-spin" : ""}`}
                          />
                        </Button>
                      </div>
                    </div>

                    {/* Selected Image Preview */}
                    <div className="relative overflow-hidden rounded-lg border border-border">
                      {regeneratingImage === scene.id ? (
                        <div className="flex aspect-video items-center justify-center bg-secondary">
                          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <>
                          <img
                            src={scene.imageUrl || "/placeholder.svg"}
                            alt={scene.imageDescription}
                            className="aspect-video w-full object-cover"
                            crossOrigin="anonymous"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                            <div className="flex items-center gap-1.5 text-white">
                              <ImageIcon className="h-3 w-3" />
                              <span className="text-[10px]">{scene.imageDescription}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Image Carousel/Grid */}
                    <div className="grid grid-cols-4 gap-1.5">
                      {(aiSuggestedImages[index % aiSuggestedImages.length] || []).map((imgUrl, imgIndex) => {
                        const isSelected = selectedImageIndex[scene.id] === imgIndex ||
                          (selectedImageIndex[scene.id] === undefined && imgIndex === 0 && scene.imageUrl === imgUrl)
                        return (
                          <button
                            key={imgIndex}
                            onClick={() => handleSelectImage(scene.id, imgUrl, imgIndex)}
                            className={`relative aspect-video overflow-hidden rounded-md border-2 transition-all hover:opacity-100 ${isSelected
                              ? "border-primary opacity-100"
                              : "border-transparent opacity-60 hover:border-primary/50"
                              }`}
                          >
                            <img
                              src={imgUrl || "/placeholder.svg"}
                              alt={`Option ${imgIndex + 1}`}
                              className="h-full w-full object-cover"
                              crossOrigin="anonymous"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                                <Check className="h-4 w-4 text-primary" />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}


// export const mockGeneratedOutput = {
//   scenes: [
//     {
//       id: "scene-1",
//       timestamp: "00:00 - 00:05",
//       script: "在 2024 年快速演进的科技浪潮中，人工智能已不再是科幻小说中的概念，而是触手可及的现实。",
//       imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop",
//       imageDescription: "神经网络连接的抽象 3D 视觉图"
//     },
//     {
//       id: "scene-2",
//       timestamp: "00:05 - 00:12",
//       script: "通过强大的深度学习算法，AI 正在重塑从医疗诊断到自动驾驶的每一个行业，显著提升了人类的工作效率。",
//       imageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop",
//       imageDescription: "程序员在现代办公室使用多屏监控 AI 训练过程"
//     },
//     {
//       id: "scene-3",
//       timestamp: "00:12 - 00:20",
//       script: "未来已来。我们不仅是在创造工具，更是在开启一个人类与机器和谐共生的全新时代。让我们一起见证这场变革。",
//       imageUrl: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=600&h=400&fit=crop",
//       imageDescription: "代表全球智慧连接的数字城市背景"
//     }
//   ]
// }
