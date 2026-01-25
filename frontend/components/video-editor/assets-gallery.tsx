"use client"

import { useState } from "react"
import { Film, ImageIcon, Music, FileText, Play, MoreVertical, Trash2, Download, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

type AssetType = "video" | "image" | "audio" | "text"

interface Asset {
  id: string
  name: string
  type: AssetType
  duration?: string
  size: string
  thumbnail?: string
  addedAt: string
}

const mockAssets: Asset[] = [
  {
    id: "1",
    name: "intro-footage.mp4",
    type: "video",
    duration: "0:45",
    size: "124 MB",
    addedAt: "2 min ago",
  },
  {
    id: "2",
    name: "product-shot.mp4",
    type: "video",
    duration: "1:20",
    size: "256 MB",
    addedAt: "5 min ago",
  },
  {
    id: "3",
    name: "background-music.mp3",
    type: "audio",
    duration: "3:45",
    size: "8 MB",
    addedAt: "10 min ago",
  },
  {
    id: "4",
    name: "logo.png",
    type: "image",
    size: "2 MB",
    addedAt: "15 min ago",
  },
  {
    id: "5",
    name: "outro-clip.mp4",
    type: "video",
    duration: "0:15",
    size: "45 MB",
    addedAt: "20 min ago",
  },
  {
    id: "6",
    name: "voiceover.mp3",
    type: "audio",
    duration: "2:30",
    size: "5 MB",
    addedAt: "25 min ago",
  },
]

const typeConfig: Record<AssetType, { icon: typeof Film; color: string; bg: string }> = {
  video: { icon: Film, color: "text-primary", bg: "bg-primary/20" },
  image: { icon: ImageIcon, color: "text-blue-400", bg: "bg-blue-400/20" },
  audio: { icon: Music, color: "text-amber-400", bg: "bg-amber-400/20" },
  text: { icon: FileText, color: "text-purple-400", bg: "bg-purple-400/20" },
}

export function AssetsGallery() {
  const [assets, setAssets] = useState<Asset[]>(mockAssets)
  const [filter, setFilter] = useState<AssetType | "all">("all")

  const filteredAssets = filter === "all" ? assets : assets.filter((a) => a.type === filter)

  const removeAsset = (id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id))
  }

  const filterOptions: { value: AssetType | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "video", label: "Video" },
    { value: "image", label: "Image" },
    { value: "audio", label: "Audio" },
  ]

  return (
    <Card className="flex h-full flex-col border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border p-3">
        {filterOptions.map((option) => (
          <Button
            key={option.value}
            variant={filter === option.value ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
        <Badge variant="secondary" className="ml-auto text-xs">
          {filteredAssets.length} items
        </Badge>
      </div>
      <CardContent className="flex-1 overflow-auto p-3">
        {filteredAssets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Film className="mb-2 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No assets found</p>
            <p className="text-xs text-muted-foreground">Upload files to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {filteredAssets.map((asset) => {
              const config = typeConfig[asset.type]
              const Icon = config.icon
              return (
                <div
                  key={asset.id}
                  className="group flex items-center gap-3 rounded-lg bg-secondary p-2.5 transition-colors hover:bg-accent"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${config.bg}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {asset.duration && <span>{asset.duration}</span>}
                      <span>{asset.size}</span>
                      <span className="text-muted-foreground/60">{asset.addedAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {asset.type === "video" && (
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <Play className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => removeAsset(asset.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
