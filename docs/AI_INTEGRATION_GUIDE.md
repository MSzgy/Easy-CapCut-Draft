# AI内容生成功能集成测试指南

## 功能概述

已成功实现前端调用后端AI内容生成功能，包括：

1. **三种内容源模式**：
   - Upload: 基于上传的文件生成内容
   - Prompt: 基于文本提示词生成内容
   - URL: 基于网站URL生成内容

2. **AI封面生成**：支持4种风格（3D、极简、电影、渐变）

## 后端实现

### API端点

#### 1. 生成内容
- **端点**: `POST /api/ai/generate`
- **请求体**:
```json
{
  "mode": "prompt",  // "upload" | "prompt" | "url"
  "prompt": "Create a promotional video for a SaaS product",
  "videoStyle": "promo",  // "promo" | "tutorial" | "review" | "story"
  "url": "https://example.com",  // 仅URL模式需要
  "uploadedAssets": []  // 仅Upload模式需要
}
```

- **响应**:
```json
{
  "success": true,
  "message": "内容生成成功",
  "scenes": [
    {
      "id": "scene_1",
      "timestamp": "0:00 - 0:05",
      "script": "场景脚本内容...",
      "imageUrl": "https://...",
      "imageDescription": "图片描述"
    }
  ],
  "coverUrl": null
}
```

#### 2. 生成封面
- **端点**: `POST /api/ai/generate-cover`
- **请求体**:
```json
{
  "style": "3d",  // "3d" | "minimal" | "cinematic" | "gradient"
  "prompt": "SaaS product cover",
  "theme": "Technology"
}
```

- **响应**:
```json
{
  "success": true,
  "message": "封面生成成功",
  "coverUrl": "https://..."
}
```

### 文件结构

```
backend/
├── app/
│   ├── api/
│   │   ├── __init__.py (已更新，注册AI路由)
│   │   └── routes/
│   │       ├── ai_content.py (新建，AI内容生成路由)
│   │       └── test.py
│   ├── schemas/
│   │   └── ai_schemas.py (新建，AI相关的请求/响应模型)
│   ├── services/
│   │   └── ai_service.py (已存在，OpenAI服务封装)
│   └── main.py
└── .env
```

## 前端实现

### API客户端

```
frontend/
├── lib/
│   ├── api-client.ts (新建，通用API客户端)
│   └── api/
│       └── ai-content.ts (新建，AI内容API封装)
└── components/
    └── video-editor/
        └── column-input.tsx (已更新，集成后端调用)
```

### 关键改动

1. **column-input.tsx**:
   - 导入了 `aiContentApi` 和 `useToast`
   - `handleGenerate` 函数现在调用后端API
   - `handleGenerateCover` 函数现在调用后端API
   - 添加了错误处理和成功提示
   - 失败时有降级处理（使用模拟数据）

2. **环境变量**:
   - 创建了 `frontend/.env.local`
   - 配置了 `NEXT_PUBLIC_API_URL=http://localhost:8000/api`

## 测试步骤

### 1. 启动后端服务

```bash
cd backend
# 使用虚拟环境的Python
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. 测试后端API

#### 测试健康检查
```bash
curl http://localhost:8000/health
# 预期: {"status":"healthy"}
```

#### 测试内容生成（Prompt模式）
```bash
curl -X POST http://localhost:8000/api/ai/generate \
  -H "Content-Type: application/json" \
  --data '{
    "mode": "prompt",
    "prompt": "Create a promotional video for a SaaS product",
    "videoStyle": "promo"
  }'
```

#### 测试封面生成
```bash
curl -X POST http://localhost:8000/api/ai/generate-cover \
  -H "Content-Type: application/json" \
  --data '{
    "style": "3d",
    "theme": "SaaS product"
  }'
```

### 3. 启动前端服务

```bash
cd frontend
npm run dev
# 或
pnpm dev
```

### 4. 前端功能测试

1. 打开浏览器访问 `http://localhost:3000`
2. 在左侧面板找到 "AI Content Source" 卡片
3. 测试三个选项卡：
   - **Upload**: 上传文件并生成内容
   - **Prompt**: 输入提示词，选择视频风格，点击生成
   - **URL**: 输入网站URL，点击生成
4. 测试 "AI Cover Designer":
   - 选择封面风格
   - 点击 "Generate with AI"

## 当前状态

✅ **已完成**:
- 后端API端点实现
- 前端API服务层
- 前端组件集成
- 错误处理和降级机制
- Toast通知提示
- 基本的AI内容生成（使用OpenAI兼容API）

⚠️ **待优化**:
1. URL模式的网页爬虫功能（当前返回模拟数据）
2. Upload模式的文件处理（当前返回模拟数据）
3. AI图片生成集成（当前返回Unsplash占位图）
4. 更智能的场景生成算法
5. 添加缓存机制提升性能

## 故障排查

### 问题1: 前端无法连接后端
- 检查后端服务是否运行在 8000 端口
- 检查 `frontend/.env.local` 中的 `NEXT_PUBLIC_API_URL` 配置
- 检查CORS配置（后端 `.env` 中的 `CORS_ORIGINS`）

### 问题2: AI生成失败
- 检查后端 `.env` 中的AI配置：
  - `OPENAI_API_BASE_URL`
  - `GEMINI_API_KEY`
  - `OPENAI_MODEL`
- 查看后端日志查找详细错误信息

### 问题3: 前端显示错误提示
- 打开浏览器开发者工具查看网络请求
- 检查控制台错误日志
- 前端有降级机制，失败时会使用模拟数据

## API文档

启动后端服务后，访问以下地址查看完整API文档：
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 下一步建议

1. **完善URL爬虫**: 集成真实的网页内容提取服务
2. **文件上传**: 实现多媒体文件上传和分析
3. **AI图片生成**: 集成Stable Diffusion或DALL-E
4. **智能优化**: 根据用户反馈改进生成质量
5. **性能优化**: 添加Redis缓存，减少重复生成
