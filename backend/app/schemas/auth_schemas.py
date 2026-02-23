"""
鉴权相关 Pydantic Schema
"""
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """登录请求"""
    email: EmailStr
    password: str = Field(..., min_length=6)


class RegisterRequest(BaseModel):
    """注册请求"""
    email: EmailStr
    username: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    """用户信息响应"""
    id: str
    email: str
    username: str
    role: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """登录/注册成功响应"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
