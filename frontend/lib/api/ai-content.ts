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
  styleKeywords?: string[]
  url?: string
  copyStyle?: string
  generateImages?: boolean
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
  styleKeywords?: string[]
  prompt?: string
  negativePrompt?: string
  theme?: string
  size?: string
  resolution?: string
  // Phase 2 & 3: 高级功能
  mode?: 'text-to-image' | 'image-to-image' | 'style-mix' | 'style-transfer' | 'sketch-to-image' | 'face-portrait' | 'background-removal' | 'background-replacement' | 'storyboard'
  referenceImage?: string // base64
  denoisingStrength?: number
  preserveComposition?: boolean
  styleWeights?: { [styleId: string]: number }
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

  /**
   * 优化提示词
   */
  async optimizePrompt(prompt: string): Promise<{
    success: boolean
    message: string
    optimized: string
    suggestions: string[]
  }> {
    try {
      return await apiClient.post('/ai/optimize-prompt', { prompt })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to optimize prompt')
    }
  },

  /**
   * 风格迁移
   */
  async styleTransfer(
    image: string,
    artStyle: string,
    intensity: number = 0.8,
    prompt?: string
  ): Promise<{
    success: boolean
    message: string
    imageUrl: string
  }> {
    try {
      return await apiClient.post('/ai/style-transfer', {
        image,
        artStyle,
        intensity,
        prompt,
      })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to transfer style')
    }
  },

  /**
   * 草图转图片
   */
  async sketchToImage(
    sketch: string,
    prompt: string,
    style: string = 'photorealistic'
  ): Promise<{
    success: boolean
    message: string
    imageUrl: string
  }> {
    try {
      return await apiClient.post('/ai/sketch-to-image', {
        sketch,
        prompt,
        style,
      })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to convert sketch')
    }
  },

  /**
   * AI写真生成
   */
  async facePortrait(
    faceImage: string,
    scenePrompt: string,
    style: string = 'photorealistic',
    preserveFace: number = 0.3
  ): Promise<{
    success: boolean
    message: string
    imageUrl: string
  }> {
    try {
      return await apiClient.post('/ai/face-portrait', {
        faceImage,
        scenePrompt,
        style,
        preserveFace,
      })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to generate face portrait')
    }
  },

  /**
   * 人脸融合
   */
  async faceSwap(
    faceImage: string,
    targetImage: string,
    blendStrength: number = 0.7
  ): Promise<{
    success: boolean
    message: string
    imageUrl: string
  }> {
    try {
      return await apiClient.post('/ai/face-swap', {
        faceImage,
        targetImage,
        blendStrength,
      })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to swap face')
    }
  },

  // /**
  //  * 生成贴纸
  //  */
  // async generateSticker(
  //   prompt: string,
  //   style: 'cartoon' | 'pixel' | '3d' | 'hand-drawn' = 'cartoon',
  //   removeBackground: boolean = true
  // ): Promise<{
  //   success: boolean
  //   message: string
  //   imageUrl: string
  // }> {
  //   try {
  //     return await apiClient.post('/ai/generate-sticker', {
  //       prompt,
  //       style,
  //       removeBackground,
  //     })
  //   } catch (error) {
  //     const apiError = error as ApiError
  //     throw new Error(apiError.detail || 'Failed to generate sticker')
  //   }
  // },

  /**
   * 智能抠图 - 移除背景
   */
  async removeBackground(
    image: string,
    subject: 'person' | 'object' | 'auto' = 'auto',
    refineEdges: boolean = true
  ): Promise<{
    success: boolean
    message: string
    imageUrl: string
  }> {
    try {
      return await apiClient.post('/ai/remove-background', {
        image,
        subject,
        refineEdges,
      })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to remove background')
    }
  },

  /**
   * 背景替换
   */
  async replaceBackground(
    image: string,
    backgroundScene: 'office' | 'nature' | 'tech' | 'fantasy' | 'solid' | 'blur' = 'nature',
    customPrompt?: string,
    backgroundColor?: string,
    matchLighting: boolean = true,
    addDepth: boolean = true
  ): Promise<{
    success: boolean
    message: string
    imageUrl: string
  }> {
    try {
      return await apiClient.post('/ai/replace-background', {
        image,
        backgroundScene,
        customPrompt,
        backgroundColor,
        matchLighting,
        addDepth,
      })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to replace background')
    }
  },

  /**
   * 生成故事板
   */
  async generateStoryboard(
    storyPrompt: string,
    characterImage?: string,
    numFrames: number = 6,
    style: string = 'photorealistic',
    shotTypes?: string[]
  ): Promise<{
    success: boolean
    message: string
    frames: Array<{
      frameNumber: number
      imageUrl: string
      description: string
      shotType: string
    }>
  }> {
    try {
      return await apiClient.post('/ai/generate-storyboard', {
        storyPrompt,
        characterImage,
        numFrames,
        style,
        shotTypes,
      })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to generate storyboard')
    }
  },
}
