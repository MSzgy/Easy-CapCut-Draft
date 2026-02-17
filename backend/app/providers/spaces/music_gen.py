import base64
import tempfile
from typing import Any, Optional

from app.providers.spaces.base import SpaceAdapter, register_adapter
from app.providers.base import MusicRequest


class MusicGenAdapter(SpaceAdapter):
    capability = "music"
    api_name = "/predict"
    display_name = "MusicGen 音乐生成"
    space_id = "facebook/musicgen-small" 

    def build_params(self, request: MusicRequest) -> dict:
        # MusicGen inputs: 
        # (text, audio, duration)
        # We'll need to check the exact API signature of the space we choose.
        # Assuming typical gradio interface for MusicGen.
        return {
            "text": request.prompt,
            "audio": None, # Melody audio, optional
            "duration": request.duration_seconds if request.duration_seconds else 10,
        }

    def parse_result(self, result: Any) -> str:
        # MusicGen typically returns a tuple (sampling_rate, audio_data) or a filepath
        # We need to handle both
        if isinstance(result, tuple):
             # If it's a tuple, it might be (sr, data), handled by gradio
             # But usually gradio client returns a filepath for audio outputs
             return result[1] # Trying to get the filepath
        elif isinstance(result, str):
            # If it's a string, it's likely the filepath
            return result
        
        # If result is a list/tuple and has a filepath
        if isinstance(result, (list, tuple)) and len(result) > 0:
             if isinstance(result[0], str):
                 return result[0]
             # If it returns (sr, data) which is rare for client.predict unless configured
             pass

        # Fallback
        return str(result)


# Auto-register
register_adapter("music_gen", MusicGenAdapter)
