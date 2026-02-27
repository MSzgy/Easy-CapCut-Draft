import { apiClient } from '../api-client'
import type { MediaAsset } from "@/components/video-editor/media-vault"

export interface MediaCreate {
    id: string
    type: "image" | "video" | "audio"
    name: string
    url: string
    createdAt?: string
    sceneUsedIn?: string
    aiPrompt?: string
    size?: string
    projectId?: string
}

export const mediaApi = {
    /** 获取素材列表 */
    listMedia: async (projectId?: string): Promise<{ success: boolean; assets: MediaAsset[] }> => {
        let url = '/media'
        if (projectId) {
            url += `?projectId=${projectId}`
        }
        return apiClient.get(url)
    },

    /** 批量保存素材 */
    saveMediaBatch: async (assets: MediaCreate[]): Promise<{ success: boolean; saved_count: number; ids: string[] }> => {
        return apiClient.post('/media/batch', { assets })
    },

    /** 删除素材 */
    deleteMedia: async (mediaId: string): Promise<{ success: boolean }> => {
        return apiClient.delete(`/media/${mediaId}`)
    }
}
