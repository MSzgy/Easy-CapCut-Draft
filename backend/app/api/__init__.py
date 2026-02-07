from fastapi import APIRouter
from app.api.routes import test, ai_content

# 创建主路由
router = APIRouter()

# 注册测试路由
router.include_router(test.router, prefix="/test", tags=["Test"])

# 注册AI内容生成路由
router.include_router(ai_content.router, prefix="/ai", tags=["AI Content"])

# 注册视频生成路由
from app.api.routes import video_gen
router.include_router(video_gen.router, prefix="/video", tags=["Video Generation"])

# 导入子路由（稍后会创建）
# from app.api.routes import projects, media, scripts, covers, music, drafts

# 注册子路由
# router.include_router(projects.router, prefix="/projects", tags=["Projects"])
# router.include_router(media.router, prefix="/media", tags=["Media"])
# router.include_router(scripts.router, prefix="/scripts", tags=["Scripts"])
# router.include_router(covers.router, prefix="/covers", tags=["Covers"])
# router.include_router(music.router, prefix="/music", tags=["Music"])
# router.include_router(drafts.router, prefix="/drafts", tags=["Drafts"])


@router.get("/")
async def api_root():
    """API根路径"""
    return {
        "message": "Easy-CapCut-Draft API",
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": {
            "test": "/api/test",
            "health": "/health",
        }
    }
