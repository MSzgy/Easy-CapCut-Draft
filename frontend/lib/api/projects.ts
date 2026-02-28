/**
 * 项目持久化 API — 前端调用后端 /api/data 路由
 */
import { apiClient } from '../api-client'

// ── Types ───────────────────────────────────────────────────────────────────

export interface SceneData {
    id?: string
    timestamp?: string
    script: string
    imageUrl?: string
    imageDescription?: string
    imageMetadata?: Record<string, any>
    videoUrl?: string
    videoPrompt?: string
    duration?: number
}

export interface SaveProjectRequest {
    title?: string
    mode?: string
    prompt?: string
    sourceUrl?: string
    description?: string
    videoStyle?: string
    copyStyle?: string
    generatedCopy?: string
    coverUrl?: string
    coverStyle?: string
    combinedVideoUrl?: string
    status?: string
    modelConfig?: Record<string, string>
    characters?: Record<string, any>[]
    scenes?: SceneData[]
    projectId?: string
}

export interface ProjectScene {
    id: string
    orderIndex: number
    timestamp: string
    script: string
    imageUrl?: string
    imageDescription?: string
    imageMetadata?: Record<string, any>
    videoUrl?: string
    videoPrompt?: string
    duration: number
}

export interface ProjectData {
    id: string
    title: string
    mode?: string
    prompt?: string
    sourceUrl?: string
    description?: string
    videoStyle?: string
    copyStyle?: string
    generatedCopy?: string
    coverUrl?: string
    status?: string
    combinedVideoUrl?: string
    modelConfig?: Record<string, string>
    characters?: Record<string, any>[]
    createdAt?: string
    updatedAt?: string
    scenes: ProjectScene[]
}

export interface AudioHistoryItem {
    id: string
    url: string
    text: string
    mode: string
    voiceDescription?: string
    language?: string
    speed?: number
    createdAt?: string
}

export interface MusicHistoryItem {
    id: string
    url: string
    prompt: string
    duration?: number
    genre?: string
    mood?: string
    bpm?: number
    createdAt?: string
}

// ── API Methods ─────────────────────────────────────────────────────────────

export const projectsApi = {
    /** 保存或更新项目（含场景） */
    async saveProject(req: SaveProjectRequest): Promise<{ success: boolean; project: ProjectData }> {
        return apiClient.post('/data/projects', req, { timeoutMs: 30_000 })
    },

    /** 列出所有项目 */
    async listProjects(): Promise<{ success: boolean; projects: ProjectData[] }> {
        return apiClient.get('/data/projects')
    },

    /** 获取最新项目（启动恢复） */
    async getLatestProject(): Promise<{ success: boolean; project: ProjectData | null }> {
        return apiClient.get('/data/projects/latest')
    },

    /** 获取单个项目 */
    async getProject(id: string): Promise<{ success: boolean; project: ProjectData }> {
        return apiClient.get(`/data/projects/${id}`)
    },

    /** 删除项目 */
    async deleteProject(id: string): Promise<{ success: boolean }> {
        return apiClient.delete(`/data/projects/${id}`)
    },

    /** 语音生成历史 */
    async getAudioHistory(): Promise<{ success: boolean; items: AudioHistoryItem[] }> {
        return apiClient.get('/data/history/audio')
    },

    /** 音乐生成历史 */
    async getMusicHistory(): Promise<{ success: boolean; items: MusicHistoryItem[] }> {
        return apiClient.get('/data/history/music')
    },
}
