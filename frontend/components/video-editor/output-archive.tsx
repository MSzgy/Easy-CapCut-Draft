"use client"

import { useState } from "react"
import {
  Archive,
  FileJson,
  Video,
  Download,
  Pencil,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MoreHorizontal,
  Trash2,
  Eye,
  RefreshCw,
  Play,
  Film,
  Layers,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface OutputScene {
  id: string
  name: string
  videoUrl: string
  prompt?: string
  thumbnail?: string
}

export interface OutputProject {
  id: string
  name: string
  status: "rendered" | "processing" | "failed" | "draft"
  mode?: string
  createdAt: string
  combinedVideoUrl?: string
  scenes: OutputScene[]
  totalDuration?: string
  totalSize?: string
  sceneCount: number
  draftPrompt?: string
  draftScript?: string
  rawShots?: any[]
}

interface OutputArchiveProps {
  projects: OutputProject[]
  onDelete?: (id: string) => void
  onImportScript?: (project: OutputProject) => void
}

const sampleProjects: OutputProject[] = [
  {
    id: "1",
    name: "Demo Project 1",
    status: "rendered",
    createdAt: "2024-02-16 10:00",
    combinedVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    totalDuration: "00:45",
    totalSize: "15 MB",
    sceneCount: 3,
    scenes: [
      {
        id: "s1",
        name: "Scene 1",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        prompt: "A beautiful sunrise",
      },
      {
        id: "s2",
        name: "Scene 2",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        prompt: "A busy city street",
      },
      {
        id: "s3",
        name: "Scene 3",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
        prompt: "A quiet forest path",
      },
    ],
  },
]

export function OutputArchive({
  projects = sampleProjects,
  onDelete,
  onImportScript,
}: OutputArchiveProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProject, setSelectedProject] = useState<OutputProject | null>(null)
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null)

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: OutputProject["status"], mode?: string) => {
    switch (status) {
      case "rendered":
        return (
          <Badge className="bg-green-500/10 text-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            渲染完成
          </Badge>
        )
      case "failed":
        return (
          <Badge className="bg-red-500/10 text-red-500">
            <XCircle className="mr-1 h-3 w-3" />
            渲染失败
          </Badge>
        )
      case "processing":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500">
            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            处理中
          </Badge>
        )
      case "draft":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Pencil className="mr-1 h-3 w-3" />
            {mode === "script" ? "剧本草稿" : "草稿"}
          </Badge>
        )
      default:
        return null
    }
  }

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="flex h-full flex-col">
      <Card className="flex flex-1 flex-col border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Archive className="h-5 w-5 text-primary" />
            Output Projects
            <Badge variant="outline" className="ml-2 text-xs">
              {projects.length} Projects
            </Badge>
          </CardTitle>

          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4 pt-0">
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table className="min-w-[600px] lg:min-w-full">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%]">Project Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scenes</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow key={project.id} className="group cursor-pointer hover:bg-muted/50" onClick={() => setSelectedProject(project)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                          <Film className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{project.name}</p>
                          <p className="text-xs text-muted-foreground">{project.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(project.status, project.mode)}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Layers className="h-3 w-3" />
                        {project.sceneCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {project.totalDuration || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {project.createdAt}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedProject(project)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {project.mode === "script" && onImportScript && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onImportScript(project)
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                导入到剧本创作
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => onDelete?.(project.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredProjects.length === 0 && (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <Archive className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No projects found</p>
              <p className="text-xs text-muted-foreground">Create your first video to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => !open && setSelectedProject(null)}>
        <DialogContent className="max-w-5xl w-full h-[85vh] p-0 flex flex-col gap-0 block overflow-hidden bg-background/95 backdrop-blur-sm border-border">
          <DialogHeader className="p-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {selectedProject?.name}
              {selectedProject && getStatusBadge(selectedProject.status, selectedProject.mode)}
            </DialogTitle>
            <DialogDescription>
              {selectedProject?.sceneCount} Scenes • {selectedProject?.totalDuration} • {selectedProject?.createdAt}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Main Player Area */}
            <div className="flex-1 bg-black/5 flex flex-col items-center justify-center p-4 min-h-[300px] border-b md:border-b-0 md:border-r border-border relative">
              {selectedProject?.status === "processing" ? (
                <div className="text-center space-y-4">
                  <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="text-muted-foreground">Processing video...</p>
                </div>
              ) : (previewVideoUrl || selectedProject?.combinedVideoUrl) ? (
                <div className="w-full h-full flex flex-col gap-2">
                  <div className="relative flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    <video
                      src={previewVideoUrl || selectedProject?.combinedVideoUrl}
                      controls
                      className="max-h-full max-w-full"
                      autoPlay={!!previewVideoUrl}
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground px-1">
                    <span className="truncate max-w-[300px]">
                      {previewVideoUrl === selectedProject?.combinedVideoUrl ? "Combined Video" : "Scene Video"}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(previewVideoUrl || selectedProject?.combinedVideoUrl!, "video.mp4")}
                    >
                      <Download className="mr-2 h-3 w-3" /> Download
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No video available to play</p>
                </div>
              )}
            </div>

            {/* Playlist Sidebar */}
            <div className="w-full md:w-80 flex flex-col bg-muted/10 h-[300px] md:h-auto">
              <div className="p-3 border-b border-border font-medium text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Project Content
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {/* Combined Video Item */}
                  {selectedProject?.combinedVideoUrl && (
                    <div
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${!previewVideoUrl || previewVideoUrl === selectedProject.combinedVideoUrl ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
                      onClick={() => setPreviewVideoUrl(selectedProject.combinedVideoUrl!)}
                    >
                      <div className="h-16 w-24 bg-black/20 rounded flex items-center justify-center shrink-0">
                        <Film className="h-6 w-6 opacity-50" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none mb-1">Combined Video</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">All scenes merged</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 opacity-50">
                        <Play className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  {/* Scene List */}
                  {selectedProject?.scenes.map((scene, index) => (
                    <div
                      key={scene.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${previewVideoUrl === scene.videoUrl ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}
                      onClick={() => setPreviewVideoUrl(scene.videoUrl)}
                    >
                      <div className="h-16 w-24 bg-black/20 rounded flex items-center justify-center shrink-0 overflow-hidden relative">
                        {scene.thumbnail ? (
                          <img src={scene.thumbnail} className="object-cover w-full h-full" alt={scene.name} />
                        ) : (
                          <Video className="h-6 w-6 opacity-50" />
                        )}
                        <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none mb-1">{scene.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{scene.prompt || "No prompt"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-border">
                <Button className="w-full" variant="outline" onClick={() => setSelectedProject(null)}>
                  Close Project
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
