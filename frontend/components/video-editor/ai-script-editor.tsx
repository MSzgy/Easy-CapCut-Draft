"use client"

import { useState, useEffect } from "react"
import { Sparkles, Wand2, Copy, Check, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

const sampleScripts = [
  `[INTRO - 0:00]
Hook: "You won't believe what happens next..."
B-Roll: City timelapse transition

[SCENE 1 - 0:05]
Narrator: "In this video, we'll explore..."
Cut to: Main presenter on camera

[SCENE 2 - 0:30]
Key point with text overlay
Add: Zoom effect + Sound FX`,
  `[COLD OPEN]
Quick montage of best moments
Duration: 3 seconds max

[TITLE CARD]
Animated logo reveal
Music: Upbeat intro track

[MAIN CONTENT]
Topic introduction
"Today we're diving into..."
Add: Lower third with name`,
]

interface AIScriptEditorProps {
  initialScript?: string
}

export function AIScriptEditor({ initialScript }: AIScriptEditorProps) {
  const [script, setScript] = useState(initialScript || sampleScripts[0])
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (initialScript) {
      setScript(initialScript)
    }
  }, [initialScript])

  const generateScript = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setScript(sampleScripts[Math.floor(Math.random() * sampleScripts.length)])
      setIsGenerating(false)
    }, 1500)
  }

  const copyScript = () => {
    navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="flex flex-col border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Script Editor
            <Badge variant="secondary" className="ml-1 text-[10px] font-normal">
              Beta
            </Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={copyScript}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={generateScript}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isGenerating ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Your video script will appear here..."
          className="min-h-[200px] flex-1 resize-none bg-secondary font-mono text-xs leading-relaxed"
        />
        <Button
          onClick={generateScript}
          disabled={isGenerating}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isGenerating ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Generating...
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
  )
}
