"""
Provider Factory

Config-driven factory functions that return the right provider
based on settings. To add a new provider, register it in the
REGISTRY dicts below.
"""

from functools import lru_cache
from typing import Dict, Type, List, Any

from app.providers.base import TextProvider, ImageProvider, VisionProvider, VideoProvider, AudioProvider
from app.core.config import settings


# ─── Provider Registry ────────────────────────────────────────────────────────
# Maps provider name → class. Lazy imports keep startup fast.

def _text_registry() -> Dict[str, Type[TextProvider]]:
    from app.providers.gemini import GeminiProvider
    from app.providers.openai_compat import OpenAICompatProvider
    return {
        "gemini": GeminiProvider,
        "openai": OpenAICompatProvider,
    }


def _image_registry() -> Dict[str, Type[ImageProvider]]:
    from app.providers.gemini import GeminiProvider
    from app.providers.huggingface import HuggingFaceProvider
    return {
        "gemini": GeminiProvider,
        "huggingface": HuggingFaceProvider,
    }


def _vision_registry() -> Dict[str, Type[VisionProvider]]:
    from app.providers.gemini import GeminiProvider
    from app.providers.openai_compat import OpenAICompatProvider
    return {
        "gemini": GeminiProvider,
        "openai": OpenAICompatProvider,
    }


def _video_registry() -> Dict[str, Type[VideoProvider]]:
    from app.providers.huggingface import HuggingFaceProvider
    return {
        "huggingface": HuggingFaceProvider,
    }


def _audio_registry() -> Dict[str, Type[AudioProvider]]:
    from app.providers.huggingface import HuggingFaceProvider
    return {
        "huggingface": HuggingFaceProvider,
    }


# ─── Provider → Required Env Vars ────────────────────────────────────────────

PROVIDER_REQUIRED_VARS: Dict[str, List[str]] = {
    "gemini":      ["GEMINI_API_KEY", "GEMINI_BASE_URL"],
    "openai":      ["OPENAI_API_KEY", "OPENAI_BASE_URL"],
    "huggingface": ["HF_TOKEN"],
}

PROVIDER_DISPLAY_NAMES: Dict[str, str] = {
    "gemini":      "Google Gemini",
    "openai":      "OpenAI 兼容",
    "huggingface": "HuggingFace",
}


# ─── Validation ───────────────────────────────────────────────────────────────

def _check_provider_configured(provider_name: str) -> dict:
    """Check if a provider has all required env vars set.
    
    Returns:
        {
            "configured": bool,
            "missing": ["VAR_NAME", ...],
            "displayName": "Google Gemini",
        }
    """
    required = PROVIDER_REQUIRED_VARS.get(provider_name, [])
    missing = []
    for var in required:
        value = getattr(settings, var, "")
        if not value or value.strip() == "" or value.strip().lower() == "mocked":
            missing.append(var)
    return {
        "configured": len(missing) == 0,
        "missing": missing,
        "displayName": PROVIDER_DISPLAY_NAMES.get(provider_name, provider_name),
    }


def get_all_providers_status() -> Dict[str, Any]:
    """Return availability status for every task type.
    
    Example response:
    {
        "text": {
            "active": "gemini",
            "available": {
                "gemini":  { "configured": true, "missing": [], "displayName": "..." },
                "openai":  { "configured": false, "missing": ["OPENAI_API_KEY"], ... }
            }
        },
        ...,
        "hf_spaces": {
            "image_turbo": { "space_id": "...", "capability": "image", ... },
            ...
        }
    }
    """
    registries = {
        "text":   (_text_registry,   "TEXT_PROVIDER",   "gemini"),
        "image":  (_image_registry,  "IMAGE_PROVIDER",  "gemini"),
        "vision": (_vision_registry, "VISION_PROVIDER", "gemini"),
        "video":  (_video_registry,  "VIDEO_PROVIDER",  "huggingface"),
        "audio":  (_audio_registry,  "AUDIO_PROVIDER",  "huggingface"),
    }

    result = {}
    for task_type, (reg_fn, setting_key, default) in registries.items():
        registry = reg_fn()
        active = getattr(settings, setting_key, default)
        available = {}
        for name in registry:
            available[name] = _check_provider_configured(name)
        result[task_type] = {
            "active": active,
            "available": available,
        }

    # Include HF spaces info for fine-grained model selection
    try:
        from app.providers.spaces import list_spaces
        hf_configured = _check_provider_configured("huggingface")["configured"]
        spaces = list_spaces()
        # Add configured status based on HF_TOKEN
        for alias, info in spaces.items():
            info["configured"] = hf_configured
        result["hf_spaces"] = spaces
    except Exception:
        result["hf_spaces"] = {}

    return result


# ─── Factory Functions ────────────────────────────────────────────────────────

# Cache for dynamically created providers (keyed by name)
_dynamic_providers: Dict[str, Any] = {}


def _create_provider(registry: dict, name: str, task_type: str):
    """Create a provider, validating config first."""
    cls = registry.get(name)
    if not cls:
        raise ValueError(f"未知的 {task_type} 提供商: '{name}'，可选: {list(registry)}")
    
    status = _check_provider_configured(name)
    if not status["configured"]:
        missing_str = ", ".join(status["missing"])
        raise ValueError(
            f"提供商 '{PROVIDER_DISPLAY_NAMES.get(name, name)}' 未配置完成，"
            f"缺少环境变量: {missing_str}。请在 .env 文件中设置这些变量。"
        )
    
    return cls()


@lru_cache()
def get_text_provider(name: str = None) -> TextProvider:
    name = name or getattr(settings, "TEXT_PROVIDER", "gemini")
    return _create_provider(_text_registry(), name, "text")


@lru_cache()
def get_image_provider(name: str = None) -> ImageProvider:
    name = name or getattr(settings, "IMAGE_PROVIDER", "gemini")
    return _create_provider(_image_registry(), name, "image")


@lru_cache()
def get_vision_provider(name: str = None) -> VisionProvider:
    name = name or getattr(settings, "VISION_PROVIDER", "gemini")
    return _create_provider(_vision_registry(), name, "vision")


@lru_cache()
def get_video_provider(name: str = None) -> VideoProvider:
    name = name or getattr(settings, "VIDEO_PROVIDER", "huggingface")
    return _create_provider(_video_registry(), name, "video")


@lru_cache()
def get_audio_provider(name: str = None) -> AudioProvider:
    name = name or getattr(settings, "AUDIO_PROVIDER", "huggingface")
    return _create_provider(_audio_registry(), name, "audio")
