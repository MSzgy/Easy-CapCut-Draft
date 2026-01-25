"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Video, Settings, HelpCircle, Save, Loader2, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

export function EditorHeader() {
  const [isSaving, setIsSaving] = useState(false)
  const { theme, setTheme } = useTheme()

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => setIsSaving(false), 1500)
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Video className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground">ClipForge</span>
        </div>
        <div className="h-6 w-px bg-border" />
        <span className="text-sm text-muted-foreground">Untitled Project</span>
        <Badge variant="secondary" className="text-[10px]">
          {theme === "dark" ? "Pro Dark Mode" : "Light Mode"}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={toggleTheme}
          title={theme === "dark" ? "Switch to Light Mode (Day)" : "Switch to Pro Dark Mode (Night)"}
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-4 w-4" />
              <span className="hidden text-xs sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="h-4 w-4" />
              <span className="hidden text-xs sm:inline">Dark Mode</span>
            </>
          )}
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Save"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Project Settings</DropdownMenuItem>
            <DropdownMenuItem>Export Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Keyboard Shortcuts</DropdownMenuItem>
            <DropdownMenuItem>Preferences</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
