"""
Gemini API Provider

Implements TextProvider, ImageProvider, and VisionProvider
using Google's Gemini API format.
"""

import httpx
import json
import re
from typing import Optional, Dict, Any

from app.providers.base import (
    TextProvider, ImageProvider, VisionProvider,
    TextRequest, ImageRequest, VisionRequest,
)
from app.core.config import settings


class GeminiProvider(TextProvider, ImageProvider, VisionProvider):
    """Google Gemini API provider."""

    def __init__(
        self,
        api_key: str = None,
        base_url: str = None,
        text_model: str = None,
        image_model: str = None,
        max_tokens: int = None,
    ):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.base_url = (base_url or settings.GEMINI_BASE_URL).rstrip("/")
        self.text_model = text_model or settings.GEMINI_TEXT_MODEL
        self.image_model = image_model or settings.GEMINI_IMAGE_MODEL
        self.max_tokens = max_tokens or settings.GEMINI_MAX_TOKENS

        self.client = httpx.AsyncClient(
            timeout=100.0,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )

    # ── helpers ────────────────────────────────────────────────────────────

    async def _request(self, endpoint: str, payload: dict) -> dict:
        url = f"{self.base_url}{endpoint}"
        try:
            resp = await self.client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise Exception(f"Gemini API error [{e.response.status_code}]: {e.response.text}")
        except httpx.RequestError as e:
            raise Exception(f"Network error: {e}")

    # ── TextProvider ──────────────────────────────────────────────────────

    async def generate_text(self, request: TextRequest) -> str:
        payload = {
            "contents": [
                {
                    "role": "model",
                    "parts": [{"text": request.system_message}],
                },
                {
                    "role": "user",
                    "parts": [{"text": request.prompt}],
                },
            ],
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens or self.max_tokens,
                "thinkingConfig": {
                    "thinkingLevel": "high",
                    "includeThoughts": "true",
                },
            },
            "tools": [
                {"googleSearch": {}},
                {"urlContext": {}},
            ],
        }

        result = await self._request(
            f"/v1beta/models/{self.text_model}:generateContent", payload
        )

        try:
            candidate = result["candidates"][-1]
            parts = candidate["content"]["parts"]
            text = "".join(
                p.get("text", "")
                for p in parts
                if p.get("thought") is not True and p.get("thought") != "true"
            )
            return text or ""
        except (KeyError, IndexError) as e:
            raise Exception(f"Failed to parse Gemini response: {e}, response: {result}")

    # ── ImageProvider ─────────────────────────────────────────────────────

    async def generate_image(self, request: ImageRequest) -> str:
        # 提取并组合可选的额外参数，拼接到系统提示词中
        extra_ctx = []
        if request.style and getattr(request, 'theme', None) != "shot_scene" and getattr(request, 'theme', None) != "cover_douyin":
            extra_ctx.append(f"- 美术风格: {request.style}")
        
        if request.style_keywords:
            extra_ctx.append(f"- 风格关键词要求: {', '.join(request.style_keywords)}")

        if request.negative_prompt and request.negative_prompt.strip():
            extra_ctx.append(f"- 避免出现的元素 (Negative Prompt): {request.negative_prompt}")

        if request.style_weights:
            descs = [f"{s} ({int(w*100)}%)" for s, w in request.style_weights.items()]
            extra_ctx.append(f"- 风格混合比例: {', '.join(descs)}")

        if request.reference_image and not request.reference_images:
            strength_desc = (
                "轻微幅度" if request.denoising_strength < 0.4
                else "中等幅度" if request.denoising_strength < 0.7
                else "强烈重绘"
            )
            comp_desc = "，且必须保留原参考图的构图和空间布局" if request.preserve_composition else ""
            extra_ctx.append(f"- 图生图模式：基于参考图片进行{strength_desc}的重绘{comp_desc}")

        extra_text = ("\n\n此外，请遵循以下附加生成限制和风格要求：\n" + "\n".join(extra_ctx)) if extra_ctx else ""

        system_message = f"""你是一个专业的图像生成AI助理。你的任务是根据用户的详细描述生成对应的图片。
要求：
1. 严格遵循用户的提示词要求。
2. 保证生成图片的质量和清晰度。{extra_text}"""

        user_parts = [{"text": request.prompt}]

        # 多角色参考图片（优先使用）
        if request.reference_images and len(request.reference_images) > 0:
            for i, ref_img in enumerate(request.reference_images):
                if ref_img and ref_img.startswith("data:"):
                    parts = ref_img.split(",", 1)
                    if len(parts) == 2:
                        mime = parts[0].split(";")[0].split(":")[1]
                        user_parts.insert(i, {
                            "inlineData": {"mimeType": mime, "data": parts[1]}
                        })
        # 单张参考图（向后兼容）
        elif request.reference_image and request.reference_image.startswith("data:"):
            parts = request.reference_image.split(",", 1)
            if len(parts) == 2:
                mime = parts[0].split(";")[0].split(":")[1]
                user_parts.insert(0, {
                    "inlineData": {"mimeType": mime, "data": parts[1]}
                })

        payload = {
            "contents": [
                {"role": "model", "parts": [{"text": system_message}]},
                {"role": "user", "parts": user_parts},
            ],
            "generationConfig": {
                "responseModalities": ["Image"],
                "imageConfig": {
                    "aspectRatio": request.size,
                    "imageSize": request.resolution,
                },
            },
        }

        result = await self._request(
            f"/v1beta/models/{self.image_model}:generateContent", payload
        )

        try:
            inline = result["candidates"][0]["content"]["parts"][0]["inlineData"]
            mime = inline.get("mimeType", "image/jpeg")
            return f"data:{mime};base64,{inline['data']}"
        except (KeyError, IndexError) as e:
            raise Exception(f"Failed to parse image response: {e}, response: {result}")

    # ── VisionProvider ────────────────────────────────────────────────────

    async def analyze_image(self, request: VisionRequest) -> str:
        """Simple image analysis returning text."""
        payload = {
            "model": self.text_model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": request.prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": (
                                    f"data:image/jpeg;base64,{request.image_data}"
                                    if not request.image_data.startswith("http")
                                    else request.image_data
                                )
                            },
                        },
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
        """Detailed image analysis returning structured dict."""
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

        def _build_image_part(image_data: str) -> dict:
            if image_data.startswith("data:"):
                header, encoded = image_data.split(",", 1)
                mime = header.split(";")[0].split(":")[1]
                return {"inlineData": {"mimeType": mime, "data": encoded}}
            elif image_data.startswith("http"):
                return {"inlineData": {"mimeType": "image/jpeg", "data": image_data}}
            else:
                return {"inlineData": {"mimeType": "image/jpeg", "data": image_data}}

        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": system_prompt},
                        _build_image_part(first_frame),
                        {"text": "以上是起始帧。以下是结束帧："},
                        _build_image_part(end_frame),
                        {"text": "请根据这两帧图片，生成视频转换的prompt。"},
                    ],
                }
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 300,
            },
        }

        result = await self._request(
            f"/v1beta/models/{self.text_model}:generateContent", payload
        )

        try:
            candidate = result["candidates"][-1]
            parts = candidate["content"]["parts"]
            text = "".join(
                p.get("text", "")
                for p in parts
                if p.get("thought") is not True and p.get("thought") != "true"
            ).strip()
            return text or "Smooth cinematic transition with gentle camera motion and natural lighting changes"
        except (KeyError, IndexError) as e:
            raise Exception(f"Failed to parse transition response: {e}")

    # ── lifecycle ─────────────────────────────────────────────────────────

    async def close(self) -> None:
        await self.client.aclose()
