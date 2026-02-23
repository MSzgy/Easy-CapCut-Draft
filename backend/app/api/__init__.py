from fastapi import APIRouter
from app.api.routes import test, ai_content, video_gen, projects, auth

# 创建主路由
router = APIRouter()

# 注册鉴权路由
router.include_router(auth.router, prefix="/auth", tags=["Auth"])

# 注册测试路由
router.include_router(test.router, prefix="/test", tags=["Test"])

# 注册AI内容生成路由
router.include_router(ai_content.router, prefix="/ai", tags=["AI Content"])

# 注册视频生成路由
router.include_router(video_gen.router, prefix="/video", tags=["Video Generation"])

# 注册项目持久化路由
router.include_router(projects.router, prefix="/data", tags=["Data Persistence"])


@router.get("/")
async def api_root():
    """API根路径"""
    return {
        "message": "Easy-CapCut-Draft API",
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": {
            "test": "/api/test",
            "ai": "/api/ai",
            "data": "/api/data",
            "health": "/health",
        }
    }

