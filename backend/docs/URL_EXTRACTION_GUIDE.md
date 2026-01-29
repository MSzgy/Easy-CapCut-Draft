# URL内容提取功能 - 使用说明

## 功能说明

现在 `extract_url_content` 函数已经升级，可以使用**爬虫 + 多模态大模型**的方式来提取网站内容。

### 工作流程

```
用户提供URL
    ↓
调用 extract_url_content(url)
    ↓
自动运行爬虫 (full_capture.py)
    ↓
生成文件：
  - result_full.png (网页截图)
  - result_source.html (HTML源码)
  - result_extracted_text.txt (提取的文本)
    ↓
读取文件内容
    ↓
发送给大模型 (Gemini 2.0 Flash)
  - 图片 (PNG base64)
  - HTML 片段
  - 提取的文本
    ↓
大模型多模态分析（同时看图和读代码）
    ↓
返回结构化内容：
  - title (标题)
  - description (描述)
  - keywords (关键词)
  - main_content (主要内容)
```

## 优势

相比之前的纯URL方式，新方法的优势：

1. **更准确** - 大模型可以"看到"网页的实际样子
2. **更全面** - 同时分析视觉内容、HTML结构和文本
3. **更可靠** - 不依赖Gemini的URL访问功能（可能被限制）
4. **更智能** - 多模态分析，理解图片中的文字和设计

## 使用方法

### 方法1: 直接调用函数

```python
from app.api.routes.ai_content import extract_url_content

result = await extract_url_content("https://example.com")

print(result['title'])          # 网站标题
print(result['description'])    # 网站描述
print(result['keywords'])       # 关键词列表
print(result['main_content'])   # 主要内容
```

### 方法2: 通过API调用

```bash
# 使用现有的API接口（generate_scenes_from_url）
curl -X POST http://localhost:8000/api/ai/generate-content \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "url",
    "url": "https://example.com",
    "videoStyle": "promo",
    "copyStyle": "professional"
  }'
```

这个API会自动调用 `extract_url_content`，然后基于提取的内容生成视频场景和文案。

### 方法3: 使用测试脚本

```bash
cd /Users/zouguoyang/Desktop/Easy-CapCut-Draft/backend
python test_url_extract.py
```

## 返回数据格式

```json
{
  "title": "网站标题",
  "description": "网站的简短描述，100字以内",
  "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
  "main_content": "网站的主要内容详情，300-500字，包含核心价值信息"
}
```

## 配置说明

### 文件位置

生成的文件保存在：
```
backend/app/scraper/
├── result_full.png          # 网页完整截图
├── result_source.html       # HTML源代码
├── result_extracted_text.txt # 提取的文本
├── result_api_data.json     # API数据
└── result_page.pdf          # PDF文档
```

### 修改爬虫超时时间

如果网站加载很慢，可以修改 `app/scraper/full_capture.py` 中的超时设置：

```python
page.goto(url, wait_until='domcontentloaded', timeout=60000)  # 60秒
```

### 限制HTML长度

为避免token过多，HTML内容被限制在20000字符：

```python
html_content = f.read()[:20000]  # 可以调整这个数字
```

## 调试

### 查看爬虫日志

爬虫运行时会输出详细日志：
```
🚀 启动全能爬虫...
📡 正在设置网络监听器...
🌍 正在访问: https://example.com
⬇️ 开始向下滚动页面以加载内容...
✅ 页面滚动完成，等待渲染稳定...
📸 正在生成长截图...
   -> 已保存: result_full.png
...
```

### 查看LLM分析过程

函数会输出详细日志：
```
🚀 开始爬取网站: https://example.com
✅ 已读取截图: 340.84 KB
✅ 已读取HTML
✅ 已读取提取的文本
🤖 正在调用多模态LLM分析...
✅ 内容提取成功: Example Website
```

### 错误处理

如果提取失败，会返回错误信息：
```json
{
  "title": "Content Extraction Failed",
  "description": "Failed to extract content from https://example.com",
  "keywords": [],
  "main_content": "Error: [具体错误信息]"
}
```

## 注意事项

1. **首次运行较慢** - 爬虫需要加载完整网页，可能需要10-30秒
2. **需要网络访问** - 爬虫需要访问目标网站
3. **单次调用限制** - 每次调用会覆盖之前的截图和HTML文件
4. **Token限制** - HTML和提取的文本有长度限制，避免超出LLM的token上限

## 示例输出

输入URL: `https://halo.mosuyang.org`

输出:
```json
{
  "title": "halo.mosuyang.org - 个人博客",
  "description": "一个简约风格的个人技术博客，分享编程、技术和生活",
  "keywords": ["博客", "技术", "编程", "个人网站", "Halo"],
  "main_content": "这是一个使用Halo博客系统搭建的个人技术博客。网站采用简洁的设计风格，主要内容包括技术文章、编程教程和个人思考。网站导航清晰，文章分类明确，提供了良好的阅读体验。主要特色包括：响应式设计、深色模式支持、代码高亮显示等功能。"
}
```

## 进一步优化建议

### 1. 缓存爬虫结果

可以添加缓存机制，避免重复爬取相同URL：

```python
import hashlib
from pathlib import Path

def get_cache_key(url):
    return hashlib.md5(url.encode()).hexdigest()

# 检查缓存
cache_key = get_cache_key(url)
cache_path = Path(f"/tmp/scraper_cache/{cache_key}")
if cache_path.exists():
    # 使用缓存的文件
    pass
else:
    # 运行爬虫
    run_all_scrapers(url)
```

### 2. 异步爬虫

可以考虑将爬虫改为异步版本，提高性能。

### 3. 选择性文件读取

根据需求选择读取哪些文件：
- 快速模式：只读取 extracted_text
- 标准模式：读取 screenshot + extracted_text
- 详细模式：读取 screenshot + HTML + extracted_text

## 常见问题

**Q: 为什么要用爬虫而不是直接让LLM访问URL？**

A: Gemini的URL访问功能可能受到限制，且只能获取文本。使用爬虫可以获取完整的视觉内容（截图），让LLM"看到"网页的真实样子，分析更准确。

**Q: 爬虫会被反爬虫机制拦截吗？**

A: 爬虫使用了真实的浏览器User-Agent，大部分网站可以正常访问。如果遇到问题，可以在 `full_capture.py` 中添加更多反反爬措施。

**Q: 可以自定义提取的内容吗？**

A: 可以！修改 `extract_url_content` 函数中的提示词部分，指定你需要提取的字段。

**Q: 如何加快处理速度？**

A: 
1. 减少HTML长度限制
2. 使用更小的截图（修改爬虫的viewport设置）
3. 降低爬虫的等待时间
4. 添加缓存机制
