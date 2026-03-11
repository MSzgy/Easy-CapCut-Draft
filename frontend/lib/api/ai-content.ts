// AI内容生成相关的API服务

import { apiClient, ApiError } from '../api-client'

export interface SceneContent {
  id: string
  timestamp: string
  script: string
  imageUrl: string
  imageDescription: string
  imageMetadata?: {
    description: string
    tags: string[]
    mood?: string
    color_scheme?: string
    composition?: string
    style?: string
    subjects?: string[]
    scene_type?: string
  }
  duration?: number
}

export interface GenerateContentRequest {
  mode: 'upload' | 'prompt' | 'url'
  prompt?: string
  videoStyle?: string
  styleKeywords?: string[]
  url?: string
  copyStyle?: string
  generateImages?: boolean
  numFrames?: number
  sceneDuration?: number
  styleReferenceImage?: string // Base64 style reference image for scene generation
  uploadedAssets?: Array<{
    id: string
    name: string
    type: string
    size: string
    content?: string // Base64 content for images
  }>
  textProvider?: string
  imageProvider?: string
  videoAnalysis?: string // Video analysis text from /ai/analyze-video
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
  mode?: 'text-to-image' | 'image-to-image' | 'style-mix' | 'style-transfer' | 'sketch-to-image' | 'face-portrait' | 'background-removal' | 'background-replacement' | 'storyboard' | 'transition-grid'
  referenceImage?: string // base64
  referenceImages?: string[] // 多张参考图 base64（按人物顺序）
  denoisingStrength?: number
  preserveComposition?: boolean
  styleWeights?: { [styleId: string]: number }
  provider?: string
}

export interface GenerateCoverResponse {
  success: boolean
  message: string
  coverUrl: string
}

export interface ProviderInfo {
  configured: boolean
  missing: string[]
  displayName: string
}

export interface HfSpaceInfo {
  space_id: string
  has_adapter: boolean
  capability: string  // "image" | "video"
  display_name: string
  configured: boolean
}

export interface ProviderStatus {
  text: { active: string; available: { [name: string]: ProviderInfo } }
  image: { active: string; available: { [name: string]: ProviderInfo } }
  vision: { active: string; available: { [name: string]: ProviderInfo } }
  video: { active: string; available: { [name: string]: ProviderInfo } }
  audio: { active: string; available: { [name: string]: ProviderInfo } }
  music: { active: string; available: { [name: string]: ProviderInfo } }
  hf_spaces: { [alias: string]: HfSpaceInfo }
}

/** Fine-grained model selection from the Configuration page */
export interface ModelSelection {
  textProvider: string       // "gemini" | "openai"
  imageProvider: string      // "gemini" | "hf:image_turbo" | ...
  imageToImageProvider: string // "gemini" | "hf:image_turbo" | ...
  videoProvider: string      // "hf:video_i2v" | "hf:video_wan" | ...
  audioProvider: string      // "hf:tts_qwen" | ...
  musicProvider: string      // "hf:music_gen" | ...
}

export const aiContentApi = {
  /**
   * 获取所有 provider 的配置状态
   */
  async getProviders(): Promise<ProviderStatus> {
    try {
      return await apiClient.get<ProviderStatus>('/ai/providers')
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to fetch providers')
    }
  },

  /**
   * 生成AI内容（场景和脚本）
   */
  async generateContent(
    request: GenerateContentRequest
  ): Promise<GenerateContentResponse> {
    try {
      return await apiClient.post<GenerateContentResponse>(
        '/ai/generate',
        request,
        { timeoutMs: 300_000 }
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
        request,
        { timeoutMs: 300_000 }
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
      }, { timeoutMs: 300_000 })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to generate storyboard')
    }
  },

  /**
   * 图片音频转视频
   */
  async generateVideoImageAudio(request: {
    firstFrame: string
    endFrame?: string
    prompt?: string
    duration?: number
    inputVideo?: string
    generationMode?: 'Image-to-Video' | 'Video-to-Video'
    enhancePrompt?: boolean
    seed?: number
    randomizeSeed?: boolean
    height?: number
    width?: number
    cameraLora?: string
    audioPath?: string
    videoProvider?: string
  }): Promise<{
    success: boolean
    message: string
    videoUrl: string
  }> {
    try {
      return await apiClient.post('/ai/generate-video-image-audio', request, { timeoutMs: 300_000 })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to generate video from image and audio')
    }
  },

  /**
   * 分析首尾帧图片，生成视频转场提示词
   */
  async analyzeTransition(firstFrame: string, endFrame: string): Promise<{
    success: boolean
    message: string
    transitionPrompt: string
  }> {
    try {
      return await apiClient.post('/ai/analyze-transition', {
        firstFrame,
        endFrame,
      }, { timeoutMs: 60_000 })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to analyze transition')
    }
  },

  /**
   * 拼接多个视频为一个长视频
   */
  async concatenateVideos(videoPaths: string[], options?: { crossfade?: boolean; crossfadeDuration?: number }): Promise<{
    success: boolean
    message: string
    videoUrl: string
  }> {
    try {
      return await apiClient.post('/ai/concatenate-videos', {
        videoPaths,
        crossfade: options?.crossfade ?? false,
        crossfadeDuration: options?.crossfadeDuration ?? 0.5,
      })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to concatenate videos')
    }
  },

  /**
   * 生成语音 (TTS)
   */
  async generateSpeech(request: {
    text: string
    voiceDescription?: string
    language?: string
    speed?: number
    emotion?: string
    provider?: string
    referenceAudio?: string
    referenceText?: string
  }): Promise<{
    success: boolean
    message: string
    audioUrl: string
  }> {
    try {
      return await apiClient.post('/ai/speech', request, { timeoutMs: 60_000 })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to generate speech')
    }
  },

  /**
   * 生成音乐
   */
  async generateMusic(request: {
    prompt: string
    duration?: number
    model?: string
    provider?: string
  }): Promise<{
    success: boolean
    message: string
    audioUrl: string
  }> {
    try {
      return await apiClient.post('/ai/generate-music', request, { timeoutMs: 120_000 })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to generate music')
    }
  },

  /**
   * BGM 智能推荐 - 根据视频分镜内容推荐合适的背景音乐
   */
  async recommendMusic(request: {
    scenes: Array<{ script: string; mood?: string; tags?: string[] }>
    textProvider?: string
  }): Promise<{
    success: boolean
    message: string
    recommendations: MusicRecommendation[]
  }> {
    try {
      return await apiClient.post('/ai/recommend-music', request, { timeoutMs: 60_000 })
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to recommend music')
    }
  },

  /**
   * 视频内容分析 — 上传视频文件，使用AI分析并返回文本描述
   */
  async analyzeVideo(file: File, prompt?: string): Promise<AnalyzeVideoResponse> {
    const formData = new FormData()
    formData.append('file', file)
    if (prompt) {
      formData.append('prompt', prompt)
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/proxy'
    const url = `${API_BASE_URL}/ai/analyze-video`

    let authToken: string | null = null
    if (typeof window !== 'undefined') {
      authToken = localStorage.getItem('clipforge_token')
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        // Do NOT set Content-Type — browser will set multipart/form-data with boundary
      },
      body: formData,
      signal: AbortSignal.timeout(600_000), // 10 minutes for large video uploads
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
      throw new Error(error.detail || 'Failed to analyze video')
    }

    return await response.json()
  },

  /**
   * 润色或生成完整剧本
   */
  async enhanceScript(
    prompt: string,
    provider: string = 'gemini'
  ): Promise<EnhanceScriptResponse> {
    try {
      return await apiClient.post<EnhanceScriptResponse>(
        '/ai/enhance-script',
        { prompt, provider },
        { timeoutMs: 120_000 }
      )
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to enhance script')
    }
  },

  /**
   * 拆解剧本为分镜
   */
  async deconstructScript(
    script: string,
    provider: string = 'gemini'
  ): Promise<DeconstructScriptResponse> {
    try {
      return await apiClient.post<DeconstructScriptResponse>(
        '/ai/deconstruct-script',
        { script, provider },
        { timeoutMs: 120_000 }
      )
    } catch (error) {
      const apiError = error as ApiError
      throw new Error(apiError.detail || 'Failed to deconstruct script')
    }
  }
}

export interface MusicRecommendation {
  genre: string
  mood: string
  instruments: string[]
  bpmRange: string
  prompt: string
  reason: string
}

export interface AnalyzeVideoResponse {
  success: boolean
  message: string
  analysis: string
}

// --- Script Creation Features ---

export interface ScriptShot {
  shotNumber: number
  scene: string
  character: string
  props: string
  dialogue: string
  imageUrl?: string
}

export interface EnhanceScriptResponse {
  success: boolean
  message: string
  script: string
}

export interface ScriptCharacter {
  name: string
  description: string
  imageUrl: string
}

export interface DeconstructScriptResponse {
  success: boolean
  message: string
  characters?: ScriptCharacter[]
  shots: ScriptShot[]
}


