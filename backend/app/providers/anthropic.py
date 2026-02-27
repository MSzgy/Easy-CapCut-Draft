"""
Anthropic API Provider

Implements TextProvider and VisionProvider using the standard
Anthropic API format.
"""

import httpx
import json
import base64
import re
from typing import Optional, Dict, Any

from app.providers.base import (
    TextProvider, VisionProvider,
    TextRequest, VisionRequest,
)
from app.core.config import settings


class AnthropicProvider(TextProvider, VisionProvider):
    """Provider for Anthropic API."""

    def __init__(
        self,
        api_key: str = None,
        base_url: str = None,
        model: str = None,
        max_tokens: int = None,
    ):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.base_url = (base_url or settings.ANTHROPIC_BASE_URL).rstrip("/")
        if not self.base_url:
            self.base_url = "https://api.anthropic.com"
            
        self.model = model or settings.ANTHROPIC_MODEL
        # Anthropic requires max_tokens for Claude 3 models, default to a high value max 4096 (or 8192 for newer)
        self.max_tokens = max_tokens or 4096 

        self.client = httpx.AsyncClient(
            timeout=100.0,
            headers={
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
        )

    async def _request(self, endpoint: str, payload: dict) -> dict:
        url = f"{self.base_url}{endpoint}"
        try:
            resp = await self.client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            try:
                error_body = e.response.json()
            except Exception:
                error_body = e.response.text
            raise Exception(f"Anthropic API error [{e.response.status_code}]: {error_body}")
        except httpx.RequestError as e:
            raise Exception(f"Network error: {e}")

    # ── TextProvider ──────────────────────────────────────────────────────

    async def generate_text(self, request: TextRequest) -> str:
        payload = {
            "model": self.model,
            "max_tokens": request.max_tokens or self.max_tokens,
            "messages": [
                {"role": "user", "content": request.prompt},
            ]
        }
        
        if request.system_message:
            payload["system"] = request.system_message
            
        if request.temperature is not None:
            payload["temperature"] = request.temperature

        result = await self._request("/v1/messages", payload)
        try:
            return result["content"][0]["text"]
        except (KeyError, IndexError) as e:
            raise Exception(f"Failed to parse response: {e}, response: {result}")

    # ── VisionProvider ────────────────────────────────────────────────────

    async def analyze_image(self, request: VisionRequest) -> str:
        # Determine media type and extract base64 data
        image_data = request.image_data
        media_type = "image/jpeg"
        
        if image_data.startswith("data:"):
            # Format: data:image/jpeg;base64,...
            header, base64_data = image_data.split(",", 1)
            media_type = header.split(";")[0].split(":")[1]
            image_data = base64_data

        payload = {
            "model": self.model,
            "max_tokens": request.max_tokens or 1024,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {"type": "text", "text": request.prompt},
                    ],
                }
            ],
        }

        result = await self._request("/v1/messages", payload)
        try:
            return result["content"][0]["text"]
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
        
        def _get_media_data(img_str: str):
            if img_str.startswith("data:"):
                header, base64_data = img_str.split(",", 1)
                media_type = header.split(";")[0].split(":")[1]
                return media_type, base64_data
            # We assume it's base64 jpeg if no prefix
            return "image/jpeg", img_str

        mt1, data1 = _get_media_data(first_frame)
        mt2, data2 = _get_media_data(end_frame)

        payload = {
            "model": self.model,
            "max_tokens": 300,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "以上是起始帧。"},
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": mt1, "data": data1},
                        },
                        {"type": "text", "text": "以下是结束帧："},
                        {
                            "type": "image",
                            "source": {"type": "base64", "media_type": mt2, "data": data2},
                        },
                        {"type": "text", "text": "请根据这两帧图片，生成视频转换的prompt。"},
                    ],
                }
            ],
        }

        result = await self._request("/v1/messages", payload)
        try:
            text = result["content"][0]["text"].strip()
            return text or "Smooth cinematic transition with gentle camera motion and natural lighting changes"
        except (KeyError, IndexError) as e:
            raise Exception(f"Transition analysis failed: {e}")

    # ── lifecycle ─────────────────────────────────────────────────────────

    async def close(self) -> None:
        await self.client.aclose()
