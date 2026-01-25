"use client"

import { useState } from "react"
import { Upload, FolderOpen, Globe } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUploader } from "./file-uploader"
import { AssetsGallery } from "./assets-gallery"
import { UrlScriptGenerator, type GeneratedContent } from "./url-script-generator"
import { AIScriptEditor } from "./ai-script-editor"

export function LeftPanel() {
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)

  const handleContentGenerated = (content: GeneratedContent) => {
    setGeneratedContent(content)
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <Tabs defaultValue="upload" className="flex flex-1 flex-col">
        <TabsList className="grid w-full grid-cols-3 bg-secondary">
          <TabsTrigger value="upload" className="flex items-center gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="assets" className="flex items-center gap-1.5 text-xs">
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Assets</span>
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">URL</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="mt-3 flex-1 data-[state=inactive]:hidden">
          <FileUploader />
        </TabsContent>
        <TabsContent value="assets" className="mt-3 flex-1 data-[state=inactive]:hidden">
          <AssetsGallery />
        </TabsContent>
        <TabsContent value="url" className="mt-3 flex-1 data-[state=inactive]:hidden">
          <UrlScriptGenerator onContentGenerated={handleContentGenerated} />
        </TabsContent>
      </Tabs>
      
      <div className="flex-1">
        <AIScriptEditor initialScript={generatedContent?.script} />
      </div>
    </div>
  )
}
