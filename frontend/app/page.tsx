"use client"

import { useState, useCallback } from "react"
import { AppSidebar, type TabType } from "@/components/video-editor/app-sidebar"
import { ColumnInput, type GeneratedOutput } from "@/components/video-editor/column-input"
import { ColumnContent } from "@/components/video-editor/column-content"
import { ColumnOrchestrator } from "@/components/video-editor/column-orchestrator"
import { SmartTimeline } from "@/components/video-editor/smart-timeline"
import { MediaVault, type MediaAsset } from "@/components/video-editor/media-vault"
import { OutputArchive, type OutputRecord } from "@/components/video-editor/output-archive"
import { ImageStudio } from "@/components/video-editor/image-studio"
import { VideoStudio } from "@/components/video-editor/video-studio"
import { ConfigPage } from "@/components/video-editor/config-page"
import type { ModelSelection } from "@/lib/api/ai-content"

export default function VideoEditorPage() {
  const [activeTab, setActiveTab] = useState<TabType>("workbench")
  const [generatedContent, setGeneratedContent] = useState<GeneratedOutput | null>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [composingStep, setComposingStep] = useState(0)
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<"json" | "video" | null>(null)
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [outputRecords, setOutputRecords] = useState<OutputRecord[]>([])
  const [storyboardFrames, setStoryboardFrames] = useState<any[]>([])
  const [modelSelection, setModelSelection] = useState<ModelSelection>({
    textProvider: "gemini",
    imageProvider: "gemini",
    imageToImageProvider: "gemini",
    videoProvider: "hf:video_i2v",
  })
  // Video render state
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([])
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null)
  const [combinedVideoUrl, setCombinedVideoUrl] = useState<string | null>(null)

  const handleGenerate = (output: GeneratedOutput) => {
    setGeneratedContent(output)
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
    setMediaAssets((prev) => [...prev, ...newAssets])
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

    // Add to output archive
    const newRecord: OutputRecord = {
      id: `output_${Date.now()}`,
      name: "AI Generated Video",
      type: "json",
      status: "json-only",
      createdAt: new Date().toLocaleString(),
      fileSize: `${(blob.size / 1024).toFixed(1)} KB`,
      scenes: generatedContent?.scenes.length || 0,
    }
    setOutputRecords((prev) => [newRecord, ...prev])

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

    const videos: string[] = []

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
        }

        // Step 2: Generate video with the (possibly AI-enhanced) prompt
        const response = await aiContentApi.generateVideoImageAudio({
          firstFrame: scene.imageUrl,
          endFrame: nextScene?.imageUrl || undefined,
          prompt: videoPrompt,
          duration: 5,
          generationMode: "Image-to-Video",
          enhancePrompt: true,
          randomizeSeed: true,
          width: 768,
          height: 512,
          videoProvider: modelSelection.videoProvider,
        })

        if (response.success && response.videoUrl) {
          videos.push(response.videoUrl)
        } else {
          videos.push("") // placeholder for failed scene
        }
      } catch (error: any) {
        console.error(`Scene ${i + 1} video generation failed:`, error)
        videos.push("") // placeholder for failed scene
      }

      // Update videos array progressively so UI shows partial results
      setGeneratedVideos([...videos])
    }

    // 拼接所有成功生成的视频
    const successVideos = videos.filter(v => v && v.length > 0)
    if (successVideos.length > 1) {
      try {
        setRenderProgress({ current: total, total })
        console.log(`🔗 Concatenating ${successVideos.length} videos...`)
        const { aiContentApi } = await import("@/lib/api/ai-content")
        const concatResponse = await aiContentApi.concatenateVideos(successVideos)
        if (concatResponse.success && concatResponse.videoUrl) {
          setCombinedVideoUrl(concatResponse.videoUrl)
          console.log("✅ Video concatenation successful")
        }
      } catch (error: any) {
        console.error("Video concatenation failed:", error)
      }
    } else if (successVideos.length === 1) {
      setCombinedVideoUrl(successVideos[0])
    }

    setRenderProgress(null)
    setIsExporting(false)
    setExportType(null)
  }, [generatedContent, modelSelection])

  const handleDeleteAsset = (id: string) => {
    setMediaAssets((prev) => prev.filter((a) => a.id !== id))
  }

  const handleDeleteRecord = (id: string) => {
    setOutputRecords((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="flex h-screen bg-background flex-col-reverse lg:flex-row">
      {/* Collapsible Sidebar */}
      <AppSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        mediaCount={mediaAssets.length}
        outputCount={outputRecords.length}
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
              modelSelection={modelSelection}
            />
          </main>
        )}

        {activeTab === "video-studio" && (
          <main className="flex-1 overflow-hidden p-4">
            <VideoStudio videoProvider={modelSelection.videoProvider} />
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
              records={outputRecords}
              onDelete={handleDeleteRecord}
              onReEdit={() => setActiveTab("workbench")}
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
