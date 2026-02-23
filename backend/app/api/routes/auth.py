"""
鉴权路由：登录、注册、获取当前用户
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.core.database import get_db
from app.models.models import User, UserRole
from app.schemas.auth_schemas import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter()


def _build_token_response(user: User) -> dict:
    """构建统一的 token 响应"""
    token = create_access_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            role=user.role,
        ),
    ).model_dump()


@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """用户登录，返回 JWT token"""
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误",
        )

    return _build_token_response(user)


@router.post("/register")
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """注册新订阅用户"""
    # 检查 email 唯一
    existing = await db.execute(select(User).where(User.email == request.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已注册",
        )

    # 检查 username 唯一
    existing = await db.execute(select(User).where(User.username == request.username))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该用户名已存在",
        )

    user = User(
        id=str(uuid.uuid4()),
        email=request.email,
        username=request.username,
        hashed_password=hash_password(request.password),
        role=UserRole.SUBSCRIBER,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return _build_token_response(user)


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        role=current_user.role,
    ).model_dump()
