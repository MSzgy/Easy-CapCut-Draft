# 开发环境搭建指南

本文档提供详细的开发环境搭建步骤。

## 前置要求

### 必需软件

1. **Node.js 18+**
   - 下载: https://nodejs.org/
   - 验证: `node --version`

2. **Python 3.11+**
   - 下载: https://www.python.org/downloads/
   - 验证: `python --version`

3. **Git**
   - 下载: https://git-scm.com/
   - 验证: `git --version`

### 可选软件

1. **Docker Desktop**（推荐，用于本地数据库）
   - 下载: https://www.docker.com/products/docker-desktop

2. **PostgreSQL 14+**（如不使用Docker）
   - 下载: https://www.postgresql.org/download/

3. **Redis 7+**（如不使用Docker）
   - 下载: https://redis.io/download

4. **FFmpeg**（视频处理）
   - 下载: https://ffmpeg.org/download.html

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/Easy-CapCut-Draft.git
cd Easy-CapCut-Draft
```

### 2. 前端设置

```bash
cd frontend

# 安装依赖
npm install

# 复制环境变量
cp .env.example .env

# 启动开发服务器
npm run dev
```

前端将运行在 http://localhost:5173

### 3. 后端设置

```bash
cd backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 复制环境变量
cp .env.example .env

# 编辑 .env，配置数据库URL和API密钥
# DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/capcut_draft
# OPENAI_API_KEY=your-key-here
```

### 4. 启动数据库（使用Docker）

```bash
# 回到项目根目录
cd ..

# 只启动数据库服务
docker-compose up -d postgres redis
```

### 5. 运行后端

```bash
cd backend

# 启动FastAPI开发服务器
uvicorn app.main:app --reload --port 8000
```

后端将运行在 http://localhost:8000

访问 http://localhost:8000/docs 查看API文档

## 完整Docker环境

如果想用Docker运行整个项目：

```bash
# 构建并启动所有服务
docker-compose up --build

# 后台运行
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

服务地址：
- 前端: http://localhost:3000
- 后端API: http://localhost:8000
- API文档: http://localhost:8000/docs

## 数据库迁移

首次运行时，数据库表会自动创建。如需手动管理迁移：

```bash
cd backend

# 创建迁移
alembic revision --autogenerate -m "Initial migration"

# 运行迁移
alembic upgrade head

# 回滚
alembic downgrade -1
```

## 常见问题

### 1. 端口被占用

如果5173或8000端口已被占用：

```bash
# 前端 - 在vite.config.ts中修改端口
# 或使用环境变量
PORT=3001 npm run dev

# 后端 - 修改启动命令
uvicorn app.main:app --reload --port 8001
```

### 2. 数据库连接失败

确保PostgreSQL和Redis正在运行：

```bash
# 检查Docker容器状态
docker-compose ps

# 查看数据库日志
docker-compose logs postgres
```

### 3. Python依赖安装失败

某些依赖需要系统库支持：

```bash
# macOS
brew install postgresql ffmpeg

# Ubuntu/Debian
sudo apt-get install libpq-dev ffmpeg

# Windows
# 使用官方安装包或WSL
```

### 4. Node模块安装失败

```bash
# 清除缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install
```

## 开发工具推荐

### IDE
- **VS Code**（推荐）
  - 插件: Python, Pylance, ESLint, Prettier, Vetur

### API测试
- **Postman** 或 **Insomnia**
- 内置Swagger UI: http://localhost:8000/docs

### 数据库管理
- **DBeaver**（通用）
- **pgAdmin**（PostgreSQL专用）

## 下一步

- 查看 [PRD.md](./PRD.md) 了解产品需求
- 查看 [TODO.md](./TODO.md) 了解开发任务
- 开始实现第一个功能模块

## 获取帮助

遇到问题？
- 查看项目Issues: https://github.com/yourusername/Easy-CapCut-Draft/issues
- 提交新Issue报告问题
