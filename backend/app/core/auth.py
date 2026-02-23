"""
鉴权工具模块：密码哈希、JWT 生成/验证、FastAPI 依赖
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db

# ── 密码工具 ──────────────────────────────────────────────────────────────────


def hash_password(plain: str) -> str:
    """对明文密码进行 bcrypt 哈希"""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """验证明文密码与哈希是否匹配"""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT 工具 ──────────────────────────────────────────────────────────────────

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """生成 JWT access token"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


# ── FastAPI 依赖 ──────────────────────────────────────────────────────────────

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    解析 Bearer token，返回 User 对象。
    若 token 缺失或无效，抛出 401。
    """
    from app.models.models import User  # 避免循环导入

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="未认证或 token 无效",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if token is None:
        raise credentials_exception

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise credentials_exception

    return user


async def require_admin(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    """
    要求当前用户为管理员，否则 403。
    """
    user = await get_current_user(token, db)
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限",
        )
    return user
