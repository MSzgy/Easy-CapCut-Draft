"""
Video Wan Space Adapter

Adapts the Imosu/Dream-wan2-2-faster-Pro space for video generation
(the older Wan2 model with different parameters).
"""

from typing import Any

from app.providers.spaces.base import SpaceAdapter, register_adapter
from app.providers.base import VideoRequest


class VideoWanAdapter(SpaceAdapter):
    capability = "video"
    api_name = "/generate_video"
    display_name = "Wan2 视频生成"

    def build_params(self, request: VideoRequest) -> dict:
        from gradio_client import handle_file

        # This space uses a different parameter set
        return {
            "input_image": handle_file(request.image) if request.image else None,
            "prompt": request.prompt,
            "steps": 6,
            "negative_prompt": (
                "色调艳丽, 过曝, 静态, 细节模糊不清, 字幕, 风格, 作品, 画作, 画面, "
                "静止, 整体发灰, 最差质量, 低质量, JPEG压缩残留, 丑陋的, 残缺的, "
                "多余的手指, 画得不好的手部, 画得不好的脸部, 畸形的, 毁容的, "
                "形态畸形的肢体, 手指融合, 静止不动的画面, 杂乱的背景, 三条腿, "
                "背景人很多, 倒着走"
            ),
            "duration_seconds": request.duration_seconds,
            "guidance_scale": 1.0,
            "guidance_scale_2": 1.0,
            "seed": request.seed,
            "randomize_seed": request.randomize_seed,
        }

    def parse_result(self, result: Any) -> str:
        if isinstance(result, tuple) and len(result) >= 1:
            vi = result[0]
        elif isinstance(result, (str, dict)):
            vi = result
        else:
            raise Exception(f"Unexpected result type: {type(result)}")

        if isinstance(vi, str):
            return vi
        if isinstance(vi, dict):
            path = vi.get("video") or vi.get("path") or vi.get("url")
            if path:
                return path
            raise Exception(f"Cannot extract video path: {vi}")
        raise Exception(f"Unsupported result type: {type(vi)}")


# Auto-register
register_adapter("video_wan", VideoWanAdapter)
