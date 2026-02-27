"use client"

import { useState } from "react"
import { Wand2, LayoutList, Loader2, Save, Camera, User, Package, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { aiContentApi, type ScriptShot } from "@/lib/api/ai-content"
import type { ModelSelection } from "@/lib/api/ai-content"
import { cn } from "@/lib/utils"

interface ScriptCreatorProps {
    modelSelection: ModelSelection
    onImportToWorkbench?: (shots: ScriptShot[], script: string) => void
}

export function ScriptCreator({ modelSelection, onImportToWorkbench }: ScriptCreatorProps) {
    const [prompt, setPrompt] = useState("")
    const [script, setScript] = useState("")
    const [shots, setShots] = useState<ScriptShot[]>([])

    const [isEnhancing, setIsEnhancing] = useState(false)
    const [isDeconstructing, setIsDeconstructing] = useState(false)

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
            }
        } catch (err) {
            console.error("Deconstruct failed:", err)
        } finally {
            setIsDeconstructing(false)
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

            <div className="grid gap-6 lg:grid-cols-2 flex-1 min-h-0">
                {/* Left Column: Input and Script Editing */}
                <div className="flex flex-col gap-4 overflow-hidden">
                    {/* Step 1: Prompt Input */}
                    <div className="flex flex-col gap-3 p-5 rounded-2xl border bg-card/50 shadow-sm backdrop-blur-xl">
                        <Label htmlFor="script-prompt" className="text-base font-semibold text-foreground flex items-center gap-2">
                            <Wand2 className="h-4 w-4 text-purple-500" />
                            1. 提供创意主题或草稿
                        </Label>
                        <Textarea
                            id="script-prompt"
                            placeholder="例如：一个关于时间旅行的科幻武侠故事，主角在明朝发现了一台时光机..."
                            className="resize-none min-h-[100px] border-muted bg-background/50 focus-visible:ring-purple-500/30 text-sm leading-relaxed"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        <div className="flex justify-end">
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
                        <div className="flex items-center justify-between">
                            <Label htmlFor="script-editor" className="text-base font-semibold text-foreground flex items-center gap-2">
                                <LayoutList className="h-4 w-4 text-blue-500" />
                                2. 剧本内容 (可修改)
                            </Label>
                        </div>
                        <Textarea
                            id="script-editor"
                            placeholder="生成的剧本将显示在这里，您可以直接修改..."
                            className="resize-none flex-1 border-muted bg-background/50 focus-visible:ring-blue-500/30 text-sm leading-relaxed p-4 font-medium"
                            value={script}
                            onChange={(e) => setScript(e.target.value)}
                        />
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-muted-foreground">{script.length} 字</span>
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

                {/* Right Column: Deconstructed Shots */}
                <div className="flex flex-col gap-4 overflow-hidden rounded-2xl border bg-card/30 shadow-sm backdrop-blur-sm p-1">
                    <div className="p-4 border-b bg-muted/20 flex items-center gap-2 rounded-t-2xl">
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
