from pydantic import BaseModel, Field
from typing import Optional, List, Literal


class ImageMetadata(BaseModel):
    """图片元数据"""
    description: str = Field(..., description="基础描述")
    tags: List[str] = Field(default_factory=list, description="图片标签")
    mood: Optional[str] = Field(None, description="情绪/氛围")
    color_scheme: Optional[str] = Field(None, description="主要色调")
    composition: Optional[str] = Field(None, description="构图特点")
    style: Optional[str] = Field(None, description="视觉风格")
    subjects: List[str] = Field(default_factory=list, description="主体对象")
    scene_type: Optional[str] = Field(None, description="场景类型")


class SceneContent(BaseModel):
    """场景内容"""
    id: str
    timestamp: str
    script: str
    imageUrl: str
    imageDescription: str  # 保留兼容性
    imageMetadata: Optional[ImageMetadata] = Field(None, description="详细图片元数据")
    duration: int = Field(5, description="场景时长(秒)")


class GenerateContentRequest(BaseModel):
    """AI内容生成请求"""
    mode: Literal["upload", "prompt", "url"] = Field(..., description="生成模式")

    # Prompt模式字段
    prompt: Optional[str] = Field(None, description="用户输入的提示词")
    videoStyle: Optional[str] = Field(None, description="视频风格: promo, tutorial, review, story")
    styleKeywords: Optional[List[str]] = Field(None, description="风格关键词，用于增强AI理解")

    # URL模式字段
    url: Optional[str] = Field(None, description="网站URL")

    # Upload模式字段
    uploadedAssets: Optional[List[dict]] = Field(None, description="上传的资源列表，图片资源应包含content(base64)")
    
    # 通用字段
    copyStyle: Optional[str] = Field(None, description="文案风格")
    generateImages: bool = Field(True, description="是否生成场景配图")
    numFrames: Optional[int] = Field(None, description="分镜数量 (若指定则生成故事板模式)")
    sceneDuration: Optional[int] = Field(5, description="每个场景的持续时间（秒），默认5秒")
    styleReferenceImage: Optional[str] = Field(None, description="风格参考图片 base64 编码（仅参考风格，不复制内容）")
    
    # 模型选择
    textProvider: Optional[str] = Field("gemini", description="文本生成模型提供商")
    imageProvider: Optional[str] = Field("gemini", description="图片生成模型提供商")


class GenerateContentResponse(BaseModel):
    """AI内容生成响应"""
    success: bool
    message: str
    scenes: List[SceneContent]
    coverUrl: Optional[str] = None
    copy: Optional[str] = Field(None, description="生成的文案")


class GenerateCoverRequest(BaseModel):
    """AI封面生成请求"""
    style: str = Field(..., description="封面风格: 3d, minimal, cinematic, gradient")
    styleKeywords: Optional[List[str]] = Field(None, description="风格关键词，用于增强AI理解")
    prompt: Optional[str] = Field(None, description="封面描述")
    negativePrompt: Optional[str] = Field(None, description="负面提示词，描述不想出现的元素")
    theme: Optional[str] = Field(None, description="视频主题")
    size: Optional[str] = Field(None, description="封面尺寸")
    resolution: Optional[str] = Field(None, description="图片分辨率")
    # Phase 2: 高级功能
    mode: Optional[Literal["text-to-image", "image-to-image", "style-mix"]] = Field("text-to-image", description="生成模式")
    referenceImage: Optional[str] = Field(None, description="参考图片 base64 编码 (用于图生图)")
    denoisingStrength: Optional[float] = Field(0.7, description="重绘强度 0-1，值越低保留原图越多")
    preserveComposition: Optional[bool] = Field(False, description="是否保留原图构图")
    styleWeights: Optional[dict] = Field(None, description="风格权重映射，如 {'cyberpunk': 0.6, 'watercolor': 0.4}")
    provider: Optional[str] = Field("gemini", description="AI provider: gemini, huggingface, or hf:alias")


class GenerateCoverResponse(BaseModel):
    """AI封面生成响应"""
    success: bool
    message: str
    coverUrl: str


class OptimizePromptRequest(BaseModel):
    """提示词优化请求"""
    prompt: str = Field(..., description="原始提示词")


class OptimizePromptResponse(BaseModel):
    """提示词优化响应"""
    success: bool
    message: str
    optimized: str = Field(..., description="优化后的提示词")
    suggestions: List[str] = Field(default_factory=list, description="改进建议")


# Phase 3: 风格迁移
class StyleTransferRequest(BaseModel):
    """风格迁移请求"""
    image: str = Field(..., description="原始图片 base64 编码")
    artStyle: str = Field(..., description="艺术风格 ID")
    intensity: float = Field(0.8, description="风格强度 0-1", ge=0, le=1)
    prompt: Optional[str] = Field(None, description="额外提示词")


class StyleTransferResponse(BaseModel):
    """风格迁移响应"""
    success: bool
    message: str
    imageUrl: str


# Phase 3: 贴纸工坊
class StickerRequest(BaseModel):
    """贴纸生成请求"""
    prompt: str = Field(..., description="贴纸描述")
    style: Literal["cartoon", "pixel", "3d", "hand-drawn"] = Field("cartoon", description="贴纸风格")
    removeBackground: bool = Field(True, description="是否移除背景")


class StickerResponse(BaseModel):
    """贴纸生成响应"""
    success: bool
    message: str
    imageUrl: str  # PNG with transparent background


# Phase 3: 灵魂画手
class SketchToImageRequest(BaseModel):
    """草图转图片请求"""
    sketch: str = Field(..., description="草图 base64 编码")
    prompt: str = Field(..., description="生成描述")
    style: str = Field("photorealistic", description="风格")


class SketchToImageResponse(BaseModel):
    """草图转图片响应"""
    success: bool
    message: str
    imageUrl: str


# Phase 3: AI写真/换脸
class FacePortraitRequest(BaseModel):
    """AI写真生成请求"""
    faceImage: str = Field(..., description="人脸照片 base64 编码")
    scenePrompt: str = Field(..., description="场景描述，如：商务办公室、海滩度假、古风庭院等")
    style: str = Field("photorealistic", description="风格：photorealistic, cinematic, artistic等")
    preserveFace: float = Field(0.3, description="人脸保留强度 0-1，值越低AI创作自由度越高", ge=0, le=1)


class FacePortraitResponse(BaseModel):
    """AI写真生成响应"""
    success: bool
    message: str
    imageUrl: str


class FaceSwapRequest(BaseModel):
    """人脸融合请求"""
    faceImage: str = Field(..., description="源人脸照片 base64 编码")
    targetImage: str = Field(..., description="目标场景图片 base64 编码")
    blendStrength: float = Field(0.7, description="融合强度 0-1，值越高人脸融合越自然", ge=0, le=1)


class FaceSwapResponse(BaseModel):
    """人脸融合响应"""
    success: bool
    message: str
    imageUrl: str


# Background Removal & Replacement
class BackgroundRemovalRequest(BaseModel):
    """背景移除请求"""
    image: str = Field(..., description="原始图片 base64 编码")
    subject: Literal["person", "object", "auto"] = Field("auto", description="主体类型提示")
    refineEdges: bool = Field(True, description="是否精细化边缘处理")


class BackgroundRemovalResponse(BaseModel):
    """背景移除响应"""
    success: bool
    message: str
    imageUrl: str  # PNG with transparent background


class BackgroundReplacementRequest(BaseModel):
    """背景替换请求"""
    image: str = Field(..., description="原始图片 base64 编码")
    backgroundScene: Literal["office", "nature", "tech", "fantasy", "solid", "blur"] = Field("nature", description="背景场景预设")
    customPrompt: Optional[str] = Field(None, description="自定义场景描述")
    backgroundColor: Optional[str] = Field("#FFFFFF", description="纯色背景颜色（仅当backgroundScene=solid时使用）")
    matchLighting: bool = Field(True, description="是否匹配光照")
    addDepth: bool = Field(True, description="是否添加景深效果")


class BackgroundReplacementResponse(BaseModel):
    """背景替换响应"""
    success: bool
    message: str
    imageUrl: str


# Storyboard Generation
class StoryboardFrame(BaseModel):
    """故事板单个分镜"""
    frameNumber: int = Field(..., description="分镜序号")
    imageUrl: str = Field(..., description="分镜图片 base64")
    description: str = Field(..., description="分镜场景描述")
    shotType: str = Field(..., description="镜头类型")


class StoryboardRequest(BaseModel):
    """故事板生成请求"""
    storyPrompt: str = Field(..., description="故事情节描述")
    characterImage: Optional[str] = Field(None, description="角色参考图 base64（可选）")
    numFrames: int = Field(6, description="分镜数量 4-8", ge=4, le=8)
    style: str = Field("photorealistic", description="画面风格")
    shotTypes: Optional[List[str]] = Field(None, description="偏好镜头类型")


class StoryboardResponse(BaseModel):
    """故事板生成响应"""
    success: bool
    message: str
    frames: List[StoryboardFrame]


# Hugging Face Image Generation
class HuggingFaceImageRequest(BaseModel):
    """Hugging Face 图片生成请求"""
    prompt: str = Field(..., description="图片生成提示词")
    height: int = Field(1024, description="图片高度", ge=512, le=2048)
    width: int = Field(1024, description="图片宽度", ge=512, le=2048)
    numInferenceSteps: int = Field(9, description="推理步数，越高质量越好但越慢", ge=1, le=50)
    seed: int = Field(42, description="随机种子")
    randomizeSeed: bool = Field(True, description="是否随机种子")


class HuggingFaceImageResponse(BaseModel):
    """Hugging Face 图片生成响应"""
    success: bool
    message: str
    imageUrl: str


# Hugging Face Video Generation
class HuggingFaceVideoRequest(BaseModel):
    """Hugging Face 视频生成请求"""
    inputImage: str = Field(..., description="输入图片的 URL 或文件路径")
    prompt: str = Field(..., description="视频生成提示词")
    steps: int = Field(6, description="推理步数", ge=1, le=50)
    negativePrompt: str = Field(
        "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, 静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, 多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, 形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, 背景人很多, 倒着走",
        description="负面提示词"
    )
    durationSeconds: float = Field(3.5, description="视频时长（秒）", ge=1.0, le=10.0)
    guidanceScale: float = Field(1.0, description="引导尺度", ge=0.0, le=20.0)
    guidanceScale2: float = Field(1.0, description="第二引导尺度", ge=0.0, le=20.0)
    seed: int = Field(42, description="随机种子")
    randomizeSeed: bool = Field(True, description="是否随机种子")


class HuggingFaceVideoResponse(BaseModel):
    """Hugging Face 视频生成响应"""
    success: bool
    message: str
    videoUrl: str


# Image + Audio to Video Generation
class ImageAudioToVideoRequest(BaseModel):
    """图片音频转视频请求"""
    firstFrame: str = Field(..., description="首帧图片 URL 或文件路径")
    endFrame: Optional[str] = Field(None, description="尾帧图片 URL 或文件路径（可选）")
    prompt: str = Field(
        "Make this image come alive with cinematic motion, smooth animation",
        description="视频生成提示词"
    )
    duration: int = Field(5, description="视频时长（秒）", ge=1, le=10)
    inputVideo: Optional[str] = Field(None, description="输入视频路径（可选）")
    generationMode: Literal["Image-to-Video", "Video-to-Video"] = Field(
        "Image-to-Video",
        description="生成模式"
    )
    enhancePrompt: bool = Field(True, description="是否增强提示词")
    seed: int = Field(10, description="随机种子")
    randomizeSeed: bool = Field(True, description="是否随机种子")
    height: int = Field(512, description="视频高度", ge=256, le=1024)
    width: int = Field(768, description="视频宽度", ge=256, le=1024)
    cameraLora: str = Field("No LoRA", description="相机运动 LoRA")
    audioPath: Optional[str] = Field(None, description="音频文件路径（可选）")
    videoProvider: Optional[str] = Field(None, description="视频生成提供商，如 hf:video_i2v 或 hf:video_wan")


class ImageAudioToVideoResponse(BaseModel):
    """图片音频转视频响应"""
    success: bool
    message: str
    videoUrl: str


# Video Concatenation
class ConcatenateVideosRequest(BaseModel):
    """视频拼接请求"""
    videoPaths: List[str] = Field(..., description="视频文件路径列表，按顺序拼接")


class ConcatenateVideosResponse(BaseModel):
    """视频拼接响应"""
    success: bool
    message: str
    videoUrl: str = Field(..., description="拼接后的视频文件路径")


# Transition Analysis
class AnalyzeTransitionRequest(BaseModel):
    """视频转场分析请求"""
    firstFrame: str = Field(..., description="起始帧图片 (base64 data URL 或 HTTP URL)")
    endFrame: str = Field(..., description="结束帧图片 (base64 data URL 或 HTTP URL)")


class AnalyzeTransitionResponse(BaseModel):
    """视频转场分析响应"""
    success: bool
    message: str
    transitionPrompt: str = Field(..., description="AI生成的转场提示词")


# Speech Generation
class SpeechRequest(BaseModel):
    """语音生成请求"""
    text: str = Field(..., description="要转换的文本")
    voiceDescription: str = Field("A clear and professional voice.", description="声音描述")
    language: str = Field("Auto", description="语言代码: Auto, English, Chinese, etc.")
    speed: float = Field(1.0, description="语速", ge=0.5, le=2.0)
    emotion: Optional[str] = Field(None, description="情感")
    provider: Optional[str] = Field("hf:tts_qwen", description="TTS提供商")
    referenceAudio: Optional[str] = Field(None, description="参考音频 base64 或 URL (用于声音克隆)")
    referenceText: Optional[str] = Field(None, description="参考音频对应的文本内容")


class SpeechResponse(BaseModel):
    """语音生成响应"""
    success: bool
    message: str
    audioUrl: str


# Music Generation
class GenerateMusicRequest(BaseModel):
    """音乐生成请求"""
    prompt: str = Field(..., description="音乐描述")
    duration: float = Field(10.0, description="时长(秒)", ge=1.0, le=30.0)
    model: str = Field("medium", description="模型: small, medium, melody, large")
    provider: Optional[str] = Field("hf:music_gen", description="Music Provider")


class GenerateMusicResponse(BaseModel):
    """音乐生成响应"""
    success: bool
    message: str
    audioUrl: str
