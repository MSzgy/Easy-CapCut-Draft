"""
CRUD operations for data persistence.
"""
import uuid
from typing import Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import (
    Project, Scene, Media, GeneratedAudio, GeneratedMusic,
    ProjectStatus, MediaType,
)


def _uuid() -> str:
    return str(uuid.uuid4())


# ── Project ──────────────────────────────────────────────────────────────────

async def create_project(
    db: AsyncSession,
    *,
    title: str,
    mode: str | None = None,
    prompt: str | None = None,
    source_url: str | None = None,
    description: str | None = None,
    video_style: str | None = None,
    copy_style: str | None = None,
    generated_copy: str | None = None,
    cover_url: str | None = None,
    cover_style: str | None = None,
    model_config_snapshot: dict | None = None,
    user_id: str | None = None,
) -> Project:
    project = Project(
        id=_uuid(),
        user_id=user_id,
        title=title,
        mode=mode,
        prompt=prompt,
        source_url=source_url,
        description=description,
        video_style=video_style,
        copy_style=copy_style,
        generated_copy=generated_copy,
        cover_url=cover_url,
        cover_style=cover_style,
        model_config_snapshot=model_config_snapshot,
        status=ProjectStatus.DRAFT,
    )
    db.add(project)
    await db.flush()
    return project


async def get_project(db: AsyncSession, project_id: str) -> Optional[Project]:
    result = await db.execute(select(Project).where(Project.id == project_id))
    return result.scalars().first()


async def list_projects(db: AsyncSession, limit: int = 50, offset: int = 0) -> list[Project]:
    result = await db.execute(
        select(Project).order_by(Project.created_at.desc()).limit(limit).offset(offset)
    )
    return list(result.scalars().all())


async def update_project(db: AsyncSession, project_id: str, **kwargs) -> Optional[Project]:
    project = await get_project(db, project_id)
    if not project:
        return None
    for key, value in kwargs.items():
        if hasattr(project, key):
            setattr(project, key, value)
    await db.flush()
    return project


async def delete_project(db: AsyncSession, project_id: str) -> bool:
    await db.execute(delete(Scene).where(Scene.project_id == project_id))
    result = await db.execute(delete(Project).where(Project.id == project_id))
    return result.rowcount > 0


# ── Scene ────────────────────────────────────────────────────────────────────

async def create_scene(
    db: AsyncSession,
    *,
    project_id: str,
    order_index: int = 0,
    timestamp: str = "",
    script: str = "",
    image_url: str | None = None,
    image_description: str | None = None,
    image_metadata: dict | None = None,
    video_url: str | None = None,
    video_prompt: str | None = None,
    duration: int = 5,
) -> Scene:
    scene = Scene(
        id=_uuid(),
        project_id=project_id,
        order_index=order_index,
        timestamp=timestamp,
        script=script,
        image_url=image_url,
        image_description=image_description,
        image_metadata=image_metadata,
        video_url=video_url,
        video_prompt=video_prompt,
        duration=duration,
    )
    db.add(scene)
    await db.flush()
    return scene


async def bulk_create_scenes(
    db: AsyncSession,
    project_id: str,
    scenes_data: list[dict],
) -> list[Scene]:
    """批量创建场景"""
    scenes = []
    for i, data in enumerate(scenes_data):
        scene = Scene(
            id=data.get("id") or _uuid(),
            project_id=project_id,
            order_index=i,
            timestamp=data.get("timestamp", ""),
            script=data.get("script", ""),
            image_url=data.get("imageUrl"),
            image_description=data.get("imageDescription"),
            image_metadata=data.get("imageMetadata"),
            video_url=data.get("videoUrl"),
            video_prompt=data.get("videoPrompt"),
            duration=data.get("duration", 5),
        )
        db.add(scene)
        scenes.append(scene)
    await db.flush()
    return scenes


async def get_scenes(db: AsyncSession, project_id: str) -> list[Scene]:
    result = await db.execute(
        select(Scene).where(Scene.project_id == project_id).order_by(Scene.order_index)
    )
    return list(result.scalars().all())


async def update_scene(db: AsyncSession, scene_id: str, **kwargs) -> Optional[Scene]:
    result = await db.execute(select(Scene).where(Scene.id == scene_id))
    scene = result.scalars().first()
    if not scene:
        return None
    for key, value in kwargs.items():
        if hasattr(scene, key):
            setattr(scene, key, value)
    await db.flush()
    return scene


# ── Generated Audio ──────────────────────────────────────────────────────────

async def create_generated_audio(
    db: AsyncSession,
    *,
    url: str,
    text: str,
    mode: str = "tts",
    voice_description: str | None = None,
    language: str | None = None,
    speed: float = 1.0,
    provider: str | None = None,
    project_id: str | None = None,
) -> GeneratedAudio:
    audio = GeneratedAudio(
        id=_uuid(),
        project_id=project_id,
        url=url,
        text=text,
        mode=mode,
        voice_description=voice_description,
        language=language,
        speed=speed,
        provider=provider,
    )
    db.add(audio)
    await db.flush()
    return audio


async def list_generated_audios(db: AsyncSession, limit: int = 50) -> list[GeneratedAudio]:
    result = await db.execute(
        select(GeneratedAudio).order_by(GeneratedAudio.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


# ── Generated Music ──────────────────────────────────────────────────────────

async def create_generated_music(
    db: AsyncSession,
    *,
    url: str,
    prompt: str,
    duration: float | None = None,
    genre: str | None = None,
    mood: str | None = None,
    bpm: int | None = None,
    provider: str | None = None,
    project_id: str | None = None,
) -> GeneratedMusic:
    music = GeneratedMusic(
        id=_uuid(),
        project_id=project_id,
        url=url,
        prompt=prompt,
        duration=duration,
        genre=genre,
        mood=mood,
        bpm=bpm,
        provider=provider,
    )
    db.add(music)
    await db.flush()
    return music


async def list_generated_music(db: AsyncSession, limit: int = 50) -> list[GeneratedMusic]:
    result = await db.execute(
        select(GeneratedMusic).order_by(GeneratedMusic.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


# ── Media Assets ─────────────────────────────────────────────────────────────

async def create_media(
    db: AsyncSession,
    *,
    type: str,
    filename: str,
    url: str,
    project_id: str | None = None,
    thumbnail_url: str | None = None,
    size: int | None = None,
    duration: float | None = None,
    ai_prompt: str | None = None,
    scene_used_in: str | None = None,
    extra_metadata: dict | None = None,
) -> Media:
    media = Media(
        id=_uuid(),
        project_id=project_id,
        type=MediaType(type),
        filename=filename,
        url=url,
        thumbnail_url=thumbnail_url,
        size=size,
        duration=duration,
        ai_prompt=ai_prompt,
        scene_used_in=scene_used_in,
        extra_metadata=extra_metadata,
    )
    db.add(media)
    await db.flush()
    return media


async def list_media(db: AsyncSession, project_id: str | None = None, limit: int = 100) -> list[Media]:
    q = select(Media).order_by(Media.created_at.desc()).limit(limit)
    if project_id:
        q = q.where(Media.project_id == project_id)
    result = await db.execute(q)
    return list(result.scalars().all())
