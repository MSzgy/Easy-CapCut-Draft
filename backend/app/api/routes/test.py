from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.ai_service import openai_service

router = APIRouter()


class TestRequest(BaseModel):
    """测试请求"""
    prompt: str = "你好，请介绍一下你自己"


class TestResponse(BaseModel):
    """测试响应"""
    success: bool
    message: str
    ai_response: str = None


@router.get("/")
async def test_root():
    """测试路由根路径"""
    return {
        "message": "Test API endpoints",
        "endpoints": [
            "GET /api/test/",
            "POST /api/test/ai",
            "GET /api/test/ping",
        ]
    }


@router.get("/ping")
async def ping():
    """简单的ping测试"""
    return {"status": "pong", "message": "Server is running"}


@router.post("/ai", response_model=TestResponse)
async def test_ai(request: TestRequest):
    """测试AI连接"""
    try:
        response = await openai_service.generate_completion(
            prompt=request.prompt,
            system_message="你是一个友好的助手。",
            max_tokens=100,
        )

        return TestResponse(
            success=True,
            message="AI连接成功",
            ai_response=response
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI调用失败: {str(e)}"
        )
