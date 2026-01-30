#!/usr/bin/env python3
"""
测试URL内容提取功能（使用爬虫+多模态LLM）

这个脚本会：
1. 调用 extract_url_content 函数
2. 爬虫会自动运行，生成 PNG 和 HTML
3. 这些文件会被读取并发送给大模型
4. 大模型会分析图片和HTML，返回网站内容
"""

import asyncio
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.api.routes.ai_content import extract_url_content


async def test_extract_url():
    """测试从URL提取内容"""
    
    # 测试的URL
    test_url = "https://www.msn.cn/zh-cn/news/other/%E6%98%A8%E6%97%A5%E5%9B%A0%E6%9E%9C%E6%98%A8%E6%97%A5%E4%BA%86-%E8%BF%99%E6%AC%A1%E9%BB%84%E6%99%93%E6%98%8E%E5%92%8C%E6%9D%A8%E9%A2%96%E8%81%94%E6%89%8B-%E7%BB%99%E6%89%80%E6%9C%89%E7%A6%BB%E5%BC%82%E5%A4%AB%E5%A6%BB%E4%B8%8A%E4%BA%86%E4%B8%80%E8%AF%BE/ar-AA1V8psr?ocid=BingHp01&cvid=d2370af40c9943a381eb2e989e8a8393&ei=9"
    
    print("="*60)
    print(f"测试URL内容提取功能")
    print("="*60)
    print(f"目标URL: {test_url}")
    print()
    
    # 调用提取函数
    result = await extract_url_content(test_url)
    
    # 打印结果
    print("\n" + "="*60)
    print("提取结果:")
    print("="*60)
    print(f"\n📌 标题: {result['title']}")
    print(f"\n📝 描述: {result['description']}")
    print(f"\n🏷️  关键词: {', '.join(result['keywords'])}")
    print(f"\n📄 主要内容:\n{result['main_content']}")
    print("\n" + "="*60)


if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════╗
║    URL内容提取测试 (爬虫 + 多模态LLM)                      ║
╚══════════════════════════════════════════════════════════╝

这个测试会：
✓ 运行爬虫抓取网页
✓ 生成完整截图 (PNG)
✓ 保存HTML源码
✓ 将图片和HTML发送给大模型
✓ 大模型分析并提取网站内容
    """)
    
    asyncio.run(test_extract_url())
