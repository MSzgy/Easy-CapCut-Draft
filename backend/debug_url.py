#!/usr/bin/env python3
"""调试脚本：检查URL访问情况"""

from playwright.sync_api import sync_playwright
import time

target_url = "https://halo.mosuyang.org/archives/fine-tuning-and-reinforcement-learning-for-llms-intro-to-post-training"

print(f"目标URL: {target_url}")
print("="*60)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False)  # 使用有头模式观察
    
    context = browser.new_context(
        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport={'width': 1920, 'height': 1080},
        locale='zh-CN',
    )
    page = context.new_page()
    
    print("🌍 访问目标URL...")
    page.goto(target_url, wait_until='networkidle', timeout=60000)
    
    time.sleep(3)
    
    current_url = page.url
    title = page.title()
    
    print(f"\n加载后的URL: {current_url}")
    print(f"页面标题: {title}")
    print(f"URL是否匹配: {current_url == target_url}")
    
    # 检查是否有article元素
    article_count = page.locator("article").count()
    print(f"\narticle 元素数量: {article_count}")
    
    # 检查页面内容
    if article_count > 0:
        article_text = page.locator("article").first.inner_text()
        print(f"文章内容长度: {len(article_text)} 字符")
        print(f"内容预览:\n{article_text[:200]}...")
    else:
        print("⚠️ 未找到article元素")
        
        # 检查整个body
        body_text = page.locator("body").inner_text()
        print(f"Body内容长度: {len(body_text)} 字符")
        print(f"Body预览:\n{body_text[:300]}...")
    
    print("\n按Enter键继续（可以手动检查浏览器窗口）...")
    input()
    
    browser.close()
