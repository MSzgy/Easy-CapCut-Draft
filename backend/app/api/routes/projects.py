"""
项目持久化 API:
  POST   /projects             — 保存项目（含场景）
  GET    /projects             — 列出所有项目
  GET    /projects/{id}        — 获取单个项目
  DELETE /projects/{id}        — 删除项目
  PUT    /projects/{id}/scenes — 更新场景
  GET    /projects/latest      — 获取最新项目（前端恢复用）

  GET    /history/audio        — 语音生成历史
  GET    /history/music        — 音乐生成历史
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import crud

router = APIRouter()


# ── Request / Response Schemas ───────────────────────────────────────────────

class SceneData(BaseModel):
    id: Optional[str] = None
    timestamp: str = ""
    script: str = ""
    imageUrl: Optional[str] = None
    imageDescription: Optional[str] = None
    imageMetadata: Optional[dict] = None
    videoUrl: Optional[str] = None
    videoPrompt: Optional[str] = None
    duration: int = 5


class SaveProjectRequest(BaseModel):
    title: Optional[str] = None
    mode: Optional[str] = None
    prompt: Optional[str] = None
    sourceUrl: Optional[str] = None
    description: Optional[str] = None
    videoStyle: Optional[str] = None
    copyStyle: Optional[str] = None
    generatedCopy: Optional[str] = None
    coverUrl: Optional[str] = None
    coverStyle: Optional[str] = None
    combinedVideoUrl: Optional[str] = None
    status: Optional[str] = None
    modelConfig: Optional[dict] = None
    scenes: List[SceneData] = Field(default_factory=list)
    # 如果传入 projectId，则更新而非新建
    projectId: Optional[str] = None


class SceneResponse(BaseModel):
    id: str
    orderIndex: int
    timestamp: str
    script: str
    imageUrl: Optional[str]
    imageDescription: Optional[str]
    imageMetadata: Optional[dict]
    videoUrl: Optional[str]
    videoPrompt: Optional[str]
    duration: int

    class Config:
        from_attributes = True


class ProjectResponse(BaseModel):
    id: str
    title: str
    mode: Optional[str]
    prompt: Optional[str]
    sourceUrl: Optional[str]
    description: Optional[str]
    videoStyle: Optional[str]
    copyStyle: Optional[str]
    generatedCopy: Optional[str]
    coverUrl: Optional[str]
    status: Optional[str]
    combinedVideoUrl: Optional[str]
    modelConfig: Optional[dict]
    createdAt: Optional[str]
    updatedAt: Optional[str]
    scenes: List[SceneResponse] = []

    class Config:
        from_attributes = True


class AudioHistoryItem(BaseModel):
    id: str
    url: str
    text: str
    mode: str
    voiceDescription: Optional[str]
    language: Optional[str]
    speed: Optional[float]
    createdAt: Optional[str]

    class Config:
        from_attributes = True


class MusicHistoryItem(BaseModel):
    id: str
    url: str
    prompt: str
    duration: Optional[float]
    genre: Optional[str]
    mood: Optional[str]
    bpm: Optional[int]
    createdAt: Optional[str]

    class Config:
        from_attributes = True


# ── Helpers ──────────────────────────────────────────────────────────────────

def _project_to_response(project) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        title=project.title,
        mode=project.mode,
        prompt=project.prompt,
        sourceUrl=project.source_url,
        description=project.description,
        videoStyle=project.video_style,
        copyStyle=project.copy_style,
        generatedCopy=project.generated_copy,
        coverUrl=project.cover_url,
        status=project.status.value if project.status else None,
        combinedVideoUrl=project.combined_video_url,
        modelConfig=project.model_config_snapshot,
        createdAt=project.created_at.isoformat() if project.created_at else None,
        updatedAt=project.updated_at.isoformat() if project.updated_at else None,
        scenes=[
            SceneResponse(
                id=s.id,
                orderIndex=s.order_index,
                timestamp=s.timestamp or "",
                script=s.script or "",
                imageUrl=s.image_url,
                imageDescription=s.image_description,
                imageMetadata=s.image_metadata,
                videoUrl=s.video_url,
                videoPrompt=s.video_prompt,
                duration=s.duration or 5,
            )
            for s in (project.scenes or [])
        ],
    )


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/projects", response_model=dict)
async def save_project(req: SaveProjectRequest, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """保存或更新项目（含场景）"""
    if req.projectId:
        # 更新已有项目
        project = await crud.get_project(db, req.projectId)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        # 只更新非 None 的字段，避免覆盖已有数据
        update_fields: dict = {}
        field_map = {
            "title": req.title,
            "mode": req.mode,
            "prompt": req.prompt,
            "source_url": req.sourceUrl,
            "description": req.description,
            "video_style": req.videoStyle,
            "copy_style": req.copyStyle,
            "generated_copy": req.generatedCopy,
            "cover_url": req.coverUrl,
            "cover_style": req.coverStyle,
            "combined_video_url": req.combinedVideoUrl,
            "model_config_snapshot": req.modelConfig,
        }
        for k, v in field_map.items():
            if v is not None:
                update_fields[k] = v

        # status 需要转换为 enum
        if req.status is not None:
            from app.models.models import ProjectStatus
            try:
                update_fields["status"] = ProjectStatus(req.status)
            except ValueError:
                pass

        if update_fields:
            await crud.update_project(db, req.projectId, **update_fields)

        # 删旧场景，重建
        from sqlalchemy import delete as sa_delete
        from app.models.models import Scene
        await db.execute(sa_delete(Scene).where(Scene.project_id == req.projectId))
        if req.scenes:
            await crud.bulk_create_scenes(db, req.projectId, [s.model_dump() for s in req.scenes])
        # 重新获取完整项目
        project = await crud.get_project(db, req.projectId)
    else:
        # 创建新项目
        project = await crud.create_project(
            db,
            title=req.title or "Untitled Project",
            mode=req.mode,
            prompt=req.prompt,
            source_url=req.sourceUrl,
            description=req.description,
            video_style=req.videoStyle,
            copy_style=req.copyStyle,
            generated_copy=req.generatedCopy,
            cover_url=req.coverUrl,
            cover_style=req.coverStyle,
            model_config_snapshot=req.modelConfig,
        )
        if req.scenes:
            await crud.bulk_create_scenes(db, project.id, [s.model_dump() for s in req.scenes])
        # 重新加载（含 scenes relationship）
        project = await crud.get_project(db, project.id)

    return {
        "success": True,
        "message": "项目保存成功",
        "project": _project_to_response(project).model_dump(),
    }


@router.get("/projects", response_model=dict)
async def list_projects(limit: int = 50, offset: int = 0, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """列出所有项目"""
    projects = await crud.list_projects(db, limit=limit, offset=offset)
    return {
        "success": True,
        "projects": [_project_to_response(p).model_dump() for p in projects],
    }


@router.get("/projects/latest", response_model=dict)
async def get_latest_project(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """获取最新项目（前端启动恢复用）"""
    projects = await crud.list_projects(db, limit=1)
    if not projects:
        return {"success": True, "project": None}
    return {
        "success": True,
        "project": _project_to_response(projects[0]).model_dump(),
    }


@router.get("/projects/{project_id}", response_model=dict)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """获取单个项目"""
    project = await crud.get_project(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {
        "success": True,
        "project": _project_to_response(project).model_dump(),
    }


@router.delete("/projects/{project_id}", response_model=dict)
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """删除项目"""
    deleted = await crud.delete_project(db, project_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"success": True, "message": "项目已删除"}


# ── History Endpoints ────────────────────────────────────────────────────────

@router.get("/history/audio", response_model=dict)
async def get_audio_history(limit: int = 50, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """获取语音生成历史"""
    audios = await crud.list_generated_audios(db, limit=limit)
    return {
        "success": True,
        "items": [
            AudioHistoryItem(
                id=a.id,
                url=a.url,
                text=a.text,
                mode=a.mode or "tts",
                voiceDescription=a.voice_description,
                language=a.language,
                speed=a.speed,
                createdAt=a.created_at.isoformat() if a.created_at else None,
            ).model_dump()
            for a in audios
        ],
    }


@router.get("/history/music", response_model=dict)
async def get_music_history(limit: int = 50, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """获取音乐生成历史"""
    music_list = await crud.list_generated_music(db, limit=limit)
    return {
        "success": True,
        "items": [
            MusicHistoryItem(
                id=m.id,
                url=m.url,
                prompt=m.prompt,
                duration=m.duration,
                genre=m.genre,
                mood=m.mood,
                bpm=m.bpm,
                createdAt=m.created_at.isoformat() if m.created_at else None,
            ).model_dump()
            for m in music_list
        ],
    }
