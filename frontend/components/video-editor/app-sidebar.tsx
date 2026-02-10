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
  Settings,
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

export type TabType = "workbench" | "image-studio" | "video-studio" | "media-vault" | "output-archive" | "configuration"

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
    id: "video-studio" as TabType,
    label: "Video Studio",
    icon: Video,
    description: "AI Video Generation from Images",
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
  {
    id: "configuration" as TabType,
    label: "Configuration",
    icon: Settings,
    description: "Global settings & preferences",
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
          "flex border-border bg-sidebar transition-all duration-300",
          // Mobile: Bottom Navigation
          "h-16 w-full flex-row items-center justify-around border-t px-2",
          // Desktop: Sidebar
          "lg:flex-col lg:border-r lg:border-t-0 lg:h-full",
          isCollapsed ? "lg:w-16" : "lg:w-56"
        )}
      >
        {/* Logo Header - Desktop Only */}
        <div className="hidden h-14 items-center border-b border-sidebar-border px-3 lg:flex">
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
        <nav className="flex flex-1 justify-around lg:block lg:space-y-1 lg:p-2">
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
                      "group flex items-center justify-center rounded-lg transition-all",
                      // Mobile styles
                      "flex-col gap-1 p-1 text-[10px]",
                      isActive ? "text-primary" : "text-muted-foreground",
                      // Desktop styles
                      "lg:flex-row lg:w-full lg:gap-3 lg:px-3 lg:py-2.5 lg:text-sm lg:font-medium",
                      isActive
                        ? "lg:bg-sidebar-accent lg:text-sidebar-accent-foreground"
                        : "lg:text-sidebar-foreground/70 lg:hover:bg-sidebar-accent/50 lg:hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />

                    {/* Label - Mobile (always show small) / Desktop (show if not collapsed) */}
                    <span className={cn(
                      "lg:text-left",
                      isCollapsed ? "lg:hidden" : "lg:flex-1"
                    )}>
                      {item.label}
                    </span>

                    {/* Count Badges */}
                    {!isCollapsed && count > 0 && (
                      <Badge
                        variant="secondary"
                        className="hidden lg:flex h-5 min-w-5 justify-center px-1.5 text-[10px]"
                      >
                        {count}
                      </Badge>
                    )}

                    {/* Collapsed Sidebar Badge (Desktop only) */}
                    {isCollapsed && count > 0 && (
                      <Badge
                        variant="secondary"
                        className="absolute right-1 top-1 hidden lg:flex h-4 min-w-4 justify-center px-1 text-[9px]"
                      >
                        {count}
                      </Badge>
                    )}

                    {/* Mobile Dot Badge for count */}
                    {count > 0 && (
                      <div className="absolute top-2 right-1/4 h-2 w-2 rounded-full bg-primary lg:hidden" />
                    )}
                  </button>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="hidden lg:flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* Footer Actions - Desktop Only */}
        <div className="hidden space-y-1 border-t border-sidebar-border p-2 lg:block">
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
