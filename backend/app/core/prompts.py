# app/core/prompts.py
from enum import Enum

class ImageIntent(str, Enum):
    COVER_DOUYIN = "cover_douyin"       # 抖音封面
    SHOT_SCENE = "shot_scene"           # 剧本分镜
    CHARACTER_CARD = "character_card"   # 角色卡片
    GENERAL = "general"                 # 通用图片
    TRANSITION_GRID = "transition_grid" # 过渡帧宫格

# 预定义的 Prompt 模板字典
PROMPT_TEMPLATES = {
    ImageIntent.COVER_DOUYIN: (
        "Create an eye-catching, vibrant cover image suitable for a short video platform like TikTok/Douyin. "
        "The core theme/element is: {prompt}. "
        "Ensure the composition leaves safe margins for UI elements and text overlays, high contrast, vivid colors, and visually striking."
    ),
    ImageIntent.SHOT_SCENE: (
        "Cinematic storyboard shot. {prompt}. "
        "High quality, photorealistic, 8k resolution, cinematic lighting, movie still, highly detailed."
    ),
    ImageIntent.CHARACTER_CARD: (
        "Character Design Reference Sheet. {prompt}. "
        "Must include multiple angles of the character (front view, side profile, and back view). "
        "Clearly show the character's clothing style, texture, accessories, and facial features in high detail. "
        "This image will be used as a consistent character reference for future generations. "
        "White background, photorealistic, concept art, extremely detailed, studio lighting, professional character design."
    ),
    ImageIntent.GENERAL: (
        "Generate a high-quality image based on the following description: {prompt}. Detailed and visually appealing."
    ),
    ImageIntent.TRANSITION_GRID: (
        "Create a grid image showing smooth intermediate transition frames between two consecutive scenes. "
        "DO NOT include or reproduce the original start and end scene frames in this grid — every frame in the grid must be a NEW intermediate frame. "
        "ONLY generate the intermediate transition frames that would bridge them. "
        "The frames should show a logical visual progression, blending elements, lighting, composition, and camera movement smoothly. "
        "IMPORTANT: The background and environment must gradually evolve from the start scene to the end scene across the transition frames — show a progressive shift in location, color palette, and atmosphere. "
        "CRITICAL: Maintain strict the main character consistency across all frames — characters must have the same face, hairstyle, clothing, and body proportions as shown in the reference images. "
        "Pay attention to the scene context, character actions, props, and dialogue/narration described below to ensure the transition is narratively coherent. "
        "Each individual frame within the grid must maintain a 16:9 aspect ratio, matching the aspect ratio of the original shot images. "
        "Output ONLY a single image containing the grid layout. "
        "Style: cinematic, high quality, consistent with the reference images. "
        "{prompt}"
    )
}

def get_image_prompt(intent: str, base_prompt: str, **kwargs) -> str:
    """
    根据意图获取完整的 Prompt。如果意图不存在，则默认使用 GENERAL。
    """
    try:
        intent_enum = ImageIntent(intent)
    except ValueError:
        intent_enum = ImageIntent.GENERAL
        
    template = PROMPT_TEMPLATES.get(intent_enum, PROMPT_TEMPLATES[ImageIntent.GENERAL])
    return template.format(prompt=base_prompt, **kwargs)
