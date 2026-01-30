"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import {
  Layers,
  FolderOpen,
  Archive,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Video,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export type TabType = "workbench" | "image-studio" | "media-vault" | "output-archive"

interface AppSidebarProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  mediaCount?: number
  outputCount?: number
}

const navItems = [
  {
    id: "workbench" as TabType,
    label: "Workbench",
    icon: Layers,
    description: "AI Video Creation Engine",
  },
  {
    id: "image-studio" as TabType,
    label: "Image Studio",
    icon: Sparkles,
    description: "Advanced AI Image Generation",
  },
  {
    id: "media-vault" as TabType,
    label: "Media Vault",
    icon: FolderOpen,
    description: "Generated & Uploaded Assets",
  },
  {
    id: "output-archive" as TabType,
    label: "Output Archive",
    icon: Archive,
    description: "Export History & Downloads",
  },
]

export function AppSidebar({
  activeTab,
  onTabChange,
  mediaCount = 0,
  outputCount = 0,
}: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const getCount = (id: TabType) => {
    if (id === "media-vault") return mediaCount
    if (id === "output-archive") return outputCount
    return 0
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300",
          isCollapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo Header */}
        <div className="flex h-14 items-center border-b border-sidebar-border px-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Video className="h-4 w-4 text-primary-foreground" />
            </div>
            {!isCollapsed && (
              <span className="text-base font-semibold text-sidebar-foreground">
                ClipForge
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const count = getCount(item.id)
            const isActive = activeTab === item.id

            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        {count > 0 && (
                          <Badge
                            variant="secondary"
                            className="h-5 min-w-5 justify-center px-1.5 text-[10px]"
                          >
                            {count}
                          </Badge>
                        )}
                      </>
                    )}
                    {isCollapsed && count > 0 && (
                      <Badge
                        variant="secondary"
                        className="absolute right-1 top-1 h-4 min-w-4 justify-center px-1 text-[9px]"
                      >
                        {count}
                      </Badge>
                    )}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className="space-y-1 border-t border-sidebar-border p-2">
          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={toggleTheme}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 shrink-0" />
                ) : (
                  <Sun className="h-5 w-5 shrink-0" />
                )}
                {!isCollapsed && (
                  <span className="flex-1 text-left">
                    {theme === "dark" ? "Eclipse Mode" : "Solstice Mode"}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                {theme === "dark" ? "Eclipse Mode (Dark)" : "Solstice Mode (Light)"}
              </TooltipContent>
            )}
          </Tooltip>

          {/* Collapse Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full justify-start gap-3 px-3 py-2.5 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left text-sm font-medium">Collapse</span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
