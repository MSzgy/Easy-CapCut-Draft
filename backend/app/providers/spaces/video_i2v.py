"""
Video I2V Space Adapter

Adapts the Imosu/image_audio_to_video space for image-to-video generation.
"""

import base64
import tempfile
from typing import Any, Optional

from app.providers.spaces.base import SpaceAdapter, register_adapter
from app.providers.base import VideoRequest


class VideoI2VAdapter(SpaceAdapter):
    capability = "video"
    api_name = "/generate_video"
    display_name = "I2V 视频生成"

    def _process_input(self, val: Optional[str]):
        """Convert base64 data URL or file path to handle_file object."""
        from gradio_client import handle_file

        if not val:
            return None
        if val.startswith("data:"):
            try:
                header, encoded = val.split(",", 1)
                raw = base64.b64decode(encoded)
                ext = ".bin"
                if "image/jpeg" in header: ext = ".jpg"
                elif "image/png" in header: ext = ".png"
                elif "video/mp4" in header: ext = ".mp4"
                tf = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
                tf.write(raw)
                tf.close()
                return handle_file(tf.name)
            except Exception as e:
                raise Exception(f"Base64 processing error: {e}")
        return handle_file(val)

    def build_params(self, request: VideoRequest) -> dict:
        no_audio_prompt = (
            "IMPORTANT: Generate video WITHOUT any audio or sound. "
            "Video only, no background music, no sound effects, no voice. "
            "Silent video output only. "
        ) + request.prompt

        return {
            "first_frame": self._process_input(request.image),
            "end_frame": self._process_input(request.end_frame),
            "prompt": no_audio_prompt,
            "duration": int(request.duration_seconds),
            "input_video": self._process_input(request.input_video),
            "generation_mode": request.generation_mode,
            "enhance_prompt": request.enhance_prompt,
            "seed": request.seed,
            "randomize_seed": request.randomize_seed,
            "height": request.height,
            "width": request.width,
            "camera_lora": request.camera_lora,
            "audio_path": self._process_input(request.audio_path),
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
register_adapter("video_i2v", VideoI2VAdapter)
