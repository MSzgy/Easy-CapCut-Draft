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

    # URL模式字段
    url: Optional[str] = Field(None, description="网站URL")

    # Upload模式字段
    uploadedAssets: Optional[List[dict]] = Field(None, description="上传的资源列表，图片资源应包含content(base64)")


class GenerateContentResponse(BaseModel):
    """AI内容生成响应"""
    success: bool
    message: str
    scenes: List[SceneContent]
    coverUrl: Optional[str] = None


class GenerateCoverRequest(BaseModel):
    """AI封面生成请求"""
    style: str = Field(..., description="封面风格: 3d, minimal, cinematic, gradient")
    prompt: Optional[str] = Field(None, description="封面描述")
    theme: Optional[str] = Field(None, description="视频主题")
    size: Optional[str] = Field(None, description="封面尺寸")


class GenerateCoverResponse(BaseModel):
    """AI封面生成响应"""
    success: bool
    message: str
    coverUrl: str
