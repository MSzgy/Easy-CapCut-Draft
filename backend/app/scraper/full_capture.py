import json
import time
from playwright.sync_api import sync_playwright

def run_all_scrapers(url):
    print("🚀 启动全能爬虫...")
    
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
        # 开始访问
        # ---------------------------------------------------------
        print(f"🌍 正在访问: {url}")
        try:
            page.goto(url, wait_until='domcontentloaded', timeout=60000)
        except Exception as e:
            print(f"⚠️ 页面加载可能超时，尝试继续处理: {e}")

        # ---------------------------------------------------------
        # 模拟滚动 (为了触发懒加载，确保截图完整)
        # ---------------------------------------------------------
        print("⬇️ 开始向下滚动页面以加载内容...")
        time.sleep(2)
        last_height = 0
        while True:
            page.mouse.wheel(0, 1000)
            time.sleep(0.5)
            curr_y = page.evaluate("window.scrollY")
            doc_h = page.evaluate("document.body.scrollHeight")
            if curr_y + 1200 >= doc_h: # 接近底部
                break
            # 简单的防死循环检查
            if doc_h == last_height:
                break
            last_height = doc_h
        
        print("✅ 页面滚动完成，等待渲染稳定...")
        time.sleep(2) # 等待最后的图片加载

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
        # 提取所有 H1-H3 标题
        headings = page.locator("h1, h2, h3").all_inner_texts()
        # 清理空标题
        headings = [h for h in headings if h.strip()]
        
        # 保存 DOM 结构
        html_source = page.content()

        # ---------------------------------------------------------
        # 能力 D: 截图 (Screenshot)
        # ---------------------------------------------------------
        print("📸 正在生成长截图...")
        page.screenshot(path="result_full.png", full_page=True)
        print("   -> 已保存: result_full.png")

        # ---------------------------------------------------------
        # 能力 E: 生成 PDF
        # ---------------------------------------------------------
        print("📄 正在生成 PDF 文档...")
        # 开启背景打印，让样式更好看
        page.emulate_media(media="screen") 
        page.pdf(path="result_page.pdf", format="A4", print_background=True)
        print("   -> 已保存: result_page.pdf")

        # ---------------------------------------------------------
        # 最后保存数据文件
        # ---------------------------------------------------------
        print("💾 正在保存数据文件...")
        
        # 保存拦截到的 API 数据
        with open("result_api_data.json", "w", encoding="utf-8") as f:
            json.dump(captured_api_data, f, ensure_ascii=False, indent=2)
        print("   -> 已保存: result_api_data.json (包含后台接口数据)")

        # 保存解析到的标题
        with open("result_extracted_text.txt", "w", encoding="utf-8") as f:
            f.write(f"页面标题: {page_meta['title']}\n")
            f.write(f"页面链接: {page_meta['url']}\n")
            f.write("-" * 20 + "\n")
            f.write("抓取到的文章标题/副标题:\n")
            for h in headings:
                f.write(f"- {h}\n")
        print("   -> 已保存: result_extracted_text.txt")
        
        # 保存 HTML
        with open("result_source.html", "w", encoding="utf-8") as f:
            f.write(html_source)
        print("   -> 已保存: result_source.html")

        browser.close()
        print("\n🎉 所有任务执行完毕！")

def tag_log(data):
    # 只是为了日志打印好看一点
    return str(data)[:100] + "..." if len(str(data)) > 100 else str(data)

if __name__ == "__main__":
    target_url = "https://halo.mosuyang.org"
    run_all_scrapers(target_url)
