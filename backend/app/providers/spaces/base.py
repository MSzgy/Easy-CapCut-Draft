"""
Space Adapter base class and registry.

Each HuggingFace Space has its own parameter format and result parsing.
The adapter pattern lets us add new spaces without touching HuggingFaceProvider.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Type
import json

from app.core.config import settings


class SpaceAdapter(ABC):
    """Abstract adapter for a HuggingFace Gradio Space."""

    # Subclasses set these
    space_id: str = ""              # e.g. "Imosu/Z-Image-Turbo"
    capability: str = ""            # "image" or "video"
    api_name: str = "/predict"      # Gradio endpoint name
    display_name: str = ""

    def __init__(self, space_id: str, hf_token: str = ""):
        self.space_id = space_id
        self.hf_token = hf_token or settings.HF_TOKEN

    @abstractmethod
    def build_params(self, request: Any) -> dict:
        """Convert a unified request DTO into space-specific kwargs for client.predict()."""
        ...

    @abstractmethod
    def parse_result(self, result: Any) -> str:
        """Extract the output path/URL/base64 from the raw Gradio result."""
        ...


# ─── Registry ─────────────────────────────────────────────────────────────────

# Mapping from alias → adapter class
_ADAPTER_CLASSES: Dict[str, Type[SpaceAdapter]] = {}


def register_adapter(alias: str, cls: Type[SpaceAdapter]):
    """Register a space adapter class under an alias."""
    _ADAPTER_CLASSES[alias] = cls


def get_space_adapter(alias: str) -> SpaceAdapter:
    """Get an adapter instance by its alias (from HF_SPACES config)."""
    # Parse HF_SPACES JSON
    try:
        spaces_map: Dict[str, str] = json.loads(settings.HF_SPACES)
    except (json.JSONDecodeError, TypeError):
        spaces_map = {}

    space_id = spaces_map.get(alias)
    if not space_id:
        raise ValueError(
            f"HuggingFace Space '{alias}' 未在 HF_SPACES 中配置。"
            f" 已配置: {list(spaces_map.keys())}"
        )

    adapter_cls = _ADAPTER_CLASSES.get(alias)
    if not adapter_cls:
        raise ValueError(
            f"Space alias '{alias}' 没有对应的 Adapter 实现。"
            f" 已注册: {list(_ADAPTER_CLASSES.keys())}"
        )

    return adapter_cls(space_id=space_id)


def list_spaces() -> Dict[str, dict]:
    """List all configured spaces and their status."""
    try:
        spaces_map: Dict[str, str] = json.loads(settings.HF_SPACES)
    except (json.JSONDecodeError, TypeError):
        spaces_map = {}

    result = {}
    for alias, space_id in spaces_map.items():
        has_adapter = alias in _ADAPTER_CLASSES
        adapter_cls = _ADAPTER_CLASSES.get(alias)
        result[alias] = {
            "space_id": space_id,
            "has_adapter": has_adapter,
            "capability": adapter_cls.capability if adapter_cls else "unknown",
            "display_name": adapter_cls.display_name if adapter_cls else alias,
        }
    return result
