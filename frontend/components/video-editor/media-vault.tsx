"use client"

import { useState } from "react"
import {
  ImageIcon,
  FileVideo,
  FileAudio,
  Search,
  Filter,
  Calendar,
  Sparkles,
  MoreHorizontal,
  Download,
  Trash2,
  Eye,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface MediaAsset {
  id: string
  name: string
  type: "image" | "video" | "audio"
  url: string
  thumbnail?: string
  createdAt: string
  sceneUsedIn?: string
  aiPrompt?: string
  size: string
}

interface MediaVaultProps {
  assets: MediaAsset[]
  onDeleteAsset?: (id: string) => void
  onPreviewAsset?: (asset: MediaAsset) => void
}

const sampleAssets: MediaAsset[] = [
  {
    id: "1",
    name: "hero-banner.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop",
    createdAt: "2024-01-25",
    sceneUsedIn: "Scene 1 - Intro",
    aiPrompt: "Professional tech product showcase, clean background",
    size: "2.4 MB",
  },
  {
    id: "2",
    name: "product-demo.mp4",
    type: "video",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop",
    createdAt: "2024-01-24",
    sceneUsedIn: "Scene 2 - Features",
    size: "24.5 MB",
  },
  {
    id: "3",
    name: "background-music.mp3",
    type: "audio",
    url: "#",
    createdAt: "2024-01-23",
    sceneUsedIn: "All Scenes",
    size: "3.2 MB",
  },
  {
    id: "4",
    name: "feature-highlight.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop",
    createdAt: "2024-01-23",
    sceneUsedIn: "Scene 3 - CTA",
    aiPrompt: "Call to action button highlight, vibrant colors",
    size: "1.8 MB",
  },
  {
    id: "5",
    name: "testimonial-bg.jpg",
    type: "image",
    url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=300&fit=crop",
    createdAt: "2024-01-22",
    aiPrompt: "Abstract gradient background for testimonials",
    size: "1.2 MB",
  },
  {
    id: "6",
    name: "intro-animation.mp4",
    type: "video",
    url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop",
    createdAt: "2024-01-22",
    sceneUsedIn: "Scene 1 - Intro",
    size: "18.7 MB",
  },
]

export function MediaVault({ assets = sampleAssets, onDeleteAsset, onPreviewAsset }: MediaVaultProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "image" | "video" | "audio">("all")

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === "all" || asset.type === filterType
    return matchesSearch && matchesType
  })

  const getTypeIcon = (type: "image" | "video" | "audio") => {
    switch (type) {
      case "video":
        return <FileVideo className="h-4 w-4 text-blue-500" />
      case "audio":
        return <FileAudio className="h-4 w-4 text-purple-500" />
      default:
        return <ImageIcon className="h-4 w-4 text-green-500" />
    }
  }

  const getTypeBadgeColor = (type: "image" | "video" | "audio") => {
    switch (type) {
      case "video":
        return "bg-blue-500/10 text-blue-500"
      case "audio":
        return "bg-purple-500/10 text-purple-500"
      default:
        return "bg-green-500/10 text-green-500"
    }
  }

  return (
    <div className="flex h-full flex-col">
      <Card className="flex flex-1 flex-col border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <ImageIcon className="h-5 w-5 text-primary" />
            Media Vault
            <Badge variant="outline" className="ml-2 text-xs">
              {assets.length} Assets
            </Badge>
          </CardTitle>

          {/* Search & Filter Bar */}
          <div className="mt-4 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary pl-9"
              />
            </div>
            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
              <SelectTrigger className="w-32 bg-secondary">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4 pt-0">
          {/* Masonry Grid */}
          <div className="columns-2 gap-4 lg:columns-3 xl:columns-4">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-border bg-secondary/30 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                {/* Thumbnail */}
                {asset.type !== "audio" ? (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <img
                      src={asset.url || "/placeholder.svg"}
                      alt={asset.name}
                      className="h-full w-full object-cover"
                      crossOrigin="anonymous"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity hover:opacity-100" />
                    <Badge
                      className={`absolute left-2 top-2 text-[10px] ${getTypeBadgeColor(asset.type)}`}
                    >
                      {asset.type.toUpperCase()}
                    </Badge>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-purple-500/20 to-purple-600/20">
                    <FileAudio className="h-12 w-12 text-purple-500/50" />
                  </div>
                )}

                {/* Info */}
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onPreviewAsset?.(asset)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDeleteAsset?.(asset.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {asset.createdAt}
                    </span>
                    <span>{asset.size}</span>
                  </div>

                  {asset.sceneUsedIn && (
                    <Badge variant="outline" className="text-[10px]">
                      {asset.sceneUsedIn}
                    </Badge>
                  )}

                  {asset.aiPrompt && (
                    <div className="flex items-start gap-1.5 rounded-md bg-primary/5 p-2">
                      <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                      <p className="line-clamp-2 text-[10px] text-muted-foreground">{asset.aiPrompt}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredAssets.length === 0 && (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <ImageIcon className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No assets found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
