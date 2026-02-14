"""
AI Service (v2) — High-level business logic layer

Uses providers via the factory. All high-level operations (style transfer,
face portrait, scene image generation, etc.) live here.

Routes should import `ai_service` from this module.
"""

import os
import json
import re
from typing import Optional, List

from app.providers.base import TextRequest, ImageRequest, VisionRequest, VideoRequest
from app.providers.factory import (
    get_text_provider,
    get_image_provider,
    get_vision_provider,
    get_video_provider,
)
from app.core.config import settings


class AIService:
    """Facade that composes providers for high-level AI operations."""

    # ── Text ──────────────────────────────────────────────────────────────

    async def generate_completion(
        self,
        prompt: str,
        system_message: str = "You are a helpful assistant.",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        provider: Optional[str] = None,
    ) -> str:
        provider_instance = get_text_provider(provider)
        return await provider_instance.generate_text(TextRequest(
            prompt=prompt,
            system_message=system_message,
            temperature=temperature,
            max_tokens=max_tokens,
        ))

    # ── Image ─────────────────────────────────────────────────────────────

    async def generate_image(
        self,
        prompt: str,
        size: str = "16:9",
        style: str = "photorealistic",
        theme: str = "",
        style_keywords: Optional[list] = None,
        negative_prompt: Optional[str] = None,
        resolution: str = "1024",
        reference_image: Optional[str] = None,
        denoising_strength: float = 0.7,
        preserve_composition: bool = False,
        style_weights: Optional[dict] = None,
        provider: Optional[str] = None,
    ) -> str:
        if provider and provider.startswith("hf:"):
            # Direct instantiation for specific HF spaces to avoid factory cache issues with dynamic args
            from app.providers.huggingface import HuggingFaceProvider
            space_alias = provider.split(":", 1)[1]
            provider_instance = HuggingFaceProvider(image_space=space_alias)
        else:
            provider_instance = get_image_provider(provider)
            
        return await provider_instance.generate_image(ImageRequest(
            prompt=prompt,
            size=size,
            style=style,
            theme=theme,
            style_keywords=style_keywords,
            negative_prompt=negative_prompt,
            resolution=resolution,
            reference_image=reference_image,
            denoising_strength=denoising_strength,
            preserve_composition=preserve_composition,
            style_weights=style_weights,
        ))

    # ── Vision ────────────────────────────────────────────────────────────

    async def analyze_image(self, image_url: str) -> str:
        provider = get_vision_provider()
        return await provider.analyze_image(VisionRequest(
            image_data=image_url,
            prompt="请详细描述这张图片的内容、主题、情绪和适合的使用场景。这将被用于生成视频脚本。",
        ))

    async def analyze_image_detailed(self, prompt: str, image_url: str) -> dict:
        provider = get_vision_provider()
        return await provider.analyze_image_detailed(VisionRequest(
            image_data=image_url,
            prompt=prompt,
            max_tokens=800,
        ))

    async def analyze_transition(
        self,
        first_frame: str,
        end_frame: str,
    ) -> str:
        """Analyze two frames and generate a cinematic transition/motion prompt."""
        provider = get_vision_provider()
        return await provider.analyze_transition(first_frame, end_frame)

    # ── Video ─────────────────────────────────────────────────────────────

    async def generate_video_huggingface(
        self,
        input_image: str,
        prompt: str,
        steps: int = 6,
        negative_prompt: str = "",
        duration_seconds: float = 3.5,
        guidance_scale: float = 1.0,
        guidance_scale_2: float = 1.0,
        seed: int = 42,
        randomize_seed: bool = True,
    ) -> str:
        """HuggingFace video generation via the video_wan space adapter."""
        from app.providers.huggingface import HuggingFaceProvider

        provider = HuggingFaceProvider(video_space="video_wan")
        return await provider.generate_video(VideoRequest(
            image=input_image,
            prompt=prompt,
            duration_seconds=duration_seconds,
            seed=seed,
            randomize_seed=randomize_seed,
        ))

    async def generate_video_image_audio(
        self,
        first_frame: str,
        end_frame: Optional[str] = None,
        prompt: str = "Make this image come alive with cinematic motion",
        duration: int = 5,
        input_video: Optional[str] = None,
        generation_mode: str = "Image-to-Video",
        enhance_prompt: bool = True,
        seed: int = 10,
        randomize_seed: bool = True,
        height: int = 512,
        width: int = 768,
        camera_lora: str = "No LoRA",
        audio_path: Optional[str] = None,
        video_provider: Optional[str] = None,
    ) -> str:
        if video_provider and video_provider.startswith("hf:"):
            from app.providers.huggingface import HuggingFaceProvider
            space_alias = video_provider.split(":", 1)[1]
            provider = HuggingFaceProvider(video_space=space_alias)
        else:
            provider = get_video_provider(video_provider)
        result_path = await provider.generate_video(VideoRequest(
            image=first_frame,
            end_frame=end_frame,
            prompt=prompt,
            duration_seconds=duration,
            seed=seed,
            randomize_seed=randomize_seed,
            height=height,
            width=width,
            input_video=input_video,
            generation_mode=generation_mode,
            enhance_prompt=enhance_prompt,
            camera_lora=camera_lora,
            audio_path=audio_path,
        ))

        # 如果返回的是本地文件路径，移动到 static 目录并返回 URL
        if result_path and os.path.exists(result_path) and not result_path.startswith("http"):
            import shutil
            import uuid
            
            # 生成唯一文件名
            filename = f"video_{uuid.uuid4()}.mp4"
            target_dir = "static/videos"
            os.makedirs(target_dir, exist_ok=True)
            target_path = os.path.join(target_dir, filename)
            
            # 移动文件
            shutil.move(result_path, target_path)
            
            # 返回 URL (假设后端运行在 8000 端口)
            # 在生产环境中应该使用配置文件中的 BASE_URL
            return f"http://localhost:8000/static/videos/{filename}"
            
        return result_path

    # ── Copy / Script ─────────────────────────────────────────────────────

    async def generate_copy(self, content: str, style: str, provider: Optional[str] = None) -> str:
        prompt = f"""请根据以下内容，创作一段吸引人的抖音文案：
        
        内容：{content}
        风格要求：{style}

        要求：
        1. 包含合适的Emoji表情
        2. 添加3-5个相关话题标签（hashtags）
        3. 语言生动有趣，符合抖音用户习惯
        4. 控制在200字以内"""

        return await self.generate_completion(
            prompt=prompt,
            system_message="你是一个爆款短视频文案专家。",
            provider=provider,
        )

    async def generate_video_script(
        self,
        theme: str,
        description: str = "",
        keywords: list = None,
        style: str = "professional",
        duration: int = 60,
    ) -> dict:
        keywords_str = ", ".join(keywords) if keywords else ""
        prompt = f"""请为以下视频内容生成专业的文案：

主题: {theme}
描述: {description}
关键词: {keywords_str}
风格: {style}
视频时长: {duration}秒

请生成以下内容：
1. 3-5个吸引人的标题
2. 开场白（5-10秒）
3. 主体内容
4. 结尾号召语（CTA）
5. 字幕分段（每段3-5秒）

以JSON格式返回。"""

        response = await self.generate_completion(
            prompt=prompt,
            system_message="你是一个专业的视频内容创作专家。",
            temperature=0.8,
        )
        return {"raw_response": response}

    async def recommend_music_tags(self, theme: str, description: str = "") -> dict:
        prompt = f"""基于以下视频内容，推荐合适的背景音乐标签：

主题: {theme}
描述: {description}

分析视频的情绪、节奏、音乐类型、BPM范围，以JSON格式返回。"""

        response = await self.generate_completion(
            prompt=prompt,
            system_message="你是一个音乐推荐专家。",
            temperature=0.5,
        )
        return {"raw_response": response}

    # ── Prompt Optimization ───────────────────────────────────────────────

    async def optimize_prompt(self, prompt: str) -> dict:
        optimization_prompt = f"""作为AI图片生成提示词优化专家，请优化以下提示词：

原始提示词：{prompt}

请提供：
1. 优化后的提示词（更详细、更具体）
2. 3-5条改进建议

以JSON格式返回：{{"optimized": "...", "suggestions": [...]}}"""

        response = await self.generate_completion(
            prompt=optimization_prompt,
            system_message="你是一个专业的AI图片生成提示词优化专家。",
        )

        try:
            match = re.search(r"\{.*\}", response, re.DOTALL)
            if match:
                return json.loads(match.group())
        except Exception:
            pass
        return {
            "optimized": response[:500] if len(response) > 500 else response,
            "suggestions": ["添加更多视觉细节", "指定光线和色调", "描述构图和视角"],
        }

    # ── Style Transfer ────────────────────────────────────────────────────

    STYLE_LIBRARY = {
        "vangogh_starry": {"name": "梵高星空", "prompt": "in the style of Vincent van Gogh's Starry Night, swirling brushstrokes, vibrant blues and yellows"},
        "monet_impressionist": {"name": "莫奈印象派", "prompt": "in the style of Claude Monet, soft light, impressionist painting, pastel colors"},
        "picasso_cubist": {"name": "毕加索立体主义", "prompt": "in the style of Pablo Picasso's cubism, geometric shapes, fragmented perspectives"},
        "ukiyoe": {"name": "日本浮世绘", "prompt": "in the style of Japanese Ukiyo-e woodblock prints, bold outlines, flat colors"},
        "kandinsky_abstract": {"name": "康定斯基抽象", "prompt": "in the style of Wassily Kandinsky, abstract geometric forms, vibrant colors"},
        "pixar_animation": {"name": "皮克斯动画", "prompt": "Pixar animation style, 3D rendered, colorful and vibrant, cute character design"},
        "lego_bricks": {"name": "乐高积木", "prompt": "made of LEGO bricks, blocky construction, colorful plastic pieces"},
        "cyberpunk": {"name": "赛博朋克", "prompt": "cyberpunk style, neon lights, futuristic cityscape, dark and moody"},
        "vaporwave": {"name": "蒸汽波", "prompt": "vaporwave aesthetic, retro 80s/90s, pink and cyan gradients, glitch art"},
        "anime": {"name": "日本动漫", "prompt": "anime art style, cel-shaded, vibrant colors, expressive characters"},
        "crystal": {"name": "水晶材质", "prompt": "made of transparent crystal, glass-like, refractive surfaces"},
        "metallic": {"name": "金属质感", "prompt": "metallic surface, chrome and steel, reflective, industrial aesthetic"},
        "wood_carving": {"name": "木雕", "prompt": "carved from wood, wooden texture, natural wood grain"},
        "paper_art": {"name": "纸艺", "prompt": "paper craft style, cut paper art, layered paper"},
        "watercolor": {"name": "水彩画", "prompt": "watercolor painting, soft washes, flowing colors"},
    }

    async def transfer_style(
        self,
        image_base64: str,
        art_style: str,
        intensity: float = 0.8,
        additional_prompt: str = "",
    ) -> str:
        style_def = self.STYLE_LIBRARY.get(art_style, {"name": "艺术风格", "prompt": f"artistic style: {art_style}"})

        if intensity < 0.3:
            strength = "subtle hint of"
        elif intensity < 0.6:
            strength = "moderate"
        elif intensity < 0.8:
            strength = "strong"
        else:
            strength = "extreme, highly stylized"

        prompt = f"Transform this image with {strength} {style_def['prompt']}. "
        prompt += "IMPORTANT: Preserve the original composition, layout, and main subjects. "
        prompt += "Only change the artistic style and visual treatment. "
        if additional_prompt:
            prompt += f"{additional_prompt}. "

        return await self.generate_image(
            prompt=prompt,
            style=art_style,
            theme="style_transfer",
            size="16:9",
            resolution="1024",
            reference_image=image_base64,
            denoising_strength=intensity,
            preserve_composition=True,
        )

    # ── Sketch to Image ──────────────────────────────────────────────────

    async def sketch_to_image(
        self, sketch_base64: str, prompt: str, style: str = "photorealistic"
    ) -> str:
        full_prompt = f"Based on this rough sketch, create a detailed {style} image: {prompt}. "
        full_prompt += "Preserve the composition and layout from the sketch, enhance with details."

        return await self.generate_image(
            prompt=full_prompt,
            style=style,
            theme="sketch_to_image",
            size="1:1",
            resolution="2k",
            reference_image=sketch_base64,
            denoising_strength=0.7,
            preserve_composition=True,
        )

    # ── Face Portrait ─────────────────────────────────────────────────────

    async def face_portrait(
        self,
        face_image_base64: str,
        scene_prompt: str,
        style: str = "photorealistic",
        preserve_face: float = 0.3,
    ) -> str:
        full_prompt = f"Create a professional {style} portrait: {scene_prompt}. "
        full_prompt += "CRITICAL: PRESERVE the facial features exactly. "
        full_prompt += "DO NOT change the person's face. ONLY change background, clothing, lighting. "

        SCENE_STYLES = {
            "business": "modern office, professional business attire",
            "casual": "relaxed outdoor, casual clothing",
            "traditional": "traditional Chinese setting, hanfu",
            "sci-fi": "futuristic cyberpunk, neon lighting",
            "beach": "beautiful beach at sunset, summer outfit",
            "studio": "professional photo studio, clean background",
        }
        for key, desc in SCENE_STYLES.items():
            if key in scene_prompt.lower():
                full_prompt += f" Scene: {desc}"
                break

        denoising = 1.0 - (preserve_face * 0.5)
        return await self.generate_image(
            prompt=full_prompt,
            style=style,
            theme="face_portrait",
            size="3:4",
            resolution="2k",
            reference_image=face_image_base64,
            denoising_strength=denoising,
            preserve_composition=False,
        )

    # ── Face Swap ─────────────────────────────────────────────────────────

    async def face_swap(
        self,
        face_image_base64: str,
        target_image_base64: str,
        blend_strength: float = 0.7,
    ) -> str:
        prompt = "Swap the face in the target image with the face from the reference image. "
        prompt += "Preserve: face shape, skin tone, facial expressions. "
        prompt += "Keep target: pose, body, clothing, background. "
        prompt += "Natural and professional result."

        return await self.generate_image(
            prompt=prompt,
            style="photorealistic",
            theme="face_swap",
            size="1:1",
            resolution="2k",
            reference_image=face_image_base64,
            denoising_strength=blend_strength,
            preserve_composition=True,
        )

    # ── Background Operations ─────────────────────────────────────────────

    async def remove_background(
        self, image_base64: str, subject: str = "auto", refine_edges: bool = True
    ) -> str:
        hints = {"person": "the person", "object": "the main object", "auto": "the main subject"}
        subj = hints.get(subject, hints["auto"])

        prompt = f"Remove the background, keeping only {subj}. "
        prompt += "Preserve exact appearance. Transparent background. "
        if refine_edges:
            prompt += "Refine edges — smooth transitions, preserve fine details like hair. "

        return await self.generate_image(
            prompt=prompt,
            style="photorealistic",
            theme="background_removal",
            size="1:1",
            resolution="2k",
            reference_image=image_base64,
            denoising_strength=0.3,
            preserve_composition=True,
        )

    async def replace_background(
        self,
        image_base64: str,
        background_scene: str = "nature",
        custom_prompt: str = None,
        background_color: str = "#FFFFFF",
        match_lighting: bool = True,
        add_depth: bool = True,
    ) -> str:
        SCENES = {
            "office": "modern office, professional workspace, soft window lighting",
            "nature": "beautiful natural landscape, outdoor scenery, soft natural lighting",
            "tech": "futuristic tech environment, neon lights, holographic displays",
            "fantasy": "dreamy fantasy background, soft pastel colors, magical atmosphere",
            "solid": f"solid color background {background_color}, professional studio lighting",
            "blur": "same background heavily blurred, bokeh effect, shallow depth of field",
        }

        bg_desc = custom_prompt if custom_prompt and custom_prompt.strip() else SCENES.get(background_scene, SCENES["nature"])

        prompt = f"Replace the background with: {bg_desc}. "
        prompt += "PRESERVE the main subject exactly. ONLY change the background. "
        if match_lighting:
            prompt += "Match lighting between subject and background. "
        if add_depth:
            prompt += "Add subtle depth of field. "

        return await self.generate_image(
            prompt=prompt,
            style="photorealistic",
            theme="background_replacement",
            size="1:1",
            resolution="2k",
            reference_image=image_base64,
            denoising_strength=0.6,
            preserve_composition=True,
        )

    # ── Storyboard ────────────────────────────────────────────────────────

    SHOT_TYPES = {
        "closeup": "close-up shot focusing on character's face",
        "medium": "medium shot showing character from waist up",
        "wide": "wide shot showing full scene",
        "over_shoulder": "over-the-shoulder shot",
        "birds_eye": "bird's eye view from above",
    }

    async def generate_storyboard(
        self,
        story_prompt: str,
        character_image: str = None,
        num_frames: int = 6,
        style: str = "photorealistic",
        shot_types: list = None,
    ) -> list:
        if not shot_types:
            shot_types = ["medium", "closeup", "wide", "medium", "closeup", "wide"]
        while len(shot_types) < num_frames:
            shot_types.extend(shot_types)
        shot_types = shot_types[:num_frames]

        # Split story into scenes via text provider
        split_prompt = f"""Given this story: "{story_prompt}"
Split it into exactly {num_frames} sequential scenes for a storyboard.
For each scene, provide a visual description (1-2 sentences).
Format as a numbered list."""

        try:
            split_response = await self.generate_completion(split_prompt, temperature=0.7)
            scenes = []
            for line in split_response.strip().split("\n"):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith("-")):
                    desc = line.split(".", 1)[-1].split(")", 1)[-1].strip()
                    if desc:
                        scenes.append(desc)
            if len(scenes) < num_frames:
                scenes = [f"Scene {i+1}: {story_prompt}" for i in range(num_frames)]
            scenes = scenes[:num_frames]
        except Exception:
            scenes = [f"Scene {i+1}: {story_prompt}" for i in range(num_frames)]

        frames = []
        previous_image = None

        for i, scene_desc in enumerate(scenes):
            shot_desc = self.SHOT_TYPES.get(shot_types[i], self.SHOT_TYPES["medium"])
            prompt = f"{scene_desc}. Camera: {shot_desc}. Style: {style}, cinematic lighting. "
            prompt += "CRITICAL: DO NOT render any text in the image. Pure visual content only."

            if character_image or previous_image:
                prompt += " Maintain consistent character appearance."

            ref = character_image if character_image else previous_image

            try:
                image_url = await self.generate_image(
                    prompt=prompt,
                    style=style,
                    theme="storyboard",
                    size="16:9",
                    resolution="1024",
                    reference_image=ref,
                    denoising_strength=0.5 if ref else 0.7,
                    preserve_composition=False,
                )
                if not character_image:
                    previous_image = image_url
                frames.append({
                    "frameNumber": i + 1,
                    "imageUrl": image_url,
                    "description": scene_desc,
                    "shotType": shot_types[i],
                })
            except Exception as e:
                print(f"Frame {i+1} failed: {e}")

        return frames

    # ── HuggingFace Image (convenience wrapper) ────────────────────────────

    async def generate_image_huggingface(
        self,
        prompt: str,
        height: int = 1024,
        width: int = 1024,
        num_inference_steps: int = 9,
        seed: int = 32,
        randomize_seed: bool = True,
        image_space: str = "image_turbo",
        **kwargs,
    ) -> str:
        """HuggingFace image generation — delegates to generate_image with hf: provider."""
        return await self.generate_image(
            prompt=prompt,
            size=f"{width}:{height}",
            provider=f"hf:{image_space}",
            **{k: v for k, v in kwargs.items()
               if k in ('style', 'theme', 'style_keywords', 'negative_prompt',
                         'resolution', 'reference_image', 'denoising_strength',
                         'preserve_composition', 'style_weights')},
        )

    # ── Video Project ─────────────────────────────────────────────────────

    def generate_full_video_project(
        self,
        project_id: str,
        script_data: dict,
        image_paths: list,
        audio_paths: list,
        mode: str = "capcut",
        ai_enhanced: bool = False,
    ) -> str:
        from app.services.video.manager import VideoManager

        video_output_dir = os.path.join(settings.UPLOAD_DIR, "video_outputs")
        manager = VideoManager(output_base_dir=video_output_dir)

        sections = script_data.get("sections", [])
        if not sections and script_data.get("subtitles"):
            sections = [{"duration": 5.0} for _ in image_paths]

        timeline = manager.create_timeline_from_script(
            project_id=project_id,
            script_sections=sections,
            images=image_paths,
            audio_files=audio_paths,
        )

        return manager.process_video_generation(
            timeline=timeline, mode=mode, ai_enhanced=ai_enhanced
        )

    # ── lifecycle ─────────────────────────────────────────────────────────

    async def close(self):
        for getter in (get_text_provider, get_image_provider, get_vision_provider, get_video_provider):
            try:
                await getter().close()
            except Exception:
                pass


# ── Singleton ─────────────────────────────────────────────────────────────────
ai_service = AIService()
