"""
OpenAI-Compatible API Provider

Implements TextProvider and VisionProvider using the standard
OpenAI /v1/chat/completions format. Works with any OpenAI-compatible API
(OpenAI, Azure, local LLMs via LiteLLM / Ollama, etc.)
"""

import httpx
import json
import re
from typing import Optional, Dict, Any

from app.providers.base import (
    TextProvider, VisionProvider,
    TextRequest, VisionRequest,
)
from app.core.config import settings


class OpenAICompatProvider(TextProvider, VisionProvider):
    """Provider for any OpenAI-compatible API."""

    def __init__(
        self,
        api_key: str = None,
        base_url: str = None,
        model: str = None,
        max_tokens: int = None,
    ):
        self.api_key = api_key or settings.OPENAI_OWN_API_KEY
        self.base_url = (base_url or settings.OPENAI_BASE_URL).rstrip("/")
        self.model = model or settings.OPENAI_MODEL
        self.max_tokens = max_tokens or settings.GEMINI_MAX_TOKENS

        self.client = httpx.AsyncClient(
            timeout=100.0,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )

    async def _request(self, endpoint: str, payload: dict) -> dict:
        url = f"{self.base_url}{endpoint}"
        try:
            resp = await self.client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise Exception(f"OpenAI API error [{e.response.status_code}]: {e.response.text}")
        except httpx.RequestError as e:
            raise Exception(f"Network error: {e}")

    # ── TextProvider ──────────────────────────────────────────────────────

    async def generate_text(self, request: TextRequest) -> str:
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": request.system_message},
                {"role": "user", "content": request.prompt},
            ],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens or self.max_tokens,
        }

        result = await self._request("/v1/messages", payload)
        try:
            return result["content"][0]["text"]
        except (KeyError, IndexError) as e:
            raise Exception(f"Failed to parse response: {e}, response: {result}")

    # ── VisionProvider ────────────────────────────────────────────────────

    async def analyze_image(self, request: VisionRequest) -> str:
        image_url = (
            f"data:image/jpeg;base64,{request.image_data}"
            if not request.image_data.startswith("http")
            else request.image_data
        )

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": request.prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                }
            ],
            "max_tokens": request.max_tokens,
        }

        result = await self._request("/v1/chat/completions", payload)
        try:
            return result["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise Exception(f"Image analysis failed: {e}")

    async def analyze_image_detailed(self, request: VisionRequest) -> dict:
        raw = await self.analyze_image(request)
        try:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                return json.loads(match.group())
        except Exception:
            pass

        return {
            "description": raw[:200],
            "tags": [],
            "mood": None,
            "color_scheme": None,
            "composition": None,
            "subjects": [],
            "scene_type": None,
            "style": None,
        }

    async def analyze_transition(self, first_frame: str, end_frame: str) -> str:
        """Analyze two frames and generate a cinematic transition prompt."""
        system_prompt = (
            "你是一位专业的电影导演和视觉特效师。"
            "我将给你两张图片：第一张是视频的起始帧，第二张是视频的结束帧。"
            "请分析这两张图片之间的视觉差异，然后生成一段简洁的英文视频生成提示词(prompt)，"
            "描述从第一帧到第二帧的最佳转换方式。\n\n"
            "你的prompt应该包含：\n"
            "1. 镜头运动方式（如 camera pan, zoom in/out, dolly, orbit 等）\n"
            "2. 场景中物体的运动趋势\n"
            "3. 光线和氛围的变化\n"
            "4. 转场风格（smooth, dramatic, gentle 等）\n\n"
            "要求：\n"
            "- 只输出prompt文本，不要输出任何解释\n"
            "- prompt应该是英文\n"
            "- 保持在2-3句话以内，简洁有力\n"
            "- 要适合作为 AI 视频生成模型的输入"
        )

        def _to_url(image_data: str) -> str:
            if image_data.startswith("data:") or image_data.startswith("http"):
                return image_data
            return f"data:image/jpeg;base64,{image_data}"

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": system_prompt},
                        {"type": "image_url", "image_url": {"url": _to_url(first_frame)}},
                        {"type": "text", "text": "以上是起始帧。以下是结束帧："},
                        {"type": "image_url", "image_url": {"url": _to_url(end_frame)}},
                        {"type": "text", "text": "请根据这两帧图片，生成视频转换的prompt。"},
                    ],
                }
            ],
            "max_tokens": 300,
        }

        result = await self._request("/v1/chat/completions", payload)
        try:
            text = result["choices"][0]["message"]["content"].strip()
            return text or "Smooth cinematic transition with gentle camera motion and natural lighting changes"
        except (KeyError, IndexError) as e:
            raise Exception(f"Transition analysis failed: {e}")

    # ── lifecycle ─────────────────────────────────────────────────────────

    async def close(self) -> None:
        await self.client.aclose()
