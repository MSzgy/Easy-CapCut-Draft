// AI内容生成相关的API服务

import { apiClient, ApiError } from '../api-client'

export interface SceneContent {
  id: string
  timestamp: string
  script: string
  imageUrl: string
  imageDescription: string
}

export interface GenerateContentRequest {
  mode: 'upload' | 'prompt' | 'url'
  prompt?: string
  videoStyle?: string
  url?: string
  copyStyle?: string
  uploadedAssets?: Array<{
    id: string
    name: string
    type: string
    size: string
    content?: string // Base64 content for images
  }>
}

export interface GenerateContentResponse {
  success: boolean
  message: string
  scenes: SceneContent[]
  coverUrl?: string
  copy?: string
}

export interface GenerateCoverRequest {
  style: string
  prompt?: string
  theme?: string
  size?: string
  resolution?: string
}

export interface GenerateCoverResponse {
  success: boolean
  message: string
  coverUrl: string
}

export const aiContentApi = {
  /**
   * 生成AI内容（场景和脚本）
   */
  async generateContent(
    request: GenerateContentRequest
  ): Promise<GenerateContentResponse> {
    try {
      return await apiClient.post<GenerateContentResponse>(
        '/ai/generate',
        request
      )
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to generate content')
    }
  },

  /**
   * 生成AI封面
   */
  async generateCover(
    request: GenerateCoverRequest
  ): Promise<GenerateCoverResponse> {
    try {
      return await apiClient.post<GenerateCoverResponse>(
        '/ai/generate-cover',
        request
      )
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to generate cover')
    }
  },

  /**
   * 测试AI服务连接
   */
  async testAiConnection(prompt: string = '你好'): Promise<{ success: boolean; ai_response: string }> {
    try {
      return await apiClient.post('/test/ai', { prompt })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'AI service connection failed')
    }
  },
}
