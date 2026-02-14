from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.services.ai_service_v2 import ai_service
from app.core.config import settings
import os
from fastapi.responses import FileResponse

router = APIRouter()

class VideoGenerationRequest(BaseModel):
    project_id: str
    script_data: Dict # Contains sections, subtitles etc.
    image_paths: List[str]
    audio_paths: List[str]
    mode: str = "capcut" # "capcut" or "direct"
    ai_enhanced: bool = False # Use AI I2V

class VideoGenerationResponse(BaseModel):
    status: str
    output_path: Optional[str] = None
    message: str

@router.post("/generate", response_model=VideoGenerationResponse)
async def generate_video(request: VideoGenerationRequest):
    """
    Generate a video project (CapCut Draft or MP4)
    """
    try:
        # Validate input paths
        for path in request.image_paths + request.audio_paths:
             if not os.path.exists(path):
                  # For MVP, just warning or error. 
                  # In real app, we might need to handle absolute/relative path mapping carefully
                  pass 

        # Call Service
        # Note: For heavy AI video generation, this should ideally be a background task
        # But for MVP we keep it sync or use FastAPI BackgroundTasks if we want async response
        
        output_path = ai_service.generate_full_video_project(
            project_id=request.project_id,
            script_data=request.script_data,
            image_paths=request.image_paths,
            audio_paths=request.audio_paths,
            mode=request.mode,
            ai_enhanced=request.ai_enhanced
        )
        
        # Convert absolute path to relative URL or just return path
        # Here we return local path for simplicity
        return VideoGenerationResponse(
            status="success",
            output_path=output_path,
            message=f"Video generated successfully in {request.mode} mode"
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download")
async def download_video(path: str):
    """
    Download the generated file
    """
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
        
    filename = os.path.basename(path)
    media_type = "application/zip" if path.endswith(".zip") else "video/mp4"
    
    return FileResponse(
        path=path, 
        filename=filename, 
        media_type=media_type
    )
