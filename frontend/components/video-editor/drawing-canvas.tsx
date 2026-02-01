import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import { Eraser, Pen, Trash2, Undo2 } from 'lucide-react'

interface DrawingCanvasProps {
    onSketchChange: (sketch: string | null) => void
    width?: number
    height?: number
}

export function DrawingCanvas({ onSketchChange, width = 512, height = 512 }: DrawingCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [isDrawing, setIsDrawing] = useState(false)
    const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
    const [brushSize, setBrushSize] = useState([5])
    const [color, setColor] = useState('#000000')

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Initialize with white background
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)

        // Notify parent (empty canvas is white, not transparent)
        exportSketch()
    }, [])

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDrawing(true)
        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.beginPath()
        ctx.moveTo(x, y)
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return

        const canvas = canvasRef.current
        if (!canvas) return

        const rect = canvas.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.lineWidth = brushSize[0]

        if (tool === 'brush') {
            ctx.strokeStyle = color
        } else {
            ctx.strokeStyle = '#ffffff' // Eraser draws white
        }

        ctx.lineTo(x, y)
        ctx.stroke()
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        exportSketch()
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
        exportSketch()
    }

    const exportSketch = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Export as base64
        const dataUrl = canvas.toDataURL('image/png')
        onSketchChange(dataUrl)
    }

    return (
        <div className="space-y-3">
            {/* Drawing Tools */}
            <div className="flex items-center gap-2">
                <Button
                    size="sm"
                    variant={tool === 'brush' ? 'default' : 'outline'}
                    onClick={() => setTool('brush')}
                >
                    <Pen className="h-4 w-4" />
                </Button>
                <Button
                    size="sm"
                    variant={tool === 'eraser' ? 'default' : 'outline'}
                    onClick={() => setTool('eraser')}
                >
                    <Eraser className="h-4 w-4" />
                </Button>
                <div className="flex-1"></div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={clearCanvas}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Brush Size */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-sm">笔刷大小</Label>
                    <span className="text-sm text-muted-foreground">{brushSize[0]}px</span>
                </div>
                <Slider
                    value={brushSize}
                    onValueChange={setBrushSize}
                    min={1}
                    max={30}
                    step={1}
                />
            </div>

            {/* Color Picker (only for brush) */}
            {tool === 'brush' && (
                <div className="space-y-2">
                    <Label className="text-sm">颜色</Label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="w-12 h-8 rounded cursor-pointer"
                        />
                        <div className="flex gap-1">
                            {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00'].map((c) => (
                                <button
                                    key={c}
                                    className="w-8 h-8 rounded border-2 border-border hover:border-primary transition-colors"
                                    style={{ backgroundColor: c }}
                                    onClick={() => setColor(c)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Canvas */}
            <div className="border-2 border-dashed rounded-lg overflow-hidden">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height}
                    className="cursor-crosshair bg-white"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                />
            </div>

            <p className="text-xs text-muted-foreground">
                💡 提示：简单涂鸦即可，AI 会将草图转换为精美图片
            </p>
        </div>
    )
}
