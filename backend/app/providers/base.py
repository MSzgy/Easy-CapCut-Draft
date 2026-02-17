"""
Abstract base interfaces for AI providers.

Each interface defines a single capability (text, image, vision, video).
A concrete provider can implement one or more of these interfaces.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field


# ─── Data Transfer Objects ───────────────────────────────────────────────────

@dataclass
class TextRequest:
    """Unified request for text generation."""
    prompt: str
    system_message: str = "You are a helpful assistant."
    temperature: float = 0.7
    max_tokens: Optional[int] = None


@dataclass
class ImageRequest:
    """Unified request for image generation."""
    prompt: str
    size: str = "16:9"              # aspect ratio
    style: str = "photorealistic"
    theme: str = ""
    style_keywords: Optional[List[str]] = None
    negative_prompt: Optional[str] = None
    resolution: str = "1024"
    reference_image: Optional[str] = None       # base64 data URL
    denoising_strength: float = 0.7
    preserve_composition: bool = False
    style_weights: Optional[Dict[str, float]] = None


@dataclass
class VisionRequest:
    """Unified request for image analysis."""
    image_data: str                 # base64 or URL
    prompt: str = "请详细描述这张图片的内容。"
    max_tokens: int = 500


@dataclass
class VideoRequest:
    """Unified request for video generation."""
    image: str                      # first frame (base64 / URL / path)
    prompt: str = ""
    end_frame: Optional[str] = None
    duration_seconds: float = 3.5
    steps: int = 6
    negative_prompt: str = ""
    guidance_scale: float = 1.0
    seed: int = 42
    randomize_seed: bool = True
    height: int = 512
    width: int = 768
    input_video: Optional[str] = None
    generation_mode: str = "Image-to-Video"
    enhance_prompt: bool = True
    camera_lora: str = "No LoRA"
    audio_path: Optional[str] = None


@dataclass
class AudioRequest:
    """Unified request for audio generation (TTS)."""
    text: str
    voice_description: str = "A clear and professional voice."
    language: str = "Auto"
    speed: float = 1.0
    emotion: Optional[str] = None


@dataclass
class MusicRequest:
    """Unified request for music generation."""
    prompt: str
    duration_seconds: float = 10.0
    model: str = "medium" # small, medium, large, melody



# ─── Abstract Provider Interfaces ────────────────────────────────────────────

class TextProvider(ABC):
    """Interface for text/chat completion providers."""

    @abstractmethod
    async def generate_text(self, request: TextRequest) -> str:
        """Generate text from a prompt. Returns the generated text."""
        ...

    @abstractmethod
    async def close(self) -> None:
        """Release resources."""
        ...


class ImageProvider(ABC):
    """Interface for image generation providers."""

    @abstractmethod
    async def generate_image(self, request: ImageRequest) -> str:
        """Generate an image. Returns a data URL (data:image/...;base64,...)."""
        ...

    @abstractmethod
    async def close(self) -> None:
        ...


class VisionProvider(ABC):
    """Interface for image understanding / vision providers."""

    @abstractmethod
    async def analyze_image(self, request: VisionRequest) -> str:
        """Analyze an image and return text description."""
        ...

    @abstractmethod
    async def analyze_image_detailed(self, request: VisionRequest) -> dict:
        """Analyze an image and return structured data (dict with description, tags, etc.)."""
        ...

    @abstractmethod
    async def analyze_transition(self, first_frame: str, end_frame: str) -> str:
        """Analyze two frames and return a cinematic transition/motion prompt."""
        ...

    @abstractmethod
    async def close(self) -> None:
        ...


class VideoProvider(ABC):
    """Interface for video generation providers."""

    @abstractmethod
    async def generate_video(self, request: VideoRequest) -> str:
        """Generate a video. Returns a file path or URL."""
        ...

    @abstractmethod
    async def close(self) -> None:
        ...


class AudioProvider(ABC):
    """Interface for audio generation providers (TTS)."""

    @abstractmethod
    async def generate_speech(self, request: AudioRequest) -> str:
        """Generate speech from text. Returns a file path or URL."""
        ...

    @abstractmethod
    async def close(self) -> None:
        ...


class MusicProvider(ABC):
    """Interface for music generation providers."""

    @abstractmethod
    async def generate_music(self, request: MusicRequest) -> str:
        """Generate music from text. Returns a file path or URL."""
        ...

    @abstractmethod
    async def close(self) -> None:
        ...
