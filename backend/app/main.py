from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.database import init_db, close_db
from app.api import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # 尝试初始化数据库（如果数据库不可用也能继续运行）
    try:
        await init_db()
        print("✅ Database initialized")
    except Exception as e:
        print(f"⚠️  Database initialization skipped: {e}")
        print("   (Application will run without database)")

    yield

    # 关闭时执行
    print("👋 Shutting down...")
    try:
        await close_db()
        print("✅ Database connections closed")
    except Exception as e:
        print(f"⚠️  Database cleanup skipped: {e}")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="智能视频内容生成与剪映草稿转换工具 API",
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加 Gzip 压缩
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 注册路由
app.include_router(router, prefix="/api")

# 挂载静态文件目录 (用于访问生成的视频)
import os
from fastapi.staticfiles import StaticFiles

# 确保 static 目录存在
os.makedirs("static/videos", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def root():
    """根路径"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
