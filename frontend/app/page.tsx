"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { AppSidebar, type TabType } from "@/components/video-editor/app-sidebar"
import { ColumnInput, type GeneratedOutput } from "@/components/video-editor/column-input"
import { ColumnContent } from "@/components/video-editor/column-content"
import { ColumnOrchestrator } from "@/components/video-editor/column-orchestrator"
import { SmartTimeline } from "@/components/video-editor/smart-timeline"
import { MediaVault, type MediaAsset } from "@/components/video-editor/media-vault"
import { OutputArchive, type OutputProject, type OutputScene } from "@/components/video-editor/output-archive"
import { ImageStudio } from "@/components/video-editor/image-studio"
import { VideoStudio } from "@/components/video-editor/video-studio"
import { AudioStudio } from "@/components/video-editor/audio-studio"
import { MusicStudio } from "@/components/video-editor/music-studio"
import { ConfigPage } from "@/components/video-editor/config-page"
import type { ModelSelection } from "@/lib/api/ai-content"
import { projectsApi } from "@/lib/api/projects"

export default function VideoEditorPage() {
  const [activeTab, setActiveTab] = useState<TabType>("workbench")
  const [generatedContent, setGeneratedContent] = useState<GeneratedOutput | null>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [composingStep, setComposingStep] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<"json" | "video" | null>(null)
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [outputProjects, setOutputProjects] = useState<OutputProject[]>([])
  const [storyboardFrames, setStoryboardFrames] = useState<any[]>([])
  const [modelSelection, setModelSelection] = useState<ModelSelection>({
    textProvider: "gemini",
    imageProvider: "gemini",
    imageToImageProvider: "gemini",
    videoProvider: "hf:video_i2v",
    audioProvider: "hf:tts_qwen",
    musicProvider: "hf:music_gen",
  })
  // Video render state
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([])
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null)
  const [combinedVideoUrl, setCombinedVideoUrl] = useState<string | null>(null)

  // ── 项目持久化 ────────────────────────────────────────────────────────
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const hasMounted = useRef(false)

  // 启动时恢复最新项目
  useEffect(() => {
    if (hasMounted.current) return
    hasMounted.current = true
    projectsApi.getLatestProject().then((res) => {
      if (res.success && res.project && res.project.scenes.length > 0) {
        const p = res.project
        setCurrentProjectId(p.id)

        // 恢复分镜内容
        const restoredScenes = p.scenes.map((s) => ({
          id: s.id,
          timestamp: s.timestamp,
          script: s.script,
          imageUrl: s.imageUrl || "",
          imageDescription: s.imageDescription || "",
          imageMetadata: s.imageMetadata as any,
          duration: s.duration,
        }))
        setGeneratedContent({
          scenes: restoredScenes,
          coverUrl: p.coverUrl,
          copy: p.generatedCopy,
        })

        // 恢复 Media Vault（场景图片 + 视频）
        const restoredAssets: MediaAsset[] = p.scenes
          .filter((s) => s.imageUrl)
          .map((s, i) => ({
            id: s.id,
            name: `scene_${i + 1}_${(s.imageDescription || "image").slice(0, 20)}.jpg`,
            type: "image" as const,
            url: s.imageUrl!,
            createdAt: p.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0],
            sceneUsedIn: `Scene ${i + 1}`,
            aiPrompt: s.imageDescription || undefined,
            size: "-",
          }))
        // 场景视频也加入
        p.scenes
          .filter((s) => s.videoUrl)
          .forEach((s, i) => {
            restoredAssets.push({
              id: `video_${s.id}`,
              name: `scene_${i + 1}_video.mp4`,
              type: "video" as const,
              url: s.videoUrl!,
              createdAt: p.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0],
              sceneUsedIn: `Scene ${i + 1}`,
              size: "-",
            })
          })
        // 封面也加入
        if (p.coverUrl) {
          restoredAssets.push({
            id: `cover_${p.id}`,
            name: "cover.jpg",
            type: "image" as const,
            url: p.coverUrl,
            createdAt: p.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0],
            sceneUsedIn: "Cover",
            aiPrompt: "AI Generated Cover",
            size: "-",
          })
        }
        setMediaAssets(restoredAssets)

        // 恢复 Output Archive
        const restoredProject: OutputProject = {
          id: p.id,
          name: p.title || "Restored Project",
          status: (p.status === "rendered" || p.status === "failed" || p.status === "processing")
            ? p.status
            : "rendered",
          createdAt: p.createdAt?.replace("T", " ").slice(0, 16) || "",
          combinedVideoUrl: p.combinedVideoUrl || undefined,
          sceneCount: p.scenes.length,
          totalDuration: p.scenes.reduce((sum, s) => sum + (s.duration || 5), 0) + "s",
          scenes: p.scenes
            .filter((s) => s.videoUrl)
            .map((s, i) => ({
              id: s.id,
              name: `Scene ${i + 1}`,
              videoUrl: s.videoUrl!,
              prompt: s.script,
              thumbnail: s.imageUrl || undefined,
            })),
        }
        setOutputProjects([restoredProject])

        console.log("✅ 已恢复项目:", p.title, `(${p.scenes.length} 场景)`)
      }
    }).catch(() => {
      // 数据库不可用时静默忽略
    })
  }, [])

  // 保存项目到数据库
  const saveProject = useCallback(async (output: GeneratedOutput, title?: string) => {
    try {
      const res = await projectsApi.saveProject({
        projectId: currentProjectId || undefined,
        title: title || "Untitled Project",
        mode: "prompt",
        generatedCopy: output.copy,
        coverUrl: output.coverUrl,
        modelConfig: modelSelection as any,
        scenes: output.scenes.map((s) => ({
          id: s.id,
          timestamp: s.timestamp,
          script: s.script,
          imageUrl: s.imageUrl,
          imageDescription: s.imageDescription,
          imageMetadata: s.imageMetadata as any,
          duration: s.duration,
        })),
      })
      if (res.success) {
        setCurrentProjectId(res.project.id)
        console.log("✅ 项目已保存:", res.project.id)
      }
    } catch (e) {
      console.warn("⚠️ 项目保存失败:", e)
    }
  }, [currentProjectId, modelSelection])

  const handleGenerate = (output: GeneratedOutput) => {
    setGeneratedContent(output)
    // 自动持久化到数据库
    saveProject(output)
    // Add generated images to media vault
    const newAssets: MediaAsset[] = output.scenes.map((scene, index) => ({
      id: `generated_${Date.now()}_${index}`,
      name: `scene_${index + 1}_${scene.imageDescription.slice(0, 20)}.jpg`,
      type: "image" as const,
      url: scene.imageUrl,
      createdAt: new Date().toISOString().split("T")[0],
      sceneUsedIn: `Scene ${index + 1}`,
      aiPrompt: scene.imageDescription,
      size: "1.2 MB",
    }))
    // 封面也加入 Media Vault
    if (output.coverUrl) {
      newAssets.push({
        id: `cover_${Date.now()}`,
        name: "cover.jpg",
        type: "image" as const,
        url: output.coverUrl,
        createdAt: new Date().toISOString().split("T")[0],
        sceneUsedIn: "Cover",
        aiPrompt: "AI Generated Cover",
        size: "1.0 MB",
      })
    }
    setMediaAssets((prev) => [...prev, ...newAssets])
  }

  const handleImagesGenerated = (images: any[]) => {
    const newAssets: MediaAsset[] = images.map((img) => ({
      id: img.id,
      name: `generated_${img.style}_${img.id.split('_').pop()}.jpg`,
      type: "image" as const,
      url: img.url,
      createdAt: img.timestamp.split(' ')[0], // Extract date part if possible, or just use current date
      sceneUsedIn: "Image Studio",
      aiPrompt: img.prompt,
      size: "1.0 MB", // Placeholder size
    }))
    setMediaAssets((prev) => [...newAssets, ...prev])
  }

  const handleContentUpdate = (content: GeneratedOutput) => {
    setGeneratedContent(content)
  }

  const handleComposeJson = async () => {
    setIsComposing(true)
    setComposingStep(0)

    for (let i = 0; i <= 6; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      setComposingStep(i)
    }

    setIsComposing(false)
  }

  const handleExportJson = async () => {
    setExportType("json")
    setIsExporting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const jsonData = {
      version: "5.0.0",
      project: { name: "AI Generated Video" },
      scenes: generatedContent?.scenes || [],
    }
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "capcut-draft.json"
    a.click()
    URL.revokeObjectURL(url)

    // Note: JSON export is just a download, we don't add it to OutputProject for now as OutputProject is video-centric
    setIsExporting(false)
    setExportType(null)
  }

  const handleRenderVideo = useCallback(async () => {
    if (!generatedContent || generatedContent.scenes.length === 0) return

    const scenes = generatedContent.scenes
    const total = scenes.length
    setExportType("video")
    setIsExporting(true)
    setGeneratedVideos([])
    setCombinedVideoUrl(null)
    setRenderProgress({ current: 0, total })

    // Create a new project entry in "processing" state
    const projectId = `proj_${Date.now()}`
    const newProject: OutputProject = {
      id: projectId,
      name: `AI Video ${new Date().toLocaleTimeString()}`,
      status: "processing",
      createdAt: new Date().toLocaleString(),
      scenes: [],
      sceneCount: total,
    }
    setOutputProjects((prev) => [newProject, ...prev])

    const videos: string[] = []
    const projectScenes: OutputScene[] = []

    for (let i = 0; i < total; i++) {
      setRenderProgress({ current: i + 1, total })
      const scene = scenes[i]
      const nextScene = i < total - 1 ? scenes[i + 1] : null

      try {
        const { aiContentApi } = await import("@/lib/api/ai-content")

        // Step 1: If there's a next scene, analyze the transition between frames
        let videoPrompt = scene.script
        if (nextScene) {
          try {
            console.log(`🔍 Scene ${i + 1}: Analyzing transition between frames...`)
            const transitionResult = await aiContentApi.analyzeTransition(
              scene.imageUrl,
              nextScene.imageUrl
            )
            if (transitionResult.success && transitionResult.transitionPrompt) {
              videoPrompt = transitionResult.transitionPrompt
              console.log(`✅ Scene ${i + 1}: AI transition prompt: ${videoPrompt}`)
            }
          } catch (err) {
            console.warn(`⚠️ Scene ${i + 1}: Transition analysis failed, using script as prompt`, err)
          }
        } else {
          // No next scene (last frame), use image description as prompt
          // This gives better results than the script for single-image movement
          const imagePrompt = scene.imageMetadata?.description || scene.imageDescription
          if (imagePrompt) {
            videoPrompt = imagePrompt
            console.log(`🎬 Scene ${i + 1} (Last): Using image description as prompt: ${videoPrompt}`)
          }
        }

        // Step 2: Generate video with the (possibly AI-enhanced) prompt
        const response = await aiContentApi.generateVideoImageAudio({
          firstFrame: scene.imageUrl,
          endFrame: nextScene?.imageUrl || undefined,
          prompt: videoPrompt,
          duration: scene.duration || 5, // Use scene specific duration or default to 5s
          generationMode: "Image-to-Video",
          enhancePrompt: true,
          randomizeSeed: true,
          width: 768,
          height: 512,
          videoProvider: modelSelection.videoProvider,
        })

        if (response.success && response.videoUrl) {
          videos.push(response.videoUrl)
          projectScenes.push({
            id: `scene_${i}`,
            name: `Scene ${i + 1}`,
            videoUrl: response.videoUrl,
            prompt: videoPrompt,
            thumbnail: scene.imageUrl
          })
        } else {
          videos.push("") // placeholder for failed scene
        }
      } catch (error: any) {
        console.error(`Scene ${i + 1} video generation failed:`, error)
        videos.push("") // placeholder for failed scene
      }

      // Update videos array progressively so UI shows partial results
      setGeneratedVideos([...videos])

      // Update the project with partial scene results
      setOutputProjects((prev) =>
        prev.map(p =>
          p.id === projectId
            ? { ...p, scenes: [...projectScenes] }
            : p
        )
      )
    }

    // 拼接所有成功生成的视频
    const successVideos = videos.filter(v => v && v.length > 0)
    let finalCombinedUrl: string | undefined = undefined

    if (successVideos.length > 1) {
      try {
        setRenderProgress({ current: total, total })
        console.log(`🔗 Concatenating ${successVideos.length} videos...`)
        const { aiContentApi } = await import("@/lib/api/ai-content")
        const concatResponse = await aiContentApi.concatenateVideos(successVideos)
        if (concatResponse.success && concatResponse.videoUrl) {
          finalCombinedUrl = concatResponse.videoUrl
          setCombinedVideoUrl(concatResponse.videoUrl)
          console.log("✅ Video concatenation successful")
        }
      } catch (error: any) {
        console.error("Video concatenation failed:", error)
      }
    } else if (successVideos.length === 1) {
      finalCombinedUrl = successVideos[0]
      setCombinedVideoUrl(successVideos[0])
    }

    // Update the project with final results
    setOutputProjects((prev) =>
      prev.map(p =>
        p.id === projectId
          ? {
            ...p,
            status: finalCombinedUrl ? "rendered" : "failed",
            combinedVideoUrl: finalCombinedUrl || undefined,
            scenes: projectScenes,
            totalDuration: successVideos.length > 0 ? `${successVideos.length * 4}s` : undefined
          }
          : p
      )
    )

    setRenderProgress(null)
    setIsExporting(false)
    setExportType(null)
  }, [generatedContent, modelSelection])

  const handleDeleteAsset = (id: string) => {
    setMediaAssets((prev) => prev.filter((a) => a.id !== id))
  }

  const handleDeleteProject = (id: string) => {
    setOutputProjects((prev) => prev.filter((p) => p.id !== id))
  }

  const handleAudioGenerated = (audio: any) => {
    const newAsset: MediaAsset = {
      id: audio.id,
      name: `audio_${audio.mode}_${audio.id.split('_').pop()}.mp3`,
      type: "audio" as const,
      url: audio.url,
      createdAt: new Date().toISOString().split("T")[0],
      sceneUsedIn: "Audio Studio",
      aiPrompt: audio.text, // Use script as prompt info
      size: "Unknown",
    }
    setMediaAssets((prev) => [newAsset, ...prev])
  }

  return (
    <div className="flex h-screen bg-background flex-col-reverse lg:flex-row">
      {/* Collapsible Sidebar */}
      <AppSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mediaCount={mediaAssets.length}
        outputCount={outputProjects.length}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeTab === "workbench" && (
          <>
            {/* 3-Column Workbench Layout */}
            <main className="flex flex-1 flex-col gap-4 overflow-auto p-4 lg:flex-row lg:overflow-hidden">
              {/* Column 1: Multi-Modal Input */}
              <aside className="w-full shrink-0 overflow-auto lg:w-80 xl:w-96">
                <ColumnInput
                  onGenerate={handleGenerate}
                  onCoverGenerated={(coverUrl, prompt) => {
                    setMediaAssets((prev) => [{
                      id: `cover_${Date.now()}`,
                      name: "ai_cover.jpg",
                      type: "image" as const,
                      url: coverUrl,
                      createdAt: new Date().toISOString().split("T")[0],
                      sceneUsedIn: "Cover",
                      aiPrompt: prompt,
                      size: "-",
                    }, ...prev])
                  }}
                  modelSelection={modelSelection}
                />
              </aside>

              {/* Column 2: Content Refinement */}
              <section className="flex min-w-0 flex-1 flex-col">
                <ColumnContent
                  content={generatedContent}
                  onContentUpdate={handleContentUpdate}
                  onComposeJson={handleComposeJson}
                  isComposing={isComposing}
                  storyboardFrames={storyboardFrames}
                />
              </section>

              {/* Column 3: AI Orchestrator & JSON Inspector */}
              <aside className="w-full shrink-0 overflow-auto lg:w-80 xl:w-96">
                <ColumnOrchestrator
                  content={generatedContent}
                  isComposing={isComposing}
                  composingStep={composingStep}
                  onGenerateJson={handleExportJson}
                  onGenerateVideo={handleRenderVideo}
                  isExporting={isExporting}
                  exportType={exportType}
                />
              </aside>
            </main>

            {/* Footer: Smart Timeline / Video Player */}
            <footer className="shrink-0 border-t border-border p-4">
              <SmartTimeline
                content={generatedContent}
                onExportJson={handleExportJson}
                onRenderVideo={handleRenderVideo}
                isExporting={isExporting}
                exportType={exportType}
                generatedVideos={generatedVideos}
                renderProgress={renderProgress}
                combinedVideoUrl={combinedVideoUrl}
              />
            </footer>
          </>
        )}

        {activeTab === "image-studio" && (
          <main className="flex-1 overflow-hidden p-4">
            <ImageStudio
              onStoryboardGenerated={setStoryboardFrames}
              onImagesGenerated={handleImagesGenerated}
              modelSelection={modelSelection}
            />
          </main>
        )}

        {activeTab === "video-studio" && (
          <main className="flex-1 overflow-hidden p-4">
            <VideoStudio videoProvider={modelSelection.videoProvider} />
          </main>
        )}

        {activeTab === "audio-studio" && (
          <main className="flex-1 overflow-hidden p-4">
            <AudioStudio
              audioProvider={modelSelection.audioProvider}
              onAudioGenerated={handleAudioGenerated}
            />
          </main>
        )}

        {activeTab === "music-studio" && (
          <main className="flex-1 overflow-hidden p-4">
            <MusicStudio
              musicProvider={modelSelection.musicProvider}
              textProvider={modelSelection.textProvider}
              scenes={generatedContent?.scenes?.map(s => ({
                script: s.script,
                mood: s.imageMetadata?.mood,
                tags: s.imageMetadata?.tags || [],
                imageDescription: s.imageDescription,
              }))}
            />
          </main>
        )}

        {activeTab === "media-vault" && (
          <main className="flex-1 overflow-hidden p-4">
            <MediaVault
              assets={mediaAssets}
              onDeleteAsset={handleDeleteAsset}
            />
          </main>
        )}

        {activeTab === "output-archive" && (
          <main className="flex-1 overflow-hidden p-4">
            <OutputArchive
              projects={outputProjects}
              onDelete={handleDeleteProject}
            />
          </main>
        )}

        {activeTab === "configuration" && (
          <main className="flex-1 overflow-hidden p-4">
            <ConfigPage
              modelSelection={modelSelection}
              setModelSelection={setModelSelection}
            />
          </main>
        )}
      </div>
    </div>
  )
}
