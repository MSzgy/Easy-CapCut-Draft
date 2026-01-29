"""
测试AI服务连接
运行: python test_ai_connection.py
"""
import asyncio
import sys
import os

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.services.ai_service import openai_service


async def test_connection():
    """测试API连接"""
    print("=" * 50)
    print("测试 AI API 连接")
    print("=" * 50)
    print(f"\n配置信息:")
    print(f"  API Base URL: {settings.OPENAI_API_BASE_URL}")
    print(f"  API Key: {settings.GEMINI_API_KEY[:10]}..." if len(settings.GEMINI_API_KEY) > 10 else f"  API Key: {settings.GEMINI_API_KEY}")
    print(f"  Model: {settings.WEB_TOOL_MODEL}")
    print(f"  Max Tokens: {settings.OPENAI_MAX_TOKENS}")
    print("\n" + "=" * 50)

    try:
        print("\n正在测试简单的文本生成...")
        response = await openai_service.generate_completion_gemini_format(
            prompt="请访问https://baidu.com, 介绍这个网站讲了什么",
            max_tokens=100,
        )
        print("\n✅ 连接成功！")
        print(f"\nAI响应:\n{response}")
        print("\n" + "=" * 50)
        return True
    except Exception as e:
        print(f"\n❌ 连接失败！")
        print(f"\n错误信息:\n{str(e)}")
        print("\n请检查:")  
        print("  1. API密钥是否正确")
        print("  2. API地址是否可访问")
        print("  3. 模型名称是否正确")
        print("\n" + "=" * 50)
        return False


async def test_video_script_generation():
    """测试视频文案生成"""
    print("\n\n" + "=" * 50)
    print("测试视频文案生成功能")
    print("=" * 50)

    try:
        print("\n正在生成测试文案...")
        response = await openai_service.generate_video_script(
            theme="健康生活方式",
            description="介绍如何保持健康的日常习惯",
            keywords=["运动", "饮食", "睡眠"],
            style="轻松活泼",
            duration=30,
        )
        print("\n✅ 文案生成成功！")
        print(f"\n生成的文案:\n{response.get('raw_response', '')[:500]}...")
        print("\n" + "=" * 50)
        return True
    except Exception as e:
        print(f"\n❌ 文案生成失败！")
        print(f"\n错误信息:\n{str(e)}")
        print("\n" + "=" * 50)
        return False


async def main():
    """主测试函数"""
    print("\n🚀 开始测试 AI 服务\n")

    # 测试1: 基础连接
    test1_result = await test_connection()

    if test1_result:
        # 测试2: 文案生成
        test2_result = await test_video_script_generation()

        if test2_result:
            print("\n\n🎉 所有测试通过！API配置正确。")
        else:
            print("\n\n⚠️  基础连接成功，但文案生成功能需要调试。")
    else:
        print("\n\n❌ API连接失败，请检查配置。")

    print("\n")


if __name__ == "__main__":
    asyncio.run(main())
