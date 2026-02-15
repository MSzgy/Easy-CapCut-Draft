from typing import Dict, Any
from app.providers.base import AudioRequest
from app.providers.spaces.base import SpaceAdapter, register_adapter


class TTSQwenAdapter(SpaceAdapter):
    """Adapter for Imosu/Qwen3-TTS space."""
    capability = "audio"
    api_name = "/generate_voice_design"
    display_name = "Qwen3语音生成"

    def build_params(self, request: AudioRequest) -> Dict[str, Any]:
        """Convert AudioRequest to Qwen3-TTS parameters."""
        return {
            "text": request.text,
            "language": request.language,  # "Auto", "English", "Chinese", etc.
            "voice_description": request.voice_description,
        }
    
    def parse_result(self, result: Any) -> str:
        """Parse the result from the space.
        
        The space returns a tuple: (mp3_path, ???) or just the path depending on version.
        Based on user example: print(result) -> likely a path or simple object.
        Qwen3-TTS typically returns the audio file path.
        """
        # If result is a tuple/list, the first element is usually the audio path
        if isinstance(result, (list, tuple)) and len(result) > 0:
            return str(result[0])
        return str(result)


# Register the adapter
register_adapter("tts_qwen", TTSQwenAdapter)
