# Easy-CapCut-Draft

> 智能视频内容生成与剪映草稿转换工具

一个基于AI的视频内容创作辅助工具，帮助用户快速生成视频文案、封面和背景音乐推荐，并自动转换为剪映（CapCut）可编辑的草稿文件。

## 功能特性

### Step 1-2: AI内容源（已实现 ✅）

支持三种内容输入方式：

1. **Upload（上传）** - 上传视频、图片、音频文件，AI分析并生成内容
2. **Prompt（提示词）** - 输入文本描述，选择视频风格（宣传/教程/评测/故事），AI生成场景
3. **URL（网站）** - 输入网站URL，AI爬取内容并生成视频脚本

### Step 3: AI封面设计师（已实现 ✅）

- 支持4种封面风格：3D、极简、电影、渐变
- 一键AI生成专业封面
- 9:16竖屏格式

### 其他功能

- **智能封面** - 自动生成/提取视频封面，支持在线编辑
- **音乐推荐** - 智能推荐适配的背景音乐
- **剪映导出** - 一键生成剪映格式的草稿文件

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Ant Design
- Axios
- React Router

### 后端
- Python 3.11
- FastAPI
- SQLAlchemy (异步)
- PostgreSQL
- Redis
- OpenAI API / Anthropic API

### 基础设施
- Docker & Docker Compose
- Nginx
- FFmpeg (视频处理)

## 快速开始

### 方式一：一键启动（推荐）

```bash
# 克隆项目
git clone https://github.com/yourusername/Easy-CapCut-Draft.git
cd Easy-CapCut-Draft

# 确保Python虚拟环境已创建（仅首次需要）
cd backend
python -m venv .venv
.venv/bin/pip install -r requirements.txt
cd ..

# 确保前端依赖已安装（仅首次需要）
cd frontend
npm install
cd ..

# 一键启动前后端
./start.sh
```

启动成功后：
- 前端: http://localhost:3000
- 后端: http://localhost:8000
- API文档: http://localhost:8000/docs

### 方式二：分别启动

#### 启动后端
```bash
cd backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 启动前端
```bash
cd frontend
npm run dev
```

### 方式三：使用 Docker Compose

1. 克隆项目
```bash
git clone https://github.com/yourusername/Easy-CapCut-Draft.git
cd Easy-CapCut-Draft
```

2. 配置环境变量
```bash
# 复制环境变量模板
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 编辑 backend/.env，填入必要配置（数据库、AI API密钥等）
```

3. 启动服务
```bash
docker-compose up -d
```

4. 访问应用
- 前端: http://localhost:3000
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs

### 本地开发

#### 前端开发

```bash
cd frontend
npm install
npm run dev
```

前端将运行在 http://localhost:5173

#### 后端开发

1. 创建虚拟环境
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. 安装依赖
```bash
pip install -r requirements.txt
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件
```

4. 启动数据库（使用Docker）
```bash
docker-compose up -d postgres redis
```

5. 运行后端
```bash
python -m uvicorn app.main:app --reload --port 8000
```

后端将运行在 http://localhost:8000

## 项目结构

```
Easy-CapCut-Draft/
├── frontend/                 # 前端代码
│   ├── src/
│   │   ├── components/      # React组件
│   │   ├── pages/           # 页面
│   │   ├── services/        # API服务
│   │   ├── hooks/           # 自定义Hooks
│   │   ├── utils/           # 工具函数
│   │   ├── types/           # TypeScript类型
│   │   └── assets/          # 静态资源
│   └── package.json
│
├── backend/                  # 后端代码
│   ├── app/
│   │   ├── api/             # API路由
│   │   ├── core/            # 核心配置
│   │   ├── models/          # 数据模型
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # 业务逻辑
│   │   └── utils/           # 工具函数
│   ├── tests/               # 测试
│   └── requirements.txt
│
├── docs/                     # 文档
│   ├── PRD.md               # 产品需求文档
│   └── TODO.md              # 开发任务清单
│
├── docker/                   # Docker配置
│   └── nginx.conf
│
├── docker-compose.yml        # Docker Compose配置
├── Dockerfile.frontend       # 前端Docker文件
├── Dockerfile.backend        # 后端Docker文件
└── README.md                 # 项目说明
```

## API 文档

启动后端后，访问以下地址查看完整的API文档：

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 开发指南

### 环境要求

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose (可选)
- PostgreSQL 14+ (本地开发)
- Redis 7+ (本地开发)
- FFmpeg (视频处理)

### 配置说明

#### 后端环境变量

主要配置项（backend/.env）：

```env
# 数据库
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname

# AI服务
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# 文件上传
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=500
```

#### 前端环境变量

主要配置项（frontend/.env）：

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_MAX_FILE_SIZE_MB=500
```

## 部署

详见 [部署文档](docs/deployment.md)（待完善）

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 联系方式

项目链接: https://github.com/yourusername/Easy-CapCut-Draft

## 致谢

- [CapCut](https://www.capcut.com/) - 剪映视频编辑软件
- [OpenAI](https://openai.com/) - AI文案生成
- [Anthropic](https://www.anthropic.com/) - Claude AI
- [FastAPI](https://fastapi.tiangolo.com/) - 现代Web框架
- [React](https://react.dev/) - 前端框架
## 配置说明

### 后端配置 (backend/.env)

关键配置项：

```bash
# AI服务配置
OPENAI_API_BASE_URL=https://your-api-endpoint/v1  # OpenAI兼容的API地址
GEMINI_API_KEY=your-api-key                       # API密钥
OPENAI_MODEL=gemini-3-flash-preview               # 使用的模型
OPENAI_MAX_TOKENS=2000                            # 最大Token数

# 服务器配置
HOST=0.0.0.0
PORT=8000

# CORS配置（允许前端访问）
CORS_ORIGINS=["http://localhost:5173", "http://localhost:3000"]
```

### 前端配置 (frontend/.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## API文档

启动后端服务后，访问以下地址查看完整的API交互文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 开发文档

- [AI集成指南](docs/AI_INTEGRATION_GUIDE.md) - 详细的AI功能集成文档

## 测试

### 测试后端API

```bash
# 测试健康检查
curl http://localhost:8000/health

# 测试AI内容生成
curl -X POST http://localhost:8000/api/ai/generate \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "prompt",
    "prompt": "Create a promotional video for a SaaS product",
    "videoStyle": "promo"
  }'

# 测试封面生成
curl -X POST http://localhost:8000/api/ai/generate-cover \
  -H "Content-Type: application/json" \
  -d '{
    "style": "3d",
    "theme": "Technology"
  }'
```

## 故障排查

### 后端无法启动
1. 检查Python版本（需要3.11+）
2. 确保虚拟环境已激活
3. 检查端口8000是否被占用
4. 查看后端日志

### 前端无法连接后端
1. 确认后端服务正在运行
2. 检查 `frontend/.env.local` 中的API地址
3. 检查浏览器控制台的网络请求

### AI生成失败
1. 检查 `backend/.env` 中的AI配置
2. 确认API密钥有效
3. 检查网络连接
4. 查看后端日志获取详细错误

