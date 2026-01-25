from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class MediaType(str, Enum):
    """素材类型"""
    IMAGE = "image"
    VIDEO = "video"


# ============ 项目相关 Schema ============

class ProjectBase(BaseModel):
    """项目基础Schema"""
    title: str = Field(..., max_length=200)
    description: Optional[str] = None
    theme: Optional[str] = Field(None, max_length=100)
    style: Optional[str] = Field(None, max_length=50)


class ProjectCreate(ProjectBase):
    """项目创建Schema"""
    pass


class ProjectUpdate(BaseModel):
    """项目更新Schema"""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = None
    theme: Optional[str] = Field(None, max_length=100)
    style: Optional[str] = Field(None, max_length=50)


class ProjectResponse(ProjectBase):
    """项目响应Schema"""
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============ 素材相关 Schema ============

class MediaBase(BaseModel):
    """素材基础Schema"""
    filename: str
    type: MediaType


class MediaResponse(MediaBase):
    """素材响应Schema"""
    id: str
    project_id: str
    url: str
    thumbnail_url: Optional[str] = None
    size: int
    duration: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 文案相关 Schema ============

class SubtitleItem(BaseModel):
    """字幕项"""
    id: str
    text: str
    start_time: float
    end_time: float


class ScriptBase(BaseModel):
    """文案基础Schema"""
    titles: List[str] = Field(default_factory=list)
    opening: Optional[str] = None
    body: Optional[str] = None
    closing: Optional[str] = None
    subtitles: List[SubtitleItem] = Field(default_factory=list)


class ScriptCreate(BaseModel):
    """文案生成请求"""
    project_id: str
    media_ids: List[str]
    theme: str
    description: Optional[str] = None
    style: str = "professional"
    video_duration: Optional[int] = None
    keywords: Optional[List[str]] = None


class ScriptResponse(ScriptBase):
    """文案响应Schema"""
    id: str
    project_id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 封面相关 Schema ============

class CoverCreate(BaseModel):
    """封面生成请求"""
    project_id: str
    source_type: str = Field(..., description="upload, extract, ai_generated")
    source_id: Optional[str] = None
    prompt: Optional[str] = None
    template_id: Optional[str] = None


class CoverResponse(BaseModel):
    """封面响应Schema"""
    id: str
    project_id: str
    url: str
    source_type: str
    source_id: Optional[str] = None
    edited_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============ 音乐相关 Schema ============

class MusicRecommendRequest(BaseModel):
    """音乐推荐请求"""
    project_id: str
    media_ids: List[str]
    theme: str
    mood: Optional[str] = None
    duration: Optional[int] = None


class MusicResponse(BaseModel):
    """音乐响应Schema"""
    id: str
    title: str
    artist: Optional[str] = None
    duration: int
    url: str
    preview_url: Optional[str] = None
    genre: List[str] = Field(default_factory=list)
    mood: List[str] = Field(default_factory=list)
    bpm: Optional[int] = None
    license: str
    match_score: Optional[float] = None

    class Config:
        from_attributes = True


# ============ 通用响应 Schema ============

class ApiResponse(BaseModel):
    """统一API响应"""
    code: int = 200
    message: str = "success"
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    """错误响应"""
    code: int
    message: str
    detail: Optional[str] = None
