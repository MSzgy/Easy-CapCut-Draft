"""
HuggingFace Provider

Implements ImageProvider and VideoProvider using the Space Registry.
Each space has its own adapter that handles parameter building and result parsing.
"""

import asyncio
from typing import Optional

from app.providers.base import (
    ImageProvider, VideoProvider, AudioProvider, MusicProvider,
    ImageRequest, VideoRequest, AudioRequest, MusicRequest,
)
from app.providers.spaces import get_space_adapter, list_spaces
from app.core.config import settings


class HuggingFaceProvider(ImageProvider, VideoProvider, AudioProvider, MusicProvider):
    """Provider for HuggingFace Spaces (Gradio-based).
    
    Uses the Space Registry to dynamically select adapters.
    Default space aliases can be overridden per-call.
    """

    def __init__(
        self,
        hf_token: str = None,
        image_space: str = "image_turbo",
        video_space: str = "video_i2v",
        audio_space: str = "tts_qwen",
        music_space: str = "music_gen",
    ):
        self.hf_token = hf_token or settings.HF_TOKEN
        self.image_space = image_space
        self.video_space = video_space
        self.audio_space = audio_space
        self.music_space = music_space

    # ── ImageProvider ─────────────────────────────────────────────────────

    async def generate_image(self, request: ImageRequest) -> str:
        adapter = get_space_adapter(self.image_space)
        adapter.hf_token = self.hf_token

        params = adapter.build_params(request)
        def _run():
            from gradio_client import Client
            import gradio_client.utils
            import traceback

            # Save originals before monkey-patching
            original_get_type = gradio_client.utils.get_type
            original_value_is_file = gradio_client.utils.value_is_file

            # Patch get_type to handle bool values in schema
            def patched_get_type(schema):
                if isinstance(schema, bool):
                    return "bool"
                return original_get_type(schema)

            # Patch value_is_file to handle bool values
            def patched_value_is_file(value):
                if isinstance(value, bool):
                    return False
                return original_value_is_file(value)

            gradio_client.utils.get_type = patched_get_type
            gradio_client.utils.value_is_file = patched_value_is_file

            try:
                client = Client(adapter.space_id, token=self.hf_token)
                print(adapter.space_id)
                return client.predict(**params, api_name=adapter.api_name)
            except Exception:
                traceback.print_exc()
                raise
            finally:
                # Restore original functions
                gradio_client.utils.get_type = original_get_type
                gradio_client.utils.value_is_file = original_value_is_file

        result = await asyncio.to_thread(_run)
        print(result)
        return adapter.parse_result(result)

    # ── VideoProvider ─────────────────────────────────────────────────────

    async def generate_video(self, request: VideoRequest) -> str:
        adapter = get_space_adapter(self.video_space)
        adapter.hf_token = self.hf_token

        params = adapter.build_params(request)
        MAX_RETRIES = 3

        def _run():
            from gradio_client import Client
            client = Client(adapter.space_id, token=self.hf_token)
            return client.predict(**params, api_name=adapter.api_name)

        last_err = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                print(f"🎬 Video generation attempt {attempt}/{MAX_RETRIES} "
                      f"(space: {adapter.space_id})...")
                result = await asyncio.to_thread(_run)
                path = adapter.parse_result(result)
                if path:
                    print(f"✅ Video generated (attempt {attempt})")
                    return path
                raise Exception("Empty video path")
            except Exception as e:
                last_err = e
                print(f"⚠️ Attempt {attempt}/{MAX_RETRIES} failed: {e}")
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(attempt * 2)

        raise Exception(
            f"HF video generation failed after {MAX_RETRIES} retries: {last_err}"
        )


    # ── AudioProvider ─────────────────────────────────────────────────────

    async def generate_speech(self, request: AudioRequest) -> str:
        adapter = get_space_adapter(self.audio_space)
        adapter.hf_token = self.hf_token

        params = adapter.build_params(request)

        def _run():
            from gradio_client import Client
            client = Client(adapter.space_id, token=self.hf_token)
            return client.predict(**params, api_name=adapter.api_name)

        result = await asyncio.to_thread(_run)
        return adapter.parse_result(result)

    # ── lifecycle ─────────────────────────────────────────────────────────

    async def close(self) -> None:
        pass  # gradio clients are ephemeral


    # ── MusicProvider ─────────────────────────────────────────────────────

    async def generate_music(self, request: MusicRequest) -> str:
        adapter = get_space_adapter(self.music_space)
        adapter.hf_token = self.hf_token

        params = adapter.build_params(request)

        def _run():
            from gradio_client import Client
            client = Client(adapter.space_id, token=self.hf_token)
            return client.predict(**params, api_name=adapter.api_name)

        result = await asyncio.to_thread(_run)
        return adapter.parse_result(result)
