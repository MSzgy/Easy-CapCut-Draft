"use client"

import React, { useState, useEffect, useRef } from "react"
import { Wand2, LayoutList, Loader2, Save, Camera, User, Package, Mic, Upload, FileText, Plus, ImagePlus, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { aiContentApi, type ScriptShot, type ScriptCharacter } from "@/lib/api/ai-content"
import type { ModelSelection } from "@/lib/api/ai-content"
import { mediaApi } from "@/lib/api/media"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Chapter {
    prompt: string
    script: string
    shots: ScriptShot[]
}

interface ScriptCreatorProps {
    modelSelection: ModelSelection
    onImportToWorkbench?: (shots: ScriptShot[], script: string) => void
    onSaveToArchive?: (prompt: string, script: string, shots: ScriptShot[], characters: ScriptCharacter[], projectId?: string) => void
    onMediaAdded?: (assets: any[]) => void
    initialData?: { id?: string; prompt: string; script: string; shots: ScriptShot[], characters?: ScriptCharacter[] } | null
}

export function ScriptCreator({ modelSelection, onImportToWorkbench, onSaveToArchive, onMediaAdded, initialData }: ScriptCreatorProps) {
    // Helper: try parsing multi-chapter format from a script string
    const parseChapters = (s: string | undefined): Chapter[] | null => {
        if (!s) return null
        try { const p = JSON.parse(s); if (p?.__multiChapter__ && Array.isArray(p.chapters)) return p.chapters } catch { }
        return null
    }

    // Compute initial chapter data from initialData prop
    const _initCh = parseChapters(initialData?.script)
    const [chapters, setChapters] = useState<Chapter[]>(
        _initCh || [{ prompt: initialData?.prompt || "", script: initialData?.script || "", shots: initialData?.shots || [] }]
    )
    const [activeChapterIndex, setActiveChapterIndex] = useState(0)

    const [prompt, setPrompt] = useState(_initCh?.[0]?.prompt || initialData?.prompt || "")
    const [script, setScript] = useState(_initCh?.[0]?.script || (_initCh ? "" : (initialData?.script || "")))
    const [shots, setShots] = useState<ScriptShot[]>(_initCh?.[0]?.shots || initialData?.shots || [])
    const [characters, setCharacters] = useState<ScriptCharacter[]>(initialData?.characters || [])
    const [generatingImages, setGeneratingImages] = useState<Record<number, boolean>>({})
    const [generatingShotImages, setGeneratingShotImages] = useState<Record<number, boolean>>({})
    const [projectId, setProjectId] = useState<string | undefined>(initialData?.id)

    // Restore data when initialData changes (e.g. loading a different project)
    useEffect(() => {
        if (initialData) {
            setProjectId(initialData.id)
            if (initialData.characters) setCharacters(initialData.characters)

            const parsed = parseChapters(initialData.script)
            if (parsed && parsed.length > 0) {
                setChapters(parsed)
                setActiveChapterIndex(0)
                setPrompt(parsed[0].prompt || "")
                setScript(parsed[0].script || "")
                setShots(parsed[0].shots || [])
            } else {
                setPrompt(initialData.prompt || "")
                setScript(initialData.script || "")
                setShots(initialData.shots || [])
                setChapters([{ prompt: initialData.prompt || "", script: initialData.script || "", shots: initialData.shots || [] }])
                setActiveChapterIndex(0)
            }
        }
    }, [initialData])

    // Auto-save (debounced) — serializes all chapters
    const isFirstRender = useRef(true)
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false
            return
        }

        if (characters.length > 0 || shots.length > 0) {
            const timeoutId = setTimeout(() => {
                if (onSaveToArchive) {
                    const updatedChapters = chapters.map((ch, i) =>
                        i === activeChapterIndex ? { prompt, script, shots } : ch
                    )
                    const multiScript = JSON.stringify({ __multiChapter__: true, chapters: updatedChapters })
                    onSaveToArchive(prompt, multiScript, shots, characters, projectId)
                }
            }, 1500)
            return () => clearTimeout(timeoutId)
        }
    }, [characters, shots])

    const [isEnhancing, setIsEnhancing] = useState(false)
    const [isDeconstructing, setIsDeconstructing] = useState(false)
    const [isDraggingPrompt, setIsDraggingPrompt] = useState(false)
    const [isDraggingScript, setIsDraggingScript] = useState(false)

    // Helper to read text file
    const readTextFile = (file: File, callback: (text: string) => void) => {
        if (!file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
            alert("请上传 .txt 或 .md 文件")
            return
        }
        const reader = new FileReader()
        reader.onload = (e) => {
            const text = e.target?.result
            if (typeof text === 'string') {
                callback(text)
            }
        }
        reader.readAsText(file)
    }

    const handlePromptFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        e.preventDefault()
        let file: File | null = null
        if ('dataTransfer' in e) {
            setIsDraggingPrompt(false)
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                file = e.dataTransfer.files[0]
            }
        } else if (e.target.files && e.target.files[0]) {
            file = e.target.files[0]
        }
        if (file) {
            readTextFile(file, setPrompt)
        }
        if ('target' in e && (e.target as HTMLInputElement).value) {
            (e.target as HTMLInputElement).value = "" // reset input
        }
    }

    const handleScriptFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
        e.preventDefault()
        let file: File | null = null
        if ('dataTransfer' in e) {
            setIsDraggingScript(false)
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                file = e.dataTransfer.files[0]
            }
        } else if (e.target.files && e.target.files[0]) {
            file = e.target.files[0]
        }
        if (file) {
            readTextFile(file, setScript)
        }
        if ('target' in e && (e.target as HTMLInputElement).value) {
            (e.target as HTMLInputElement).value = "" // reset input
        }
    }

    const handleEnhance = async () => {
        if (!prompt.trim()) return
        try {
            setIsEnhancing(true)
            const res = await aiContentApi.enhanceScript(prompt, modelSelection.textProvider)
            if (res.success && res.script) {
                setScript(res.script)
            }
        } catch (err) {
            console.error("Enhance failed:", err)
        } finally {
            setIsEnhancing(false)
        }
    }

    const handleDeconstruct = async () => {
        if (!script.trim()) return
        try {
            setIsDeconstructing(true)
            const res = await aiContentApi.deconstructScript(script, modelSelection.textProvider)
            if (res.success && res.shots) {
                setShots(res.shots)
                if (res.characters) {
                    setCharacters(res.characters)
                }
                if (onSaveToArchive) {
                    const updatedChapters = chapters.map((ch, i) =>
                        i === activeChapterIndex ? { prompt, script, shots: res.shots } : ch
                    )
                    const multiScript = JSON.stringify({ __multiChapter__: true, chapters: updatedChapters })
                    onSaveToArchive(prompt, multiScript, res.shots, res.characters || [], projectId)
                }
            }
        } catch (err) {
            console.error("Deconstruct failed:", err)
        } finally {
            setIsDeconstructing(false)
        }
    }

    // ── Chapter management ──
    const switchChapter = (targetIndex: number) => {
        if (targetIndex === activeChapterIndex) return
        setChapters(prev => {
            const updated = [...prev]
            updated[activeChapterIndex] = { prompt, script, shots }
            return updated
        })
        const target = chapters[targetIndex]
        setPrompt(target.prompt)
        setScript(target.script)
        setShots(target.shots)
        setActiveChapterIndex(targetIndex)
    }

    const addChapter = () => {
        setChapters(prev => {
            const updated = [...prev]
            updated[activeChapterIndex] = { prompt, script, shots }
            return [...updated, { prompt: "", script: "", shots: [] }]
        })
        setActiveChapterIndex(chapters.length)
        setPrompt("")
        setScript("")
        setShots([])
    }

    // ── Character image upload ──
    const handleUploadCharacterImage = (index: number) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string
                if (dataUrl) {
                    setCharacters(prev => {
                        const newChars = [...prev]
                        newChars[index] = { ...newChars[index], imageUrl: dataUrl }
                        return newChars
                    })
                }
            }
            reader.readAsDataURL(file)
        }
        input.click()
    }

    const handleGenerateCharacterImage = async (index: number, character: ScriptCharacter) => {
        setGeneratingImages(prev => ({ ...prev, [index]: true }))
        try {
            const prompt = `Character Design Portrait, ${character.description}, clear face, high quality, photorealistic, cinematic lighting`
            const res = await aiContentApi.generateCover({
                style: "photorealistic",
                prompt: prompt,
                theme: "character_card",
                size: "9:16",
                resolution: "1080p",
                provider: modelSelection.imageProvider
            })
            if (res.success && res.coverUrl) {
                setCharacters(prev => {
                    const newChars = [...prev]
                    newChars[index] = { ...newChars[index], imageUrl: res.coverUrl }
                    return newChars
                })
            }
        } catch (error) {
            console.error("生成角色形象失败:", error)
        } finally {
            setGeneratingImages(prev => ({ ...prev, [index]: false }))
        }
    }

    const handleGenerateShotImage = async (index: number, shot: ScriptShot) => {
        setGeneratingShotImages(prev => ({ ...prev, [index]: true }))
        try {
            // Find ALL matched characters with images, ordered by their appearance in shot.character
            const matchedChars = characters.filter(c =>
                c.imageUrl && (shot.character.includes(c.name) || c.name.includes(shot.character))
            )

            // Sort by order of appearance in shot.character text
            matchedChars.sort((a, b) => {
                const posA = shot.character.indexOf(a.name)
                const posB = shot.character.indexOf(b.name)
                return (posA === -1 ? Infinity : posA) - (posB === -1 ? Infinity : posB)
            })

            // Build character reference instruction for the prompt
            let charRefInstruction = ""
            if (matchedChars.length > 1) {
                const charNames = matchedChars.map((c, i) => `第${i + 1}张参考图对应角色「${c.name}」`).join("，")
                charRefInstruction = `\nIMPORTANT: ${matchedChars.length} reference character images are provided (in order). ${charNames}. Ensure each character's appearance, clothing, and hairstyle match their corresponding reference image exactly.`
            } else if (matchedChars.length === 1) {
                charRefInstruction = `\nIMPORTANT: A reference image is provided for character「${matchedChars[0].name}」. Ensure the character's appearance matches the reference image exactly.`
            }

            const imagePrompt = `Cinematic shot, ${shot.scene}, ${shot.character}, ${shot.props}, photorealistic, high quality, 8k resolution, cinematic lighting${charRefInstruction}`

            const req: any = {
                style: "photorealistic",
                prompt: imagePrompt,
                theme: "shot_scene",
                size: "16:9",
                resolution: "1080p",
                provider: modelSelection.imageProvider
            }

            // 多角色：传 referenceImages 数组；单角色：传 referenceImage 保持兼容
            if (matchedChars.length > 1) {
                req.referenceImages = matchedChars.map(c => c.imageUrl)
            } else if (matchedChars.length === 1) {
                req.referenceImage = matchedChars[0].imageUrl
            }

            const res = await aiContentApi.generateCover(req)
            if (res.success && res.coverUrl) {
                setShots(prev => {
                    const newShots = [...prev]
                    newShots[index] = { ...newShots[index], imageUrl: res.coverUrl }
                    return newShots
                })
            } else {
                toast.error("生成失败：" + (res.message || "未知错误"))
            }
        } catch (error) {
            console.error("生成分镜画面失败:", error)
            toast.error("生成分镜画面失败，请检查网络或配置")
        } finally {
            setGeneratingShotImages(prev => ({ ...prev, [index]: false }))
        }
    }

    const handleCharacterChange = (index: number, newDescription: string) => {
        setCharacters(prev => {
            const newChars = [...prev]
            newChars[index] = { ...newChars[index], description: newDescription }
            return newChars
        })
    }

    const [isSavingMedia, setIsSavingMedia] = useState(false)

    const handleSaveCharactersToMedia = async () => {
        try {
            setIsSavingMedia(true)
            const charactersWithImages = characters.filter(c => c.imageUrl)

            if (charactersWithImages.length === 0) {
                toast.error("没有可保存的角色图像")
                return
            }

            const mediaItems = charactersWithImages.map((char, i) => ({
                id: `char-img-${Date.now()}-${i}`,
                type: "image" as const,
                name: `角色：${char.name}`,
                url: char.imageUrl as string,
                aiPrompt: char.description
            }))

            const res = await mediaApi.saveMediaBatch(mediaItems)
            if (res.success) {
                if (onMediaAdded) onMediaAdded(mediaItems)
                toast.success(`成功保存 ${res.saved_count} 个角色图像到素材库`)
            } else {
                toast.error("保存失败，请重试")
            }
        } catch (error) {
            console.error("保存媒体失败:", error)
            toast.error("保存到素材库失败")
        } finally {
            setIsSavingMedia(false)
        }
    }

    return (
        <div className="flex h-full flex-col gap-6 p-6 overflow-auto bg-background/50">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">剧本创作</h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        输入主题生成完整剧本，支持AI智能润色和一键拆解镜头。
                    </p>
                </div>
            </div>

            {/* ── Chapter Tabs ── */}
            <div className="flex items-center gap-2 -mt-2">
                <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex items-center gap-1 overflow-x-auto">
                    {chapters.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => switchChapter(idx)}
                            className={cn(
                                "px-3 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                                idx === activeChapterIndex
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            第 {idx + 1} 章
                        </button>
                    ))}
                    <button
                        onClick={addChapter}
                        className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                        title="添加新章节"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </div>
                <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    共 {chapters.length} 章 · 角色全局共享
                </span>
            </div>

            <div className={cn("grid gap-6 flex-1 min-h-0", characters.length > 0 ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
                {/* Left Column: Input and Script Editing */}
                <div className="flex flex-col gap-4 overflow-hidden">
                    {/* Step 1: Prompt Input */}
                    <div className="flex flex-col gap-3 p-5 rounded-2xl border bg-card/50 shadow-sm backdrop-blur-xl max-h-[45%] min-h-0 shrink-0">
                        <Label htmlFor="script-prompt" className="text-base font-semibold text-foreground flex items-center gap-2 shrink-0">
                            <Wand2 className="h-4 w-4 text-purple-500" />
                            1. 提供创意主题或草稿
                        </Label>
                        <div
                            className="relative flex-1 group flex flex-col min-h-0"
                            onDragOver={(e) => { e.preventDefault(); setIsDraggingPrompt(true) }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDraggingPrompt(false) }}
                            onDrop={handlePromptFileUpload}
                        >
                            <Textarea
                                id="script-prompt"
                                placeholder={isDraggingPrompt ? "" : "例如：一个关于时间旅行的科幻武侠故事，主角在明朝发现了一台时光机..."}
                                className={cn(
                                    "resize-none w-full flex-1 min-h-0 overflow-y-auto focus-visible:ring-purple-500/30 text-sm leading-relaxed transition-all relative z-20",
                                    isDraggingPrompt ? "border-purple-500 bg-purple-500/10" : "border-muted",
                                    !prompt && !isDraggingPrompt ? "bg-transparent text-transparent placeholder:text-transparent" : "bg-background/50"
                                )}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                            {!prompt && (
                                <div className={cn(
                                    "absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors pointer-events-none",
                                    isDraggingPrompt ? "border-purple-500 bg-purple-500/10" : "border-border/60"
                                )}>
                                    <Upload strokeWidth={1.5} className={cn("mb-3 h-8 w-8", isDraggingPrompt ? "text-purple-500" : "text-muted-foreground/70")} />
                                    <p className="text-sm font-medium text-foreground/70">输入文本，或拖拽导入 .txt</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 shrink-0">
                            <div className="relative overflow-hidden inline-block">
                                <Button
                                    variant="outline"
                                    className="bg-background/80 gap-2 rounded-xl hover:bg-muted"
                                >
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    导入文本
                                </Button>
                                <input
                                    type="file"
                                    accept=".txt,.md"
                                    onChange={handlePromptFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                            <Button
                                onClick={handleEnhance}
                                className="bg-purple-600 hover:bg-purple-700 text-white gap-2 rounded-xl"
                                disabled={isEnhancing || !prompt.trim()}
                            >
                                {isEnhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                {isEnhancing ? "正在创作..." : "AI 智能创作/润色"}
                            </Button>
                        </div>
                    </div>

                    {/* Step 2: Script Editor */}
                    <div className="flex flex-col flex-1 gap-3 p-5 rounded-2xl border bg-card/50 shadow-sm backdrop-blur-xl min-h-0">
                        <div className="flex items-center justify-between shrink-0">
                            <Label htmlFor="script-editor" className="text-base font-semibold text-foreground flex items-center gap-2">
                                <LayoutList className="h-4 w-4 text-blue-500" />
                                2. 剧本内容 (可修改)
                            </Label>
                        </div>
                        <div
                            className="relative flex-1 group flex flex-col min-h-0"
                            onDragOver={(e) => { e.preventDefault(); setIsDraggingScript(true) }}
                            onDragLeave={(e) => { e.preventDefault(); setIsDraggingScript(false) }}
                            onDrop={handleScriptFileUpload}
                        >
                            <Textarea
                                id="script-editor"
                                placeholder={isDraggingScript ? "" : "生成的剧本将显示在这里，您可以直接修改..."}
                                className={cn(
                                    "resize-none w-full flex-1 min-h-0 overflow-y-auto focus-visible:ring-blue-500/30 text-sm leading-relaxed p-4 font-medium transition-all relative z-20",
                                    isDraggingScript ? "border-blue-500 bg-blue-500/10" : "border-muted",
                                    !script && !isDraggingScript ? "bg-transparent text-transparent placeholder:text-transparent" : "bg-background/50"
                                )}
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                            />
                            {!script && (
                                <div className={cn(
                                    "absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors pointer-events-none",
                                    isDraggingScript ? "border-blue-500 bg-blue-500/10" : "border-border/60"
                                )}>
                                    <Upload strokeWidth={1.5} className={cn("mb-4 h-10 w-10", isDraggingScript ? "text-blue-500" : "text-muted-foreground/70")} />
                                    <p className="text-base font-medium text-foreground/70">输入剧本内容，或拖拽导入 .txt 草稿</p>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between items-center mt-2 shrink-0">
                            <span className="text-xs text-muted-foreground">{script.length} 字</span>
                            <div className="flex items-center gap-2">
                                <div className="relative overflow-hidden inline-block">
                                    <Button
                                        variant="outline"
                                        className="bg-background/80 gap-2 rounded-xl hover:bg-muted"
                                    >
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        导入文本
                                    </Button>
                                    <input
                                        type="file"
                                        accept=".txt,.md"
                                        onChange={handleScriptFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </div>
                                <Button
                                    onClick={handleDeconstruct}
                                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl"
                                    disabled={isDeconstructing || !script.trim()}
                                >
                                    {isDeconstructing ? <Loader2 className="h-4 w-4 animate-spin" /> : <LayoutList className="h-4 w-4" />}
                                    {isDeconstructing ? "正在拆解分镜..." : "一键拆解分镜"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Middle Column: Character Cards (Only visible when characters are extracted) */}
                {characters.length > 0 && (
                    <div className="flex flex-col gap-4 overflow-hidden rounded-2xl border bg-card/30 shadow-sm backdrop-blur-sm p-1">
                        <div className="p-4 border-b bg-muted/20 flex flex-wrap items-center gap-2 rounded-t-2xl shrink-0">
                            <User className="h-5 w-5 text-emerald-500" />
                            <h2 className="text-lg font-semibold text-foreground">核心角色卡</h2>
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs font-medium bg-emerald-500/10 text-emerald-500 px-2.5 py-1 rounded-full">
                                    共 {characters.length} 名角色
                                </span>
                                <Button
                                    size="sm"
                                    onClick={handleSaveCharactersToMedia}
                                    disabled={isSavingMedia || characters.every(c => !c.imageUrl)}
                                    className="h-7 text-xs bg-muted hover:bg-muted/80 text-foreground gap-1.5 rounded-lg px-3"
                                >
                                    {isSavingMedia ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                    保存图像至素材库
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 space-y-4 pr-3 custom-scrollbar">
                            {characters.map((char, idx) => (
                                <div
                                    key={`char-${idx}`}
                                    className="group flex flex-col gap-3 p-4 rounded-xl border bg-background/80 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4"
                                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: "both" }}
                                >
                                    <div className="font-semibold text-foreground border-b pb-2 flex justify-between items-center">
                                        <span className="text-emerald-600 dark:text-emerald-400">{char.name}</span>
                                    </div>
                                    <Textarea
                                        value={char.description}
                                        onChange={(e) => handleCharacterChange(idx, e.target.value)}
                                        placeholder="角色外貌和背景描述..."
                                        className="text-sm text-foreground whitespace-pre-wrap leading-relaxed min-h-[80px] resize-none focus-visible:ring-emerald-500/30 border-muted bg-background/50"
                                    />

                                    {/* Image Area */}
                                    <div className="mt-2 w-full flex flex-col items-center gap-3">
                                        {char.imageUrl ? (
                                            <div className="w-full relative aspect-[3/4] rounded-lg overflow-hidden border bg-muted shadow-sm">
                                                <img
                                                    src={char.imageUrl}
                                                    alt={char.name}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                    crossOrigin="anonymous"
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full aspect-[3/4] rounded-lg border-2 border-dashed bg-muted/30 flex flex-col items-center justify-center text-muted-foreground/50 transition-colors group-hover:bg-muted/50">
                                                <User className="h-10 w-10 mb-2 opacity-50" />
                                                <span className="text-xs">暂无形象</span>
                                            </div>
                                        )}

                                        <div className="w-full flex gap-2">
                                            <Button
                                                onClick={() => handleGenerateCharacterImage(idx, char)}
                                                size="sm"
                                                className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                                                disabled={generatingImages[idx]}
                                            >
                                                {generatingImages[idx] ? (
                                                    <><Loader2 className="h-4 w-4 animate-spin" /> 生成中...</>
                                                ) : (
                                                    <><Wand2 className="h-4 w-4" />AI 生成</>
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => handleUploadCharacterImage(idx)}
                                                size="sm"
                                                variant="outline"
                                                className="gap-2 rounded-lg"
                                            >
                                                <ImagePlus className="h-4 w-4" />
                                                上传
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Right Column: Deconstructed Shots */}
                <div className="flex flex-col gap-4 overflow-hidden rounded-2xl border bg-card/30 shadow-sm backdrop-blur-sm p-1">
                    <div className="p-4 border-b bg-muted/20 flex items-center gap-2 rounded-t-2xl shrink-0">
                        <Camera className="h-5 w-5 text-indigo-500" />
                        <h2 className="text-lg font-semibold text-foreground">分镜拆解结果</h2>
                        {shots.length > 0 && (
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs font-medium bg-indigo-500/10 text-indigo-500 px-2.5 py-1 rounded-full">
                                    共 {shots.length} 个镜头
                                </span>
                                {onImportToWorkbench && (
                                    <Button
                                        size="sm"
                                        onClick={() => onImportToWorkbench(shots, script)}
                                        className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 rounded-lg px-3 ml-2"
                                    >
                                        <Save className="h-3 w-3" />
                                        一键导入工作台
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-4 space-y-4 pr-3 custom-scrollbar">
                        {shots.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-60">
                                <LayoutList className="h-12 w-12 mb-4 animate-pulse duration-1000" />
                                <p>点击“一键拆解分镜”查看每个镜头的具体细节</p>
                            </div>
                        ) : (
                            shots.map((shot, idx) => (
                                <div
                                    key={idx}
                                    className="group flex flex-col gap-3 p-4 rounded-xl border bg-background/80 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4"
                                    style={{ animationDelay: `${idx * 100}ms`, animationFillMode: "both" }}
                                >
                                    <div className="flex items-center gap-2 font-black text-indigo-500 text-lg border-b pb-2">
                                        镜头 {shot.shotNumber < 10 ? `0${shot.shotNumber}` : shot.shotNumber}
                                    </div>

                                    <div className="grid gap-3 mt-1">
                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 rounded-md bg-sky-500/10 shrink-0 mt-0.5">
                                                <Camera className="h-3.5 w-3.5 text-sky-500" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">场景</Label>
                                                <p className="text-sm leading-snug">{shot.scene}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 rounded-md bg-amber-500/10 shrink-0 mt-0.5">
                                                <User className="h-3.5 w-3.5 text-amber-500" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">人物</Label>
                                                <p className="text-sm leading-snug">{shot.character}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 rounded-md bg-emerald-500/10 shrink-0 mt-0.5">
                                                <Package className="h-3.5 w-3.5 text-emerald-500" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">道具与特效</Label>
                                                <p className="text-sm leading-snug">{shot.props}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="p-1.5 rounded-md bg-rose-500/10 shrink-0 mt-0.5">
                                                <Mic className="h-3.5 w-3.5 text-rose-500" />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">台词 / 旁白</Label>
                                                <p className="text-sm italic leading-snug text-foreground/90">&ldquo;{shot.dialogue}&rdquo;</p>
                                            </div>
                                        </div>

                                        {/* Shot Image Generation Area */}
                                        <div className="mt-2 w-full flex flex-col items-center gap-3 border-t border-border/50 pt-3">
                                            {shot.imageUrl ? (
                                                <div className="w-full relative aspect-[16/9] rounded-lg overflow-hidden border bg-muted shadow-sm">
                                                    <img
                                                        src={shot.imageUrl}
                                                        alt={`Scene ${shot.shotNumber}`}
                                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                        crossOrigin="anonymous"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-full aspect-[16/9] rounded-lg border-2 border-dashed bg-muted/30 flex flex-col items-center justify-center text-muted-foreground/50 transition-colors group-hover:bg-muted/50">
                                                    <Camera className="h-8 w-8 mb-2 opacity-50" />
                                                    <span className="text-xs">暂无分镜画面</span>
                                                </div>
                                            )}

                                            <Button
                                                onClick={() => handleGenerateShotImage(idx, shot)}
                                                size="sm"
                                                variant="outline"
                                                className="w-full gap-2 rounded-lg"
                                                disabled={generatingShotImages[idx]}
                                            >
                                                {generatingShotImages[idx] ? (
                                                    <><Loader2 className="h-4 w-4 animate-spin" /> 生成中...</>
                                                ) : (
                                                    <><Camera className="h-4 w-4" />生成分镜画面</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
