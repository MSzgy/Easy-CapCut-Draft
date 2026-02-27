from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.auth import get_current_user
from app.services import crud

router = APIRouter()

class MediaCreate(BaseModel):
    id: str
    type: str
    name: str # maps to filename
    url: str
    createdAt: Optional[str] = None
    sceneUsedIn: Optional[str] = None
    aiPrompt: Optional[str] = None
    size: Optional[str] = None # Will store in extra_metadata if string, or parse to int
    projectId: Optional[str] = None

class MediaBatchCreate(BaseModel):
    assets: List[MediaCreate]

class MediaResponse(BaseModel):
    id: str
    type: str
    name: str
    url: str
    createdAt: str
    sceneUsedIn: Optional[str] = None
    aiPrompt: Optional[str] = None
    size: str
    projectId: Optional[str] = None

@router.post("", response_model=dict)
async def save_media(req: MediaCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """保存单个素材到 MediaVault"""
    try:
        size_int = 0
        extra_meta = {}
        if req.size:
            extra_meta["display_size"] = req.size
            
        media = await crud.create_media(
            db=db,
            type=req.type,
            filename=req.name,
            url=req.url,
            project_id=req.projectId,
            size=size_int,
            ai_prompt=req.aiPrompt,
            scene_used_in=req.sceneUsedIn,
            extra_metadata=extra_meta
        )
        # 强制使用传入的 ID 如果需要，但是 crud.create_media 自动生成 uuid
        # 为了前端一致性，我们可以让 frontend 传ID，这里在 crud 里最好支持传ID，但如果 crud.create_media 写死了 uuid4，我们就返回新的
        return {"success": True, "id": media.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/batch", response_model=dict)
async def save_media_batch(req: MediaBatchCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """批量保存素材到 MediaVault"""
    try:
        saved_ids = []
        for asset in req.assets:
            size_int = 0
            extra_meta = {}
            if asset.size:
                extra_meta["display_size"] = asset.size
                
            media = await crud.create_media(
                db=db,
                type=asset.type,
                filename=asset.name,
                url=asset.url,
                project_id=asset.projectId,
                size=size_int,
                ai_prompt=asset.aiPrompt,
                scene_used_in=asset.sceneUsedIn,
                extra_metadata=extra_meta
            )
            saved_ids.append(media.id)
            
        return {"success": True, "saved_count": len(saved_ids), "ids": saved_ids}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=dict)
async def list_media(projectId: Optional[str] = None, limit: int = 200, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """获取素材库列表"""
    try:
        medias = await crud.list_media(db, project_id=None, limit=limit) # get all global media for user (ignoring project for now since vault is global)
        
        results = []
        for m in medias:
            display_size = "-"
            if m.extra_metadata and "display_size" in m.extra_metadata:
                display_size = m.extra_metadata["display_size"]
                
            results.append({
                "id": m.id,
                "type": m.type.value if hasattr(m.type, 'value') else str(m.type),
                "name": m.filename,
                "url": m.url,
                "createdAt": m.created_at.isoformat() if m.created_at else "",
                "sceneUsedIn": m.scene_used_in,
                "aiPrompt": m.ai_prompt,
                "size": display_size,
                "projectId": m.project_id
            })
            
        return {"success": True, "assets": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{media_id}", response_model=dict)
async def delete_media(media_id: str, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_user)):
    """从素材库删除"""
    try:
        from sqlalchemy import delete
        from app.models.models import Media
        await db.execute(delete(Media).where(Media.id == media_id))
        await db.commit()
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
