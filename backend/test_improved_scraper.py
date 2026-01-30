#!/usr/bin/env python3
"""改进的URL爬虫 - 专门处理PJAX网站"""

import json
import time
from playwright.sync_api import sync_playwright

def run_improved_scraper(url):
    """
    改进的爬虫策略：
    1. 先访问主页建立session
    2. 再通过点击或直接导航到目标页面
    3. 等待PJAX完成
    """
    print("🚀 启动改进版爬虫...")
    
    captured_api_data = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080},
            locale='zh-CN',
            ignore_https_errors=True
        )
        page = context.new_page()

        # 网络监听
        print("📡 设置网络监听器...")
        def handle_response(response):
            if "json" in response.headers.get("content-type", ""):
                try:
                    data = response.json()
                    url_resp = response.url
                    captured_api_data.append({"url": url_resp, "data": data})
                    if "/api/" in url_resp:
                        print(f"   [捕获 API] {url_resp.split('?')[0]}")
                except:
                    pass

        page.on("response", handle_response)

        # 策略1: 先访问主页
        base_url = "/".join(url.split("/")[:3])  # https://halo.mosuyang.org
        print(f"🏠 先访问主页: {base_url}")
        try:
            page.goto(base_url, wait_until='networkidle', timeout=30000)
            time.sleep(2)
            print("   ✓ 主页加载完成")
        except Exception as e:
            print(f"   ⚠️ 主页加载警告: {e}")

        # 策略2: 再访问目标页面
        print(f"🎯 访问目标页面: {url}")
        try:
            # 使用导航而不是直接goto
            page.goto(url, wait_until='networkidle', timeout=60000)
            
            # 验证URL
            current_url = page.url
            print(f"   当前URL: {current_url}")
            
            # 等待页面稳定
            time.sleep(3)
            
            # 检查是否真的在目标页面
            if current_url != url and current_url != url + "/" and not url.startswith(current_url):
                print(f"   ⚠️ 警告：URL不匹配！期望 {url}，实际 {current_url}")
            
        except Exception as e:
            print(f"   ⚠️ 页面加载警告: {e}")

        # 等待并检测文章内容
        print("📝 检测文章内容...")
        content_found = False
        for selector in ["article", ".post-content", "#article-container", "main"]:
            try:
                count = page.locator(selector).count()
                if count > 0:
                    print(f"   ✓ 找到内容容器: {selector} (数量: {count})")
                    content_found = True
                    # 等待内容加载
                    page.wait_for_selector(selector, timeout=5000, state="visible")
                    break
            except:
                continue
        
        if not content_found:
            print("   ⚠️ 未检测到标准文章容器")
        
        # 额外等待
        time.sleep(2)

        # 页面滚动
        print("⬇️ 滚动页面...")
        last_height = 0
        for i in range(10):  # 最多滚动10次
            page.mouse.wheel(0, 1000)
            time.sleep(0.3)
            doc_h = page.evaluate("document.body.scrollHeight")
            if doc_h == last_height:
                break
            last_height = doc_h
        
        print("✅ 滚动完成")
        time.sleep(2)

        # 提取页面元数据
        print("🔧 提取页面信息...")
        page_meta = page.evaluate("""() => {
            return {
                title: document.title,
                url: window.location.href,
                bodyLength: document.body.innerText.length
            }
        }""")
        print(f"   标题: {page_meta['title'][:50]}...")
        print(f"   URL: {page_meta['url']}")
        print(f"   Body文本长度: {page_meta['bodyLength']} 字符")

        # 提取标题
        headings = page.locator("h1, h2, h3, h4").all_inner_texts()
        headings = [h.strip() for h in headings if h.strip()]
        print(f"   提取到 {len(headings)} 个标题")

        # 提取文章内容 - 改进版
        print("📄 提取文章正文...")
        article_content = ""
        
        try:
            # 优先尝试article标签
            if page.locator("article").count() > 0:
                article_content = page.locator("article").first.inner_text()
                print(f"   ✓ 从article标签提取到 {len(article_content)} 字符")
            else:
                # 尝试其他选择器
                selectors = [".post-content", ".article-content", "#article-container", "main"]
                for sel in selectors:
                    if page.locator(sel).count() > 0:
                        article_content = page.locator(sel).first.inner_text()
                        print(f"   ✓ 从{sel}提取到 {len(article_content)} 字符")
                        break
                
                # 最后尝试提取所有段落
                if not article_content or len(article_content) < 200:
                    paragraphs = page.locator("p").all_inner_texts()
                    article_content = "\n\n".join([p.strip() for p in paragraphs if len(p.strip()) > 30])
                    print(f"   ✓ 从段落提取到 {len(article_content)} 字符")
        except Exception as e:
            print(f"   ⚠️ 提取内容出错: {e}")

        # 截图
        print("📸 生成截图...")
        page.screenshot(path="result_full.png", full_page=True)
        print("   -> 已保存: result_full.png")

        # PDF
        print("📄 生成PDF...")
        page.emulate_media(media="screen")
        page.pdf(path="result_page.pdf", format="A4", print_background=True)
        print("   -> 已保存: result_page.pdf")

        # 保存数据
        print("💾 保存数据...")
        
        html_source = page.content()
        
        with open("result_api_data.json", "w", encoding="utf-8") as f:
            json.dump(captured_api_data, f, ensure_ascii=False, indent=2)
        print("   -> 已保存: result_api_data.json")

        with open("result_extracted_text.txt", "w", encoding="utf-8") as f:
            f.write(f"页面标题: {page_meta['title']}\n")
            f.write(f"页面链接: {page_meta['url']}\n")
            f.write(f"Body长度: {page_meta['bodyLength']} 字符\n")
            f.write("-" * 60 + "\n")
            f.write("标题列表:\n")
            for h in headings[:20]:  # 只保存前20个标题
                f.write(f"- {h}\n")
            f.write("\n" + "=" * 60 + "\n")
            f.write("文章正文:\n")
            f.write("=" * 60 + "\n")
            f.write(article_content if article_content else "(未提取到内容)")
        print("   -> 已保存: result_extracted_text.txt")
        
        with open("result_source.html", "w", encoding="utf-8") as f:
            f.write(html_source)
        print("   -> 已保存: result_source.html")

        browser.close()
        print("\n🎉 完成！")

if __name__ == "__main__":
    test_url = "https://halo.mosuyang.org/archives/fine-tuning-and-reinforcement-learning-for-llms-intro-to-post-training"
    run_improved_scraper(test_url)
