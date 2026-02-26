"""
ImageTurbo Space Adapter

Adapts the Imosu/Z-Image-Turbo space for image generation.
"""

import base64
import random
from typing import Any

from app.providers.spaces.base import SpaceAdapter, register_adapter
from app.providers.base import ImageRequest


class ImageTurboAdapter(SpaceAdapter):
    capability = "image"
    api_name = "/generate_image"
    display_name = "Image Turbo"

    def build_params(self, request: ImageRequest) -> dict:
        # Build enriched prompt
        keywords_ctx = ""
        if request.style_keywords:
            keywords_ctx = f"\n7. 风格关键词参考：{', '.join(request.style_keywords)}"
        negative_ctx = ""
        if request.negative_prompt and request.negative_prompt.strip():
            negative_ctx = f"\n8. 避免出现的元素：{request.negative_prompt}"

        style = request.style
        style_mix_ctx = ""
        if request.style_weights:
            descs = [f"{s} ({int(w*100)}%)" for s, w in request.style_weights.items()]
            style_mix_ctx = f"\n9. 风格混合：{', '.join(descs)}"
            style = "混合风格 - " + ", ".join(request.style_weights.keys())

        system_prompt = f"""你是一个专业的视频封面设计AI助手。要求：
1. 符合抖音平台的视觉风格：鲜艳、吸引眼球、高对比度
2. 符合用户要求
3. 主题：{request.theme}
4. 风格：{style}{keywords_ctx}{negative_ctx}{style_mix_ctx}
5. 质量指标: 最终图像必须在视觉上与高端摄影编辑传播难以区分
6. 画面中不要出现其他文字，只允许用户定义的文字出现"""

        full_prompt = system_prompt + request.prompt

        # Map aspect ratio to pixel dimensions
        size_map = {
            "16:9": (1024, 576),
            "9:16": (576, 1024),
            "1:1": (1024, 1024),
            "4:3": (1024, 768),
            "3:4": (768, 1024),
        }
        width, height = size_map.get(request.size, (1024, 576))

        # Select model and inference steps
        model_name = getattr(request, "image_model", None) or "Z-Image-Turbo"
        num_inference_steps = 50 if model_name == "BitDance-14B-16x" else 9

        return {
            "model_name": model_name,
            "prompt": full_prompt,
            "height": height,
            "width": width,
            "num_inference_steps": num_inference_steps,
            "guidance_scale": 8,
            "seed": random.randint(10, 10000),
            "randomize_seed": True,
        }

    def parse_result(self, result: Any) -> str:
        if isinstance(result, tuple) and len(result) >= 1:
            image_info = result[0]
        else:
            raise Exception(f"Unexpected result type: {type(result)}")

        if isinstance(image_info, str):
            with open(image_info, "rb") as f:
                data = base64.b64encode(f.read()).decode()
            return f"data:image/png;base64,{data}"

        if isinstance(image_info, dict):
            path = image_info.get("path")
            if path:
                with open(path, "rb") as f:
                    data = base64.b64encode(f.read()).decode()
                mime = image_info.get("mime_type", "image/png")
                return f"data:{mime};base64,{data}"
            url = image_info.get("url", "")
            if url.startswith("data:"):
                return url
            raise Exception(f"HF result missing path/url: {image_info}")

        raise Exception(f"Unsupported image_info type: {type(image_info)}")


# Auto-register
register_adapter("image_turbo", ImageTurboAdapter)
