"use client"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Badge } from "@/components/ui/badge"
import { Settings, Cpu, Sparkles } from "lucide-react"

interface ConfigPageProps {
    provider: "gemini" | "huggingface"
    setProvider: (provider: "gemini" | "huggingface") => void
}

export function ConfigPage({ provider, setProvider }: ConfigPageProps) {
    return (
        <div className="flex h-full flex-col gap-6 p-6 overflow-auto">
            <div className="flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
            </div>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>AI Model Provider</CardTitle>
                        <CardDescription>
                            Select the AI provider to use for image generation tasks.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        <RadioGroup
                            defaultValue={provider}
                            onValueChange={(value) => setProvider(value as "gemini" | "huggingface")}
                            className="grid grid-cols-1 md:grid-cols-2 gap-4"
                        >
                            <div>
                                <RadioGroupItem value="gemini" id="gemini" className="peer sr-only" />
                                <Label
                                    htmlFor="gemini"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                >
                                    <Sparkles className="mb-3 h-6 w-6" />
                                    <div className="mb-2 font-bold">Google Gemini</div>
                                    <div className="text-xs text-center text-muted-foreground">
                                        High quality, fast generation with advanced understanding.
                                    </div>
                                </Label>
                            </div>

                            <div>
                                <RadioGroupItem value="huggingface" id="huggingface" className="peer sr-only" />
                                <Label
                                    htmlFor="huggingface"
                                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                >
                                    <Cpu className="mb-3 h-6 w-6" />
                                    <div className="mb-2 font-bold">Hugging Face</div>
                                    <div className="text-xs text-center text-muted-foreground">
                                        Open source models, good for specific styles and control.
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* Future configurations can go here */}
            </div>
        </div>
    )
}
