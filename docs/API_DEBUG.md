# AI API 调试和配置指南

## 问题诊断

根据调试结果，当前遇到 **404错误**，说明API端点路径不正确。

### 当前请求信息

```
URL: https://cpa.mosuyang.org/chat/completions
状态码: 404
错误: 404 page not found
```

## 可能的解决方案

### 1. 添加 /v1 前缀（最常见）

大多数OpenAI兼容API需要 `/v1` 前缀：

```env
OPENAI_API_BASE_URL=https://cpa.mosuyang.org/v1
```

完整URL会变成: `https://cpa.mosuyang.org/v1/chat/completions`

### 2. 检查API文档

联系API提供方或查看文档，确认正确的端点格式：

可能的格式：
- `https://api.example.com/v1`
- `https://api.example.com/api/v1`
- `https://api.example.com/openai/v1`
- `https://api.example.com` (无需后缀)

### 3. 使用调试工具

运行调试脚本查看详细请求信息：

```bash
cd backend
uv run python debug_api.py
```

这会显示：
- 完整的请求URL
- 请求头
- 请求体
- 响应详情

## 常见API提供商配置示例

### OpenAI官方

```env
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

### Azure OpenAI

```env
OPENAI_API_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
OPENAI_API_KEY=your-azure-key
OPENAI_MODEL=gpt-4
```

### 第三方兼容服务

```env
# 通常需要 /v1 后缀
OPENAI_API_BASE_URL=https://your-provider.com/v1
OPENAI_API_KEY=your-key
OPENAI_MODEL=model-name
```

### 本地部署（如 LocalAI）

```env
OPENAI_API_BASE_URL=http://localhost:8080/v1
OPENAI_API_KEY=not-needed
OPENAI_MODEL=your-model
```

## 当前配置修改建议

根据你的API地址 `https://cpa.mosuyang.org`，建议尝试：

### 方案1: 添加 /v1
```bash
# 编辑 backend/.env
OPENAI_API_BASE_URL=https://cpa.mosuyang.org/v1
```

### 方案2: 添加 /api/v1
```bash
OPENAI_API_BASE_URL=https://cpa.mosuyang.org/api/v1
```

### 方案3: 检查API文档
联系API提供方确认正确的base URL格式。

## 测试步骤

1. **修改配置**
   ```bash
   # 编辑 backend/.env
   nano backend/.env
   # 或
   code backend/.env
   ```

2. **运行调试脚本**
   ```bash
   cd backend
   uv run python debug_api.py
   ```

3. **查看响应**
   - 如果返回200，说明配置正确
   - 如果还是404，尝试其他路径
   - 如果401/403，说明认证问题
   - 如果400，说明请求格式问题

4. **测试完整功能**
   ```bash
   uv run python test_ai_connection.py
   ```

## 常见错误码说明

| 状态码 | 含义 | 解决方案 |
|--------|------|----------|
| 404 | 端点不存在 | 检查base URL路径 |
| 401 | 未授权 | 检查API密钥 |
| 403 | 禁止访问 | 检查权限/IP限制 |
| 400 | 请求格式错误 | 检查模型名称和参数 |
| 429 | 请求过多 | 降低请求频率 |
| 500 | 服务器错误 | 联系API提供方 |

## 高级调试

### 使用curl测试

```bash
curl -X POST https://cpa.mosuyang.org/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gemini-3-flash-preview",
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

### 使用Python手动测试

```python
import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://cpa.mosuyang.org/v1/chat/completions",
            headers={
                "Authorization": "Bearer YOUR_KEY",
                "Content-Type": "application/json"
            },
            json={
                "model": "gemini-3-flash-preview",
                "messages": [{"role": "user", "content": "Hi"}]
            }
        )
        print(response.status_code)
        print(response.text)

asyncio.run(test())
```

## 已实现的功能

✅ 使用纯HTTP请求（httpx），不依赖OpenAI SDK
✅ 完全兼容OpenAI API格式
✅ 易于调试和自定义
✅ 支持任何OpenAI兼容的API服务

## 需要帮助？

1. 检查API提供方的文档
2. 使用 `debug_api.py` 查看详细请求
3. 尝试不同的base URL格式
4. 联系API提供方获取正确的配置

---

**最后更新**: 2026-01-25
**工具**: `backend/debug_api.py`
