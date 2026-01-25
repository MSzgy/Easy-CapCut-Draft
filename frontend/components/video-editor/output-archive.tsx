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

export interface OutputRecord {
  id: string
  name: string
  type: "json" | "video"
  status: "rendered" | "json-only" | "failed" | "processing"
  createdAt: string
  duration?: string
  fileSize: string
  scenes: number
}

interface OutputArchiveProps {
  records: OutputRecord[]
  onDownload?: (record: OutputRecord) => void
  onReEdit?: (record: OutputRecord) => void
  onDelete?: (id: string) => void
}

const sampleRecords: OutputRecord[] = [
  {
    id: "1",
    name: "Product Launch Video",
    type: "video",
    status: "rendered",
    createdAt: "2024-01-25 14:32",
    duration: "0:45",
    fileSize: "128 MB",
    scenes: 5,
  },
  {
    id: "2",
    name: "Tech Review Draft",
    type: "json",
    status: "json-only",
    createdAt: "2024-01-25 12:15",
    fileSize: "24 KB",
    scenes: 8,
  },
  {
    id: "3",
    name: "Tutorial Series - Ep1",
    type: "video",
    status: "rendered",
    createdAt: "2024-01-24 18:45",
    duration: "2:30",
    fileSize: "342 MB",
    scenes: 12,
  },
  {
    id: "4",
    name: "Social Media Ad",
    type: "video",
    status: "failed",
    createdAt: "2024-01-24 15:22",
    duration: "0:15",
    fileSize: "-",
    scenes: 3,
  },
  {
    id: "5",
    name: "Company Intro",
    type: "json",
    status: "json-only",
    createdAt: "2024-01-23 09:10",
    fileSize: "18 KB",
    scenes: 4,
  },
  {
    id: "6",
    name: "Feature Highlight",
    type: "video",
    status: "processing",
    createdAt: "2024-01-25 15:00",
    duration: "1:00",
    fileSize: "-",
    scenes: 6,
  },
]

export function OutputArchive({
  records = sampleRecords,
  onDownload,
  onReEdit,
  onDelete,
}: OutputArchiveProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredRecords = records.filter((record) =>
    record.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: OutputRecord["status"]) => {
    switch (status) {
      case "rendered":
        return (
          <Badge className="bg-green-500/10 text-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Rendered
          </Badge>
        )
      case "json-only":
        return (
          <Badge className="bg-blue-500/10 text-blue-500">
            <FileJson className="mr-1 h-3 w-3" />
            JSON Only
          </Badge>
        )
      case "failed":
        return (
          <Badge className="bg-red-500/10 text-red-500">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        )
      case "processing":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-500">
            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        )
      default:
        return null
    }
  }

  const getTypeIcon = (type: "json" | "video") => {
    if (type === "video") {
      return <Video className="h-4 w-4 text-primary" />
    }
    return <FileJson className="h-4 w-4 text-blue-500" />
  }

  return (
    <div className="flex h-full flex-col">
      <Card className="flex flex-1 flex-col border-border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Archive className="h-5 w-5 text-primary" />
            Output Archive
            <Badge variant="outline" className="ml-2 text-xs">
              {records.length} Exports
            </Badge>
          </CardTitle>

          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search exports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-secondary pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-auto p-4 pt-0">
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%]">Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getTypeIcon(record.type)}
                        <div>
                          <p className="font-medium text-foreground">{record.name}</p>
                          <p className="text-xs text-muted-foreground">{record.scenes} scenes</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell>
                      {record.duration ? (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {record.duration}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{record.fileSize}</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {record.createdAt}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {record.status !== "failed" && record.status !== "processing" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => onDownload?.(record)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onReEdit?.(record)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              Preview
                            </DropdownMenuItem>
                            {record.type === "video" && (
                              <DropdownMenuItem>
                                <FileJson className="mr-2 h-4 w-4" />
                                Download JSON
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => onDelete?.(record.id)}
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

          {filteredRecords.length === 0 && (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <Archive className="mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No exports found</p>
              <p className="text-xs text-muted-foreground">Create your first video to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
