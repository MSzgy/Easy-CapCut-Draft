"""
调试AI API连接 - 显示详细的请求信息
运行: python debug_api.py
"""
import asyncio
import httpx
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings


async def debug_api_call():
    """调试API调用，显示完整请求和响应"""
    print("=" * 60)
    print("AI API 调试工具")
    print("=" * 60)

    # 显示配置
    print(f"\n📋 当前配置:")
    print(f"  Base URL: {settings.OPENAI_API_BASE_URL}")
    print(f"  API Key: {settings.GEMINI_API_KEY[:20]}..." if len(settings.GEMINI_API_KEY) > 20 else f"  API Key: {settings.GEMINI_API_KEY}")
    print(f"  Model: {settings.OPENAI_MODEL}")

    # 构建请求
    base_url = settings.OPENAI_API_BASE_URL.rstrip('/')
    endpoint = "/chat/completions"
    full_url = f"{base_url}{endpoint}"

    headers = {
        "Authorization": f"Bearer {settings.GEMINI_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": settings.OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "你好，请用一句话介绍你自己。"}
        ],
        "temperature": 0.7,
        "max_tokens": 100,
    }

    print(f"\n🔗 完整URL:")
    print(f"  {full_url}")

    print(f"\n📤 请求头:")
    for key, value in headers.items():
        if key == "Authorization":
            print(f"  {key}: Bearer {settings.GEMINI_API_KEY[:20]}...")
        else:
            print(f"  {key}: {value}")

    print(f"\n📦 请求体:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))

    # 发送请求
    print(f"\n🚀 发送请求...")
    print("-" * 60)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(full_url, headers=headers, json=payload)

            print(f"\n✅ 响应状态码: {response.status_code}")
            print(f"\n📥 响应头:")
            for key, value in response.headers.items():
                print(f"  {key}: {value}")

            print(f"\n📄 响应体:")
            try:
                response_json = response.json()
                print(json.dumps(response_json, indent=2, ensure_ascii=False))

                # 如果成功，提取消息
                if response.status_code == 200 and "choices" in response_json:
                    content = response_json["choices"][0]["message"]["content"]
                    print(f"\n💬 AI回复:")
                    print(f"  {content}")
            except Exception as e:
                print(f"  [原始文本] {response.text}")

            response.raise_for_status()

        except httpx.HTTPStatusError as e:
            print(f"\n❌ HTTP错误: {e.response.status_code}")
            print(f"\n错误详情:")
            print(e.response.text)
        except httpx.RequestError as e:
            print(f"\n❌ 请求错误: {str(e)}")
        except Exception as e:
            print(f"\n❌ 未知错误: {str(e)}")

    print("\n" + "=" * 60)

    # 提供建议
    print("\n💡 常见问题排查:")
    print("  1. 检查API地址是否正确（是否需要/v1等后缀）")
    print("  2. 检查模型名称是否正确")
    print("  3. 检查API密钥是否有效")
    print("  4. 检查是否需要额外的请求头（如User-Agent等）")
    print("  5. 检查API文档确认正确的端点和格式")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(debug_api_call())
