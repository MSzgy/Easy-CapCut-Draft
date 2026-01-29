from playwright.sync_api import sync_playwright
import time

def capture_full_page(url, output_filename="full_page_screenshot.png"):
    with sync_playwright() as p:
        # 1. 启动浏览器 (建议调试均设为 headless=False 看看是否能弹出窗口)
        # 生产环境可以改回 True
        browser = p.chromium.launch(headless=True)
        
        # 2. 伪装 User-Agent (这是解决 ERR_CONNECTION_CLOSED 的关键)
        # 使用真实的 Mac Chrome UA
        mac_user_agent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent=mac_user_agent,    # 核心修改：伪装 UA
            ignore_https_errors=True,     # 核心修改：忽略 SSL 报错
            locale='zh-CN'
        )
        page = context.new_page()

        print(f"正在访问: {url} ...")
        
        try:
            # 3. 降低等待策略 (从 networkidle 改为 domcontentloaded)
            # networkidle 太容易超时或报错，domcontentloaded 只要 HTML 加载完就开始滚动
            page.goto(url, wait_until='domcontentloaded', timeout=60000)
        except Exception as e:
            print(f"访问出错，尝试继续执行（可能是由于统计脚本未加载完成）: {e}")
            # 如果只是超时，网页可能已经渲染出来了，不要直接退，继续往下跑

        # --- 关键步骤：模拟滚动以触发懒加载 (Lazy Load) ---
        print("开始模拟滚动以加载图片...")
        
        # 强制等待 2 秒让首屏渲染完
        time.sleep(2)
        
        last_height = 0
        
        while True:
            # 向下滚动
            page.mouse.wheel(0, 1000)
            time.sleep(0.5)  # Python 的 sleep 比 page.wait_for_timeout 有时更稳定
            
            # 获取当前高度信息
            current_scroll_y = page.evaluate("window.scrollY")
            viewport_height = page.evaluate("window.innerHeight")
            doc_height = page.evaluate("document.body.scrollHeight")
            
            # 判断是否到底 (允许 50px 的误差)
            if (current_scroll_y + viewport_height) >= (doc_height - 50):
                print("到达页面底部")
                break
            
            # 防死循环机制：如果滚了一次高度没变，做一个计数器判断（此处简化处理）
            # 在某些无限加载页面很有用
            
            last_height = doc_height

        print("滚动完成，等待图片最终渲染...")
        time.sleep(2)

        # --- 核心步骤：整页截图 ---
        print(f"正在保存长截图到: {output_filename}")
        
        try:
            page.screenshot(path=output_filename, full_page=True)
            print("截图成功！")
        except Exception as e:
            print(f"截图保存失败: {e}")
            
        browser.close()

if __name__ == "__main__":
    target_url = "https://m.sohu.com/a/981507665_130887?scm=10001.325_13-325_13.0.0-0-0-0-0.5_1334"
    capture_full_page(target_url, "blog_full.png")
