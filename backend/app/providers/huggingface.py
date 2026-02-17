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

        # Check if this is a voice clone request
        if request.reference_audio:
            # Voice Clone Mode
            return await self._generate_voice_clone(request, adapter)
        
        # Standard TTS Mode
        params = adapter.build_params(request)

        def _run():
            from gradio_client import Client
            client = Client(adapter.space_id, token=self.hf_token)
            return client.predict(**params, api_name=adapter.api_name)

        result = await asyncio.to_thread(_run)
        return adapter.parse_result(result)

    async def _generate_voice_clone(self, request: AudioRequest, adapter) -> str:
        """Handle voice cloning using Qwen3-TTS or compatible space."""
        import tempfile
        import base64
        import os
        from gradio_client import handle_file

        # 1. Decode base64 audio to temp file
        if ";base64," in request.reference_audio:
            header, encoded = request.reference_audio.split(";base64,", 1)
            data = base64.b64decode(encoded)
            ext = ".wav"
            if "mpeg" in header: ext = ".mp3"
        else:
            # Assume raw base64 or file path (if path, we might need to handle differently, but schema implies base64/url)
            try:
                data = base64.b64decode(request.reference_audio)
                ext = ".wav" 
            except:
                # If it's a URL or path, we might need to download or use as is. 
                # For now assume base64 as per frontend implementation plan.
                raise ValueError("Invalid reference audio format. Expected base64.")

        temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        temp_audio.write(data)
        temp_audio.close()
        
        try:
            def _run_clone():
                from gradio_client import Client
                client = Client(adapter.space_id, token=self.hf_token)
                
                # Qwen3-TTS specific signature for voice cloning
                # Note: api_name might differ for other spaces, but we optimize for Qwen3-TTS here
                return client.predict(
                    ref_audio=handle_file(temp_audio.name),
                    ref_text=request.reference_text or "",
                    target_text=request.text,
                    language=request.language if request.language != "Auto" else "Auto",
                    use_xvector_only=False, # Use prompt encoding for better quality if ref_text provided
                    model_size="1.7B",
                    api_name="/generate_voice_clone"
                )

            result = await asyncio.to_thread(_run_clone)
            # The result from generate_voice_clone is typically (sample_rate, audio_data) or a filepath
            # Gradio client usually returns a filepath for audio outputs
            return adapter.parse_result(result)
            
        finally:
            # Cleanup temp file
            if os.path.exists(temp_audio.name):
                os.unlink(temp_audio.name)

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
