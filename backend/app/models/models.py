from sqlalchemy import Column, String, Text, Integer, Float, DateTime, JSON, Boolean, Enum as SQLEnum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base
import enum


# ── Enums ────────────────────────────────────────────────────────────────────

class MediaType(str, enum.Enum):
    """素材类型枚举"""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"


class ProjectStatus(str, enum.Enum):
    """项目状态"""
    DRAFT = "draft"
    RENDERING = "rendering"
    RENDERED = "rendered"
    FAILED = "failed"


# ── Core Models ──────────────────────────────────────────────────────────────

class User(Base):
    """用户模型"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    projects = relationship("Project", back_populates="user", lazy="selectin")


class Project(Base):
    """项目模型 — 一次完整的视频制作流程"""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)

    # 生成参数
    mode = Column(String(20))   # prompt / url / upload
    prompt = Column(Text)       # 用户原始 prompt
    source_url = Column(String(500))  # URL 模式下的源 URL
    video_style = Column(String(50))  # promo, tutorial, cinematic, etc.
    copy_style = Column(String(50))   # 文案风格
    generated_copy = Column(Text)     # 生成的文案

    # 封面
    cover_url = Column(String(500))
    cover_style = Column(String(50))

    # 输出
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.DRAFT)
    combined_video_url = Column(String(500))
    total_duration = Column(Float)   # 总时长（秒）

    # 模型配置快照
    model_config_snapshot = Column(JSON)  # {textProvider, imageProvider, videoProvider, ...}

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="projects")
    scenes = relationship("Scene", back_populates="project", lazy="selectin",
                          order_by="Scene.order_index")


class Scene(Base):
    """场景/分镜模型 — 项目中的单个场景"""
    __tablename__ = "scenes"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False, index=True)
    order_index = Column(Integer, nullable=False, default=0)

    # 内容
    timestamp = Column(String(20))         # "0:00 - 0:05"
    script = Column(Text, nullable=False)  # 场景脚本

    # 图片
    image_url = Column(String(500))
    image_description = Column(Text)
    image_metadata = Column(JSON)   # {description, tags, mood, color_scheme, style, ...}

    # 视频
    video_url = Column(String(500))
    video_prompt = Column(Text)     # 用于生成视频的 prompt

    # 时长
    duration = Column(Integer, default=5)  # 秒

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    project = relationship("Project", back_populates="scenes")


# ── Media Assets ─────────────────────────────────────────────────────────────

class Media(Base):
    """素材库模型 — Media Vault 中的资源"""
    __tablename__ = "media"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True, index=True)
    type = Column(SQLEnum(MediaType), nullable=False)
    filename = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500))
    size = Column(Integer)        # 文件大小（字节）
    duration = Column(Float)      # 音视频时长（秒）
    ai_prompt = Column(Text)      # AI 生成时使用的 prompt
    scene_used_in = Column(String(100))  # "Scene 1 - Intro"
    extra_metadata = Column(JSON)  # 其他元数据
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── AI Generation History ────────────────────────────────────────────────────

class GeneratedAudio(Base):
    """语音生成历史 — Audio Studio 的 TTS / 声音克隆记录"""
    __tablename__ = "generated_audios"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True, index=True)
    url = Column(String(500), nullable=False)
    text = Column(Text, nullable=False)         # 生成文本
    mode = Column(String(10), default="tts")    # tts / clone
    voice_description = Column(Text)
    language = Column(String(20))
    speed = Column(Float, default=1.0)
    provider = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GeneratedMusic(Base):
    """音乐生成历史 — Music Studio 的 AI 生成记录"""
    __tablename__ = "generated_music"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True, index=True)
    url = Column(String(500), nullable=False)
    prompt = Column(Text, nullable=False)       # 音乐描述 prompt
    duration = Column(Float)                    # 时长（秒）
    genre = Column(String(100))                 # 风格
    mood = Column(String(100))                  # 情绪
    bpm = Column(Integer)                       # BPM
    provider = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
