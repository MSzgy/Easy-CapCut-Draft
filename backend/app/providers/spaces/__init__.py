"""
HuggingFace Spaces package.

Import this module to auto-register all built-in adapters.
"""

from app.providers.spaces.base import (
    SpaceAdapter,
    register_adapter,
    get_space_adapter,
    list_spaces,
)

# Auto-register built-in adapters by importing them
from app.providers.spaces import image_turbo   # noqa: F401
from app.providers.spaces import video_i2v     # noqa: F401
from app.providers.spaces import video_wan     # noqa: F401
from app.providers.spaces import tts_qwen      # noqa: F401

__all__ = [
    "SpaceAdapter",
    "register_adapter",
    "get_space_adapter",
    "list_spaces",
]
