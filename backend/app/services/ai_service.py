import httpx
import json
from typing import Optional, Dict, Any
from app.core.config import settings


class OpenAIService:
    """OpenAI 兼容 API服务封装 - 使用纯HTTP请求"""

    def __init__(self):
        self.base_url = settings.OPENAI_API_BASE_URL.rstrip('/')
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.OPENAI_MODEL
        self.image_model = settings.IMAGE_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS

        # 创建HTTP客户端
        self.client = httpx.AsyncClient(
            timeout=60.0,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
        )

    async def _make_request(
        self,
        endpoint: str,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """发送HTTP请求到API"""
        url = f"{self.base_url}{endpoint}"

        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            raise Exception(f"API请求失败 [{e.response.status_code}]: {error_detail}")
        except httpx.RequestError as e:
            raise Exception(f"网络请求错误: {str(e)}")
        except Exception as e:
            raise Exception(f"API调用失败: {str(e)}")

    async def generate_completion(
        self,
        prompt: str,
        system_message: str = "You are a helpful assistant.",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """生成文本补全"""

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens or self.max_tokens,
        }

        result = await self._make_request("/chat/completions", payload)

        # 解析响应
        try:
            return result["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise Exception(f"解析API响应失败: {str(e)}, 响应: {result}")


    async def generate_image(
        self,
        prompt: str,
        size: str,
        style: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """生成图片"""
        system_message: str = f"""你是一个专业的视频封面设计AI助手。你的任务是生成适合抖音平台的高清晰度视频封面图片。要求：
                                    1. 符合抖音平台的视觉风格：鲜艳、吸引眼球、高对比度
                                    2. 适配{size}比例
                                    3. 符合用户要求
                                    4. 符合平台内容审核标准
                                """
        payload = {
            "model": self.image_model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
        }

        result = await self._make_request("/chat/completions", payload)

        # 解析响应
        try:
            return result["choices"][0]["message"]["images"] or []
        except (KeyError, IndexError) as e:
            raise Exception(f"解析API响应失败: {str(e)}, 响应: {result}")

    async def generate_video_script(
        self,
        theme: str,
        description: str = "",
        keywords: list = None,
        style: str = "professional",
        duration: int = 60,
    ) -> dict:
        """生成视频文案"""
        keywords_str = ", ".join(keywords) if keywords else ""

        prompt = f"""请为以下视频内容生成专业的文案：

主题: {theme}
描述: {description}
关键词: {keywords_str}
风格: {style}
视频时长: {duration}秒

请生成以下内容：
1. 3-5个吸引人的标题（适合短视频）
2. 开场白（5-10秒）
3. 主体内容（适配{duration}秒视频）
4. 结尾号召语（CTA）
5. 字幕分段（每段3-5秒）

请以JSON格式返回，格式如下：
{{
    "titles": ["标题1", "标题2", "标题3"],
    "opening": "开场白内容",
    "body": "主体内容",
    "closing": "结尾内容",
    "subtitles": [
        {{"text": "字幕1", "duration": 3}},
        {{"text": "字幕2", "duration": 4}}
    ]
}}
"""

        system_message = "你是一个专业的视频内容创作专家，擅长撰写吸引人的视频文案和字幕。"

        response = await self.generate_completion(
            prompt=prompt,
            system_message=system_message,
            temperature=0.8,
        )

        # 这里应该解析JSON，但先返回原始响应
        return {"raw_response": response}

    async def analyze_image(self, image_url: str) -> str:
        """分析图片内容（如果API支持vision）- 简单版本"""

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "请详细描述这张图片的内容、主题、情绪和适合的使用场景。这将被用于生成视频脚本。"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_url}" if not image_url.startswith("http") else image_url
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500,
        }

        result = await self._make_request("/chat/completions", payload)

        try:
            return result["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise Exception(f"图片分析失败: {str(e)}")

    async def analyze_image_detailed(self, image_url: str) -> dict:
        """详细分析图片内容，返回结构化数据"""

        prompt = """请详细分析这张图片，并以JSON格式返回以下信息：
{
    "description": "图片的详细描述(50-100字)",
    "tags": ["标签1", "标签2", "标签3"],
    "mood": "情绪/氛围",
    "color_scheme": "主要色调",
    "composition": "构图特点",
    "subjects": ["主体对象1", "主体对象2"],
    "scene_type": "场景类型",
    "style": "视觉风格"
}

只返回JSON对象，不要其他说明文字。"""

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_url}" if not image_url.startswith("http") else image_url
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 800,
        }

        result = await self._make_request("/chat/completions", payload)

        try:
            content = result["choices"][0]["message"]["content"]
            # 尝试提取JSON
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # 如果无法解析，返回默认结构
                return {
                    "description": content[:200],
                    "tags": [],
                    "mood": None,
                    "color_scheme": None,
                    "composition": None,
                    "subjects": [],
                    "scene_type": None,
                    "style": None
                }
        except (KeyError, IndexError) as e:
            raise Exception(f"图片详细分析失败: {str(e)}")

    async def recommend_music_tags(
        self,
        theme: str,
        description: str = "",
    ) -> dict:
        """基于内容推荐音乐标签"""
        prompt = f"""基于以下视频内容，推荐合适的背景音乐标签：

主题: {theme}
描述: {description}

请分析视频的：
1. 情绪（如：欢快、悲伤、激昂、平和等）
2. 节奏（如：快速、中速、慢速）
3. 适合的音乐类型（如：流行、电子、古典、氛围音乐等）
4. 建议的BPM范围

请以JSON格式返回：
{{
    "mood": ["情绪1", "情绪2"],
    "tempo": "节奏",
    "genres": ["类型1", "类型2"],
    "bpm_range": [最小BPM, 最大BPM]
}}
"""

        response = await self.generate_completion(
            prompt=prompt,
            system_message="你是一个音乐推荐专家。",
            temperature=0.5,
        )

        return {"raw_response": response}

    async def close(self):
        """关闭HTTP客户端连接"""
        await self.client.aclose()


# 创建单例
openai_service = OpenAIService()
