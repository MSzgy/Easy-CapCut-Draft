# Docker 测试指南

## 问题：Docker 未安装

当前系统未安装Docker，无法直接运行完整的Docker Compose环境。

## 解决方案

### 方案1: 安装 Docker Desktop（推荐用于完整测试）

1. **下载 Docker Desktop**
   - macOS: https://www.docker.com/products/docker-desktop
   - 下载并安装 Docker Desktop for Mac

2. **启动 Docker Desktop**
   - 安装完成后，启动 Docker Desktop
   - 等待Docker daemon完全启动

3. **验证安装**
   ```bash
   docker --version
   docker-compose --version
   ```

4. **启动项目**
   ```bash
   cd /Users/zouguoyang/Desktop/Easy-CapCut-Draft
   docker-compose up -d
   ```

5. **查看服务状态**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

6. **访问服务**
   - 前端: http://localhost:3000
   - 后端API: http://localhost:8000
   - API文档: http://localhost:8000/docs

### 方案2: 本地运行（无需Docker，推荐用于开发）

如果不想安装Docker，可以直接本地运行：

#### 步骤1: 启动数据库（使用Homebrew或直接安装）

**安装 PostgreSQL:**
```bash
# 使用 Homebrew
brew install postgresql@14
brew services start postgresql@14

# 创建数据库
createdb capcut_draft
```

**安装 Redis:**
```bash
# 使用 Homebrew
brew install redis
brew services start redis
```

或者使用 **Orbstack**（Docker Desktop的轻量级替代品）:
```bash
brew install orbstack
# 启动后可以运行Docker命令
```

#### 步骤2: 启动后端

```bash
cd backend

# 确认环境变量配置
cat .env

# 启动后端
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

访问: http://localhost:8000

#### 步骤3: 启动前端

```bash
cd frontend

# 启动前端
npm run dev
```

访问: http://localhost:5173

## 当前推荐方案

由于你已经成功测试了后端API连接，建议使用 **方案2（本地运行）** 继续开发：

### 快速启动步骤

1. **检查PostgreSQL和Redis**
   ```bash
   # 检查PostgreSQL
   psql -U postgres -c "SELECT version();"

   # 检查Redis
   redis-cli ping
   ```

2. **如果没安装，可以只运行数据库的Docker容器**
   ```bash
   # 即使没有Docker Desktop，也可以安装 Colima（轻量级）
   brew install colima
   colima start

   # 然后只启动数据库服务
   docker-compose up -d postgres redis
   ```

3. **启动后端**
   ```bash
   cd backend
   uv run uvicorn app.main:app --reload
   ```

4. **启动前端**
   ```bash
   cd frontend
   npm run dev
   ```

## 测试清单

### 后端测试
- [ ] 后端启动成功
- [ ] 访问 http://localhost:8000 看到欢迎信息
- [ ] 访问 http://localhost:8000/docs 看到API文档
- [ ] 访问 http://localhost:8000/health 看到健康状态

### 前端测试
- [ ] 前端启动成功
- [ ] 访问 http://localhost:5173 看到前端页面
- [ ] 控制台无错误

### 数据库连接测试
- [ ] 后端成功连接PostgreSQL
- [ ] 后端成功连接Redis
- [ ] 数据库表自动创建

### API测试
- [ ] AI API连接正常
- [ ] 文案生成功能正常

## Docker Compose 配置说明

当安装Docker后，配置已包含：

- ✅ PostgreSQL 16 (端口5432)
- ✅ Redis 7 (端口6379)
- ✅ Backend API (端口8000)
- ✅ Frontend (端口3000)
- ✅ 环境变量已配置（包括AI API）
- ✅ 健康检查
- ✅ 自动重启
- ✅ 数据持久化

## 下一步建议

### 如果想要完整Docker体验
安装 Docker Desktop 或 Orbstack

### 如果想快速开发
使用本地运行方式，只在需要时启动数据库

### 当前最佳实践
1. 安装 Colima 或 Orbstack（轻量级Docker运行时）
2. 使用 docker-compose 启动数据库
3. 本地运行前后端（方便调试）

```bash
# 安装 Colima
brew install colima docker docker-compose
colima start

# 只启动数据库
docker-compose up -d postgres redis

# 本地启动应用
cd backend && uv run uvicorn app.main:app --reload &
cd frontend && npm run dev
```

---

**注意**: 由于Docker未安装，我们将继续使用本地开发模式。如果需要Docker环境，请先安装Docker Desktop或Orbstack。
