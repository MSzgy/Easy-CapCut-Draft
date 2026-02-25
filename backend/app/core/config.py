from pydantic_settings import BaseSettings
from typing import List
from functools import lru_cache


class Settings(BaseSettings):
    """应用配置"""

    # 应用信息
    APP_NAME: str = "Easy-CapCut-Draft"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # 数据库配置
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 0

    # Redis配置
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT配置
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # CORS配置
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # 文件上传配置
    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 500
    MAX_IMAGE_SIZE_MB: int = 10
    ALLOWED_IMAGE_EXTENSIONS: str = "jpg,jpeg,png,gif,webp"
    ALLOWED_VIDEO_EXTENSIONS: str = "mp4,mov,avi,webm"

    # ─── Gemini 配置 ───
    GEMINI_BASE_URL: str = "https://cpa.mosuyang.org"
    GEMINI_API_KEY: str = ""
    GEMINI_TEXT_MODEL: str = "gemini-2.5-flash"
    GEMINI_IMAGE_MODEL: str = "gemini-3-pro-image-preview"
    GEMINI_MAX_TOKENS: int = 200000
    GEMINI_OFFICIAL_API_KEY: str = ""  # 直连 Google 官方 API 的 key（用于视频分析等需要 Files API 的功能）

    # ─── OpenAI 兼容配置 ───
    OPENAI_BASE_URL: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    # ─── HuggingFace 配置 ───
    HF_TOKEN: str = ""
    HF_SPACES: str = '{}'  # JSON: {"alias": "owner/space-name"}

    # ─── Provider 选择 ───
    TEXT_PROVIDER: str = "gemini"
    IMAGE_PROVIDER: str = "gemini"
    VISION_PROVIDER: str = "gemini"
    VIDEO_PROVIDER: str = "huggingface"

    # 可选的Claude配置
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-opus-20240229"

    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # 速率限制
    RATE_LIMIT_PER_MINUTE: int = 60

    # 管理员种子账户
    ADMIN_EMAIL: str = "admin@clipforge.app"
    ADMIN_PASSWORD: str = "admin123456"

    # ─── 向后兼容的属性 ───

    @property
    def OPENAI_API_BASE_URL(self) -> str:
        """向后兼容：旧代码中引用此属性"""
        return self.GEMINI_BASE_URL

    @property
    def WEB_TOOL_MODEL(self) -> str:
        return self.GEMINI_TEXT_MODEL

    @property
    def IMAGE_MODEL(self) -> str:
        return self.GEMINI_IMAGE_MODEL

    @property
    def OPENAI_MAX_TOKENS(self) -> int:
        return self.GEMINI_MAX_TOKENS

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """获取配置实例（缓存）"""
    return Settings()


# 导出配置实例
settings = get_settings()
