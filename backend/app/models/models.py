from sqlalchemy import Column, String, Text, Integer, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class MediaType(str, enum.Enum):
    """素材类型枚举"""
    IMAGE = "image"
    VIDEO = "video"


class Project(Base):
    """项目模型"""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    theme = Column(String(100))
    style = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Media(Base):
    """素材模型"""
    __tablename__ = "media"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), nullable=False, index=True)
    type = Column(SQLEnum(MediaType), nullable=False)
    filename = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500))
    size = Column(Integer, nullable=False)
    duration = Column(Integer)  # 视频时长（秒）
    metadata = Column(JSON)  # 其他元数据
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Script(Base):
    """文案模型"""
    __tablename__ = "scripts"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), nullable=False, index=True)
    titles = Column(JSON)  # 标题列表
    opening = Column(Text)
    body = Column(Text)
    closing = Column(Text)
    subtitles = Column(JSON)  # 字幕数据
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Cover(Base):
    """封面模型"""
    __tablename__ = "covers"

    id = Column(String(36), primary_key=True)
    project_id = Column(String(36), nullable=False, index=True)
    url = Column(String(500), nullable=False)
    source_type = Column(String(20))  # upload, extract, ai_generated
    source_id = Column(String(36))
    edited_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Music(Base):
    """音乐模型"""
    __tablename__ = "music"

    id = Column(String(36), primary_key=True)
    title = Column(String(200), nullable=False)
    artist = Column(String(100))
    duration = Column(Integer, nullable=False)
    url = Column(String(500), nullable=False)
    preview_url = Column(String(500))
    genre = Column(JSON)  # 类型标签
    mood = Column(JSON)  # 情绪标签
    bpm = Column(Integer)
    license = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    """用户模型（简单版）"""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
