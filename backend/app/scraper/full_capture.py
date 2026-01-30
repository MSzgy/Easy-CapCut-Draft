import json
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

def run_all_scrapers(url, output_dir=".", homepage_timeout=15000, page_timeout=30000):
    """全能爬虫 - 使用Playwright抓取网页内容
    
    Args:
        url: 目标URL
        output_dir: 输出目录路径，默认为当前目录
        homepage_timeout: 主页加载超时时间（毫秒），默认15秒
        page_timeout: 目标页面加载超时时间（毫秒），默认30秒
    
    Returns:
        str: 输出目录的绝对路径
    """
    print("🚀 启动全能爬虫...")
    
    # 验证URL格式
    try:
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError(f"无效的URL格式: {url}")
        print(f"✓ URL验证通过: {parsed.scheme}://{parsed.netloc}")
    except Exception as e:
        print(f"❌ URL验证失败: {e}")
        raise
    
    # 确保输出目录存在
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    print(f"📁 输出目录: {output_path.absolute()}")
    
    # 准备一个列表，用来存放监听到的后台 API 数据
    captured_api_data = []

    with sync_playwright() as p:
        # [重要] 生成 PDF 必须使用 headless=True (无头模式)
        browser = p.chromium.launch(headless=True)
        
        # 1. 设置浏览器上下文 (伪装成 Mac Chrome)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080},
            locale='zh-CN',
            ignore_https_errors=True
        )
        page = context.new_page()

        # ---------------------------------------------------------
        # 能力 A: 网络拦截 (Network Interception)
        # ---------------------------------------------------------
        print("📡 正在设置网络监听器...")
        
        def handle_response(response):
            # 过滤：只抓取 JSON 类型且包含 api 路径的响应
            if "json" in response.headers.get("content-type", ""):
                try:
                    # 获取数据
                    data = response.json()
                    url = response.url
                    # 存入列表
                    captured_api_data.append({"url": url, "data": data})
                    # 打印简短日志
                    if "/api/" in url:
                        print(f"   [捕获 API] {url.split('?')[0]}")
                except:
                    pass

        # 挂载监听事件
        page.on("response", handle_response)

        # ---------------------------------------------------------
        # 改进的访问策略 - 处理PJAX网站
        # ---------------------------------------------------------
        # 策略：先访问主页建立session，然后再访问目标页面
        base_url = "/".join(url.split("/")[:3])  # 提取base URL (e.g., https://example.com)
        
        print(f"🏠 先访问主页: {base_url}")
        homepage_loaded = False
        try:
            page.goto(base_url, wait_until='networkidle', timeout=homepage_timeout)
            time.sleep(2)
            homepage_loaded = True
            print("   ✓ 主页加载完成")
        except PlaywrightTimeout:
            print(f"   ⚠️ 主页加载超时（{homepage_timeout}ms），继续尝试目标页面")
        except Exception as e:
            print(f"   ⚠️ 主页加载警告: {e}，继续尝试目标页面")
        
        print(f"🌍 正在访问目标页面: {url}")
        page_loaded = False
        try:
            # 对于PJAX等动态网站，使用networkidle等待策略
            page.goto(url, wait_until='networkidle', timeout=page_timeout)
            page_loaded = True
            
            # 验证是否真的在目标页面
            current_url = page.url
            print(f"   ✓ 当前页面URL: {current_url}")
            
            # 检查URL是否匹配（更宽松的匹配）
            url_normalized = url.rstrip('/')
            current_normalized = current_url.rstrip('/')
            if current_normalized != url_normalized and not current_normalized.startswith(url_normalized):
                print(f"   ⚠️ 警告：URL不匹配！期望 {url_normalized}，实际 {current_normalized}")
            else:
                print(f"   ✓ URL匹配确认")
            
            # 等待页面稳定
            time.sleep(3)
            
        except PlaywrightTimeout:
            print(f"   ⚠️ 页面加载超时（{page_timeout}ms），但将继续尝试提取内容")
            time.sleep(2)  # 给页面一些额外时间
        except Exception as e:
            print(f"   ⚠️ 页面加载错误: {e}，将尝试继续处理")
            time.sleep(2)

        # ---------------------------------------------------------
        # 检测文章内容加载 - 增强版
        # ---------------------------------------------------------
        print("📝 检测文章内容...")
        content_found = False
        found_selector = None
        
        # 扩展的选择器列表，按优先级排序
        selectors = [
            "article",
            ".post-content", ".article-content", ".entry-content",
            "#article-container", "#content", "#main-content",
            "main article", "main",
            ".container article", ".content article",
            "[role='article']", "[role='main']"
        ]
        
        for selector in selectors:
            try:
                count = page.locator(selector).count()
                if count > 0:
                    # 验证是否包含实际内容（检查文本长度）
                    text_length = len(page.locator(selector).first.inner_text())
                    if text_length > 100:  # 至少100字符才算有效内容
                        print(f"   ✓ 找到内容容器: {selector} (数量: {count}, 文本长度: {text_length})")
                        content_found = True
                        found_selector = selector
                        try:
                            page.wait_for_selector(selector, timeout=3000, state="visible")
                        except:
                            pass
                        break
            except Exception as e:
                continue
        
        if not content_found:
            print("   ⚠️ 未检测到标准文章容器，将使用通用提取方法")
        
        time.sleep(2)

        # ---------------------------------------------------------
        # 模拟滚动 (为了触发懒加载，确保截图完整)
        # ---------------------------------------------------------
        print("⬇️ 开始向下滚动页面以加载内容...")
        last_height = 0
        for i in range(10):  # 最多滚动10次
            page.mouse.wheel(0, 1000)
            time.sleep(0.3)
            doc_h = page.evaluate("document.body.scrollHeight")
            if doc_h == last_height:
                break
            last_height = doc_h
        
        print("✅ 页面滚动完成，等待渲染稳定...")
        time.sleep(2)

        # ---------------------------------------------------------
        # 能力 B: 执行 JavaScript (JS Execution)
        # ---------------------------------------------------------
        print("🔧 正在执行页面 JavaScript...")
        # 获取当前页面的标题、地址、和性能数据
        page_meta = page.evaluate("""() => {
            return {
                title: document.title,
                url: window.location.href,
                userAgent: navigator.userAgent,
                links_count: document.querySelectorAll('a').length
            }
        }""")
        print(f"   JS 返回数据: {tag_log(page_meta)}")

        # ---------------------------------------------------------
        # 能力 C: DOM 元素提取 (Text Extraction)
        # ---------------------------------------------------------
        print("📝 正在提取页面可见文本...")
        # 提取所有 H1-H4 标题
        headings = page.locator("h1, h2, h3, h4").all_inner_texts()
        # 清理空标题
        headings = [h.strip() for h in headings if h.strip()]
        
        # 提取文章正文内容 - 增强版
        print("📄 提取文章正文...")
        article_content = ""
        extraction_method = "unknown"
        
        try:
            # 策略1：使用之前检测到的选择器
            if found_selector:
                try:
                    article_content = page.locator(found_selector).first.inner_text()
                    extraction_method = found_selector
                    print(f"   ✓ 从检测到的容器 {found_selector} 提取到 {len(article_content)} 字符")
                except Exception as e:
                    print(f"   ⚠️ 使用检测到的选择器失败: {e}")
            
            # 策略2：尝试标准article标签
            if not article_content or len(article_content) < 200:
                if page.locator("article").count() > 0:
                    article_content = page.locator("article").first.inner_text()
                    extraction_method = "article"
                    print(f"   ✓ 从article标签提取到 {len(article_content)} 字符")
            
            # 策略3：尝试常见的内容选择器
            if not article_content or len(article_content) < 200:
                content_selectors = [
                    ".post-content", ".article-content", ".entry-content",
                    "#article-container", "#content", "#main-content",
                    "main", "[role='article']", ".markdown-body"
                ]
                for sel in content_selectors:
                    try:
                        if page.locator(sel).count() > 0:
                            temp_content = page.locator(sel).first.inner_text()
                            if len(temp_content) > len(article_content):
                                article_content = temp_content
                                extraction_method = sel
                                print(f"   ✓ 从{sel}提取到 {len(article_content)} 字符")
                    except:
                        continue
            
            # 策略4：智能段落提取（过滤导航、页脚等）
            if not article_content or len(article_content) < 200:
                print("   → 尝试智能段落提取...")
                try:
                    # 排除导航、页脚等区域的段落
                    all_paragraphs = page.locator("p").all_inner_texts()
                    # 过滤：段落长度>30字符，且不在导航/页脚区域
                    valid_paragraphs = []
                    for p in all_paragraphs:
                        p_clean = p.strip()
                        if len(p_clean) > 30 and not any(skip in p_clean.lower() for skip in ['cookie', 'privacy policy', '© 20']):
                            valid_paragraphs.append(p_clean)
                    
                    article_content = "\n\n".join(valid_paragraphs)
                    extraction_method = "smart_paragraph_extraction"
                    print(f"   ✓ 智能段落提取到 {len(valid_paragraphs)} 段，共 {len(article_content)} 字符")
                except Exception as e:
                    print(f"   ⚠️ 智能段落提取失败: {e}")
            
            # 验证提取结果
            if not article_content:
                print("   ❌ 未能提取到任何内容")
            elif len(article_content) < 100:
                print(f"   ⚠️ 提取的内容过短 ({len(article_content)} 字符)，可能不完整")
            else:
                print(f"   ✅ 内容提取成功！方法: {extraction_method}, {len(article_content)} 字符")
                
        except Exception as e:
            print(f"   ❌ 提取内容严重错误: {e}")
            import traceback
            traceback.print_exc()
        
        # 保存 DOM 结构
        html_source = page.content()

        # ---------------------------------------------------------
        # 能力 D: 截图 (Screenshot)
        # ---------------------------------------------------------
        print("📸 正在生成长截图...")
        screenshot_path = output_path / "result_full.png"
        page.screenshot(path=str(screenshot_path), full_page=True)
        print(f"   -> 已保存: {screenshot_path}")

        # ---------------------------------------------------------
        # 能力 E: 生成 PDF
        # ---------------------------------------------------------
        print("📄 正在生成 PDF 文档...")
        # 开启背景打印，让样式更好看
        page.emulate_media(media="screen")
        pdf_path = output_path / "result_page.pdf"
        page.pdf(path=str(pdf_path), format="A4", print_background=True)
        print(f"   -> 已保存: {pdf_path}")

        # ---------------------------------------------------------
        # 最后保存数据文件
        # ---------------------------------------------------------
        print("💾 正在保存数据文件...")
        
        # 保存拦截到的 API 数据
        api_data_path = output_path / "result_api_data.json"
        with open(api_data_path, "w", encoding="utf-8") as f:
            json.dump(captured_api_data, f, ensure_ascii=False, indent=2)
        print(f"   -> 已保存: {api_data_path} (包含后台接口数据)")

        # 保存解析到的标题和正文
        text_path = output_path / "result_extracted_text.txt"
        with open(text_path, "w", encoding="utf-8") as f:
            f.write(f"页面标题: {page_meta['title']}\n")
            f.write(f"页面链接: {page_meta['url']}\n")
            f.write("-" * 60 + "\n")
            f.write("标题列表:\n")
            for h in headings[:20]:  # 只保存前20个标题
                f.write(f"- {h}\n")
            f.write("\n" + "=" * 60 + "\n")
            f.write("文章正文:\n")
            f.write("=" * 60 + "\n")
            f.write(article_content if article_content else "(未提取到内容)")
        print(f"   -> 已保存: {text_path}")
        
        # 保存 HTML
        html_path = output_path / "result_source.html"
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_source)
        print(f"   -> 已保存: {html_path}")

        browser.close()
        print("\n🎉 所有任务执行完毕！")
        
        return str(output_path.absolute())

def tag_log(data):
    # 只是为了日志打印好看一点
    return str(data)[:100] + "..." if len(str(data)) > 100 else str(data)

