"""
AI Provider Abstraction Layer

Provides a unified interface for different AI service providers (Gemini, OpenAI, HuggingFace, etc.)
To add a new provider:
1. Create a new file in this package implementing the relevant base interfaces
2. Register it in factory.py
3. Set the provider name in .env
"""

from app.providers.base import TextProvider, ImageProvider, VisionProvider, VideoProvider
from app.providers.factory import get_text_provider, get_image_provider, get_vision_provider, get_video_provider

__all__ = [
    "TextProvider",
    "ImageProvider", 
    "VisionProvider",
    "VideoProvider",
    "get_text_provider",
    "get_image_provider",
    "get_vision_provider",
    "get_video_provider",
]
