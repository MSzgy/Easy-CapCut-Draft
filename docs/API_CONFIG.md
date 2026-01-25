# API 配置说明

## 已完成的配置

### 1. 环境变量配置

在 `backend/.env` 文件中已配置：

```env
OPENAI_API_BASE_URL=https://cpa.moyan.org
OPENAI_API_KEY=hello
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
```

### 2. 配置文件更新

- ✅ `backend/app/core/config.py` - 添加了 `OPENAI_API_BASE_URL` 配置项
- ✅ `backend/.env.example` - 更新了示例配置
- ✅ `backend/.env` - 配置了实际的API地址和密钥

### 3. AI服务封装

创建了 `backend/app/services/ai_service.py`，提供以下功能：

- **基础文本生成** - `generate_completion()`
- **视频文案生成** - `generate_video_script()`
- **图片分析** - `analyze_image()` (如果API支持)
- **音乐推荐** - `recommend_music_tags()`

## 使用方法

### 在代码中使用

```python
from app.services.ai_service import openai_service

# 生成视频文案
result = await openai_service.generate_video_script(
    theme="旅游攻略",
    description="介绍云南大理的旅游景点",
    keywords=["大理", "古城", "洱海"],
    style="轻松愉快",
    duration=60
)
```

### 测试API连接

运行测试脚本验证配置：

```bash
cd backend
python test_ai_connection.py
```

测试脚本会：
1. ✅ 检查API配置
2. ✅ 测试基础连接
3. ✅ 测试文案生成功能

## 配置项说明

| 配置项 | 说明 | 当前值 |
|--------|------|--------|
| `OPENAI_API_BASE_URL` | API基础地址 | `https://cpa.moyan.org` |
| `OPENAI_API_KEY` | API密钥 | `hello` |
| `OPENAI_MODEL` | 使用的模型 | `gpt-4` |
| `OPENAI_MAX_TOKENS` | 最大token数 | `2000` |

## 注意事项

1. **API兼容性**: 确保你的API端点与OpenAI API格式兼容
2. **模型名称**: 如果API支持的模型名称不同，需要修改 `OPENAI_MODEL`
3. **速率限制**: 注意API的调用频率限制
4. **错误处理**: 已在 `ai_service.py` 中添加了基础错误处理

## 下一步

API配置完成后，你可以：

1. **运行测试**: `python backend/test_ai_connection.py`
2. **启动后端**: `cd backend && uvicorn app.main:app --reload`
3. **开始开发**: 实现具体的业务功能

## 常见问题

### Q: API连接失败怎么办？

A: 检查以下几点：
- API地址是否正确
- API密钥是否有效
- 网络是否能访问该API
- 模型名称是否正确

### Q: 如何更换其他AI服务？

A: 修改 `.env` 文件中的配置：

```env
# 使用OpenAI官方API
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-your-key

# 使用其他兼容服务
OPENAI_API_BASE_URL=https://your-api.com/v1
OPENAI_API_KEY=your-key
```

### Q: 如何调整token限制？

A: 修改 `OPENAI_MAX_TOKENS` 值，或在调用时指定：

```python
await openai_service.generate_completion(
    prompt="your prompt",
    max_tokens=1000  # 覆盖默认值
)
```

## 相关文件

- `backend/.env` - 环境变量配置
- `backend/app/core/config.py` - 配置类定义
- `backend/app/services/ai_service.py` - AI服务封装
- `backend/test_ai_connection.py` - 测试脚本
