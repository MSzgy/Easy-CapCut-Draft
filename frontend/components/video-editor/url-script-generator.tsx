"use client"

import { useState } from "react"
import { Globe, Wand2, Copy, Check, RefreshCw, ExternalLink, AlertCircle, ImageIcon, FileText, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export interface GeneratedContent {
  script: string
  images: { id: string; url: string; description: string; timestamp: string }[]
}

const generatedContents: Record<string, GeneratedContent> = {
  promo: {
    script: `[HOOK - 0:00]
"Discover the future of productivity..."
Visual: Dynamic website showcase

[INTRO - 0:03]
"This platform is changing the game"
Text overlay: Key headline from site
Transition: Smooth zoom in

[FEATURES - 0:10]
"Here's what makes it special:"
- Feature 1 with icon animation
- Feature 2 with demo clip
- Feature 3 with testimonial

[CTA - 0:25]
"Ready to get started?"
Show: Pricing/signup button
Add: Urgency text overlay

[OUTRO - 0:30]
Logo animation
"Link in description"`,
    images: [
      { id: "1", url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop", description: "Hero section screenshot", timestamp: "0:00" },
      { id: "2", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop", description: "Features showcase", timestamp: "0:10" },
      { id: "3", url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop", description: "Call to action section", timestamp: "0:25" },
    ],
  },
  tutorial: {
    script: `[INTRO - 0:00]
"Let me show you how this works..."
Screen recording: Homepage

[STEP 1 - 0:05]
"First, navigate to the main page"
Highlight: Navigation elements
Voiceover: Explain key sections

[STEP 2 - 0:15]
"Next, explore the features"
Demo: Click through interface
Add: Zoom effects on buttons

[STEP 3 - 0:30]
"Here's the best part..."
Showcase: Core functionality
Text: Key benefits overlay

[SUMMARY - 0:45]
Recap main points
"That's all you need to know!"
Subscribe CTA`,
    images: [
      { id: "1", url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop", description: "Homepage overview", timestamp: "0:00" },
      { id: "2", url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop", description: "Step 1 - Navigation", timestamp: "0:05" },
      { id: "3", url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=300&fit=crop", description: "Step 2 - Features", timestamp: "0:15" },
      { id: "4", url: "https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&h=300&fit=crop", description: "Step 3 - Core function", timestamp: "0:30" },
    ],
  },
  review: {
    script: `[COLD OPEN - 0:00]
"Is this worth your time? Let's find out."
Quick montage: Site screenshots

[OVERVIEW - 0:05]
"Here's what we're looking at today"
Show: Homepage full view
Highlight: Key elements

[PROS - 0:20]
"What I love about this:"
- Pro 1 with visual
- Pro 2 with demo
- Pro 3 with comparison

[CONS - 0:40]
"Some things to consider:"
- Con 1 explanation
- Con 2 with context

[VERDICT - 0:55]
Star rating animation
"My recommendation is..."
Final thoughts + CTA`,
    images: [
      { id: "1", url: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=400&h=300&fit=crop", description: "Product overview", timestamp: "0:00" },
      { id: "2", url: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?w=400&h=300&fit=crop", description: "Pros highlight", timestamp: "0:20" },
      { id: "3", url: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=400&h=300&fit=crop", description: "Cons analysis", timestamp: "0:40" },
    ],
  },
}

interface UrlScriptGeneratorProps {
  onContentGenerated?: (content: GeneratedContent) => void
}

export function UrlScriptGenerator({ onContentGenerated }: UrlScriptGeneratorProps) {
  const [url, setUrl] = useState("")
  const [scriptType, setScriptType] = useState("promo")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [isScriptOpen, setIsScriptOpen] = useState(true)
  const [isImagesOpen, setIsImagesOpen] = useState(true)

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch {
      return false
    }
  }

  const analyzeAndGenerate = () => {
    if (!url.trim()) {
      setError("Please enter a URL")
      return
    }
    if (!isValidUrl(url)) {
      setError("Please enter a valid URL (e.g., https://example.com)")
      return
    }
    setError("")
    setIsAnalyzing(true)
    
    setTimeout(() => {
      const content = generatedContents[scriptType] || generatedContents.promo
      setGeneratedContent(content)
      setIsAnalyzing(false)
      onContentGenerated?.(content)
    }, 2000)
  }

  const copyScript = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent.script)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const regenerate = () => {
    if (generatedContent) {
      analyzeAndGenerate()
    }
  }

  return (
    <Card className="flex h-full flex-col border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          URL to Script
          <Badge variant="secondary" className="ml-1 text-[10px] font-normal">
            AI
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 overflow-auto">
        <div className="space-y-2">
          <Label htmlFor="url" className="text-xs text-muted-foreground">
            Website URL
          </Label>
          <div className="relative">
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value)
                setError("")
              }}
              className={`bg-secondary pr-10 ${error ? "border-destructive" : ""}`}
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
          {error && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {error}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="script-type" className="text-xs text-muted-foreground">
            Script Type
          </Label>
          <Select value={scriptType} onValueChange={setScriptType}>
            <SelectTrigger id="script-type" className="bg-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="promo">Promotional Video</SelectItem>
              <SelectItem value="tutorial">Tutorial / How-to</SelectItem>
              <SelectItem value="review">Review / Analysis</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={analyzeAndGenerate}
          disabled={isAnalyzing}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Analyzing website...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate Script & Images
            </>
          )}
        </Button>

        {generatedContent && (
          <div className="flex flex-1 flex-col gap-3">
            {/* Script Section */}
            <Collapsible open={isScriptOpen} onOpenChange={setIsScriptOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex cursor-pointer items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">Generated Script</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyScript()
                      }}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-primary" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        regenerate()
                      }}
                      disabled={isAnalyzing}
                    >
                      <RefreshCw className={`h-3 w-3 text-muted-foreground ${isAnalyzing ? "animate-spin" : ""}`} />
                    </Button>
                    {isScriptOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Textarea
                  value={generatedContent.script}
                  onChange={(e) => setGeneratedContent({ ...generatedContent, script: e.target.value })}
                  className="mt-2 min-h-[150px] resize-none bg-secondary font-mono text-xs leading-relaxed"
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Images Section */}
            <Collapsible open={isImagesOpen} onOpenChange={setIsImagesOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex cursor-pointer items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-foreground">Generated Images</span>
                    <Badge variant="outline" className="ml-1 text-[10px]">
                      {generatedContent.images.length}
                    </Badge>
                  </div>
                  {isImagesOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {generatedContent.images.map((image) => (
                    <div key={image.id} className="group relative overflow-hidden rounded-md border border-border">
                      <img
                        src={image.url || "/placeholder.svg"}
                        alt={image.description}
                        className="aspect-video w-full object-cover"
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="text-[10px] font-medium text-white">{image.description}</p>
                        <p className="text-[9px] text-white/70">{image.timestamp}</p>
                      </div>
                      <div className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                        {image.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {!generatedContent && (
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border p-4 text-center">
            <Globe className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Enter a URL above</p>
            <p className="text-xs text-muted-foreground">
              AI will analyze the website and generate script with images
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
