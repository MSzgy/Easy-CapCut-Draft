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
