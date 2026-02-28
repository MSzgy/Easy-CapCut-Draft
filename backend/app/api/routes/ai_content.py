from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Optional
from app.core.auth import get_current_user
from app.core.prompts import get_image_prompt
import json
import re
from app.schemas.ai_schemas import (
    GenerateContentRequest,
    GenerateContentResponse,
    GenerateCoverRequest,
    GenerateCoverResponse,
    OptimizePromptRequest,
    OptimizePromptResponse,
    StyleTransferRequest,
    StyleTransferResponse,
    StickerRequest,
    StickerResponse,
    SketchToImageRequest,
    SketchToImageResponse,
    FacePortraitRequest,
    FacePortraitResponse,
    FaceSwapRequest,
    FaceSwapResponse,
    BackgroundRemovalRequest,
    BackgroundRemovalResponse,
    BackgroundReplacementRequest,
    BackgroundReplacementResponse,
    StoryboardRequest,
    StoryboardResponse,
    SceneContent,
    HuggingFaceImageRequest,
    HuggingFaceImageResponse,
    HuggingFaceVideoRequest,
    HuggingFaceVideoResponse,
    ImageAudioToVideoRequest,
    ImageAudioToVideoResponse,
    ConcatenateVideosRequest,
    ConcatenateVideosResponse,
    AnalyzeTransitionRequest,
    AnalyzeTransitionResponse,
    SpeechRequest,
    SpeechResponse,
    GenerateMusicRequest,
    GenerateMusicResponse,
    RecommendMusicRequest,
    RecommendMusicResponse,
    MusicRecommendation,
    AnalyzeVideoResponse,
    ScriptShot,
    EnhanceScriptRequest,
    EnhanceScriptResponse,
    DeconstructScriptRequest,
    DeconstructScriptResponse,
)
from app.services.ai_service_v2 import ai_service
from app.providers.factory import get_all_providers_status
from app.core.auth import get_current_user, require_admin
from typing import List, Optional
import json
import re
import os
import tempfile

router = APIRouter()


@router.get("/providers")
async def list_providers(current_user=Depends(require_admin)):
    """返回所有 provider 的配置状态，前端据此决定哪些可选"""
    try:
        return get_all_providers_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取 provider 信息失败: {str(e)}")


async def extract_url_content(url: str, text_provider: str = None) -> dict:
    """从URL提取内容 - 使用爬虫获取截图和HTML，然后用多模态LLM分析"""
    
    import base64
    import asyncio
    from pathlib import Path
    from app.scraper.full_capture import run_all_scrapers
    
    try:
        # 步骤1: 在单独线程中运行同步爬虫（避免asyncio冲突）
        print(f"🚀 开始爬取网站: {url}")
        
        # 确定输出目录
        scraper_dir = Path(__file__).parent.parent.parent / "scraper"
        scraper_dir.mkdir(parents=True, exist_ok=True)
        
        # 调用爬虫，指定输出目录
        await asyncio.to_thread(run_all_scrapers, url, str(scraper_dir))
        
        # 步骤2: 读取生成的文件
        screenshot_path = scraper_dir / "result_full.png"
        html_path = scraper_dir / "result_source.html"
        text_path = scraper_dir / "result_extracted_text.txt"
        
        # 读取截图（转为base64）
        screenshot_base64 = None
        if screenshot_path.exists():
            with open(screenshot_path, 'rb') as f:
                screenshot_base64 = base64.b64encode(f.read()).decode('utf-8')
            print(f"✅ 已读取截图: {screenshot_path.stat().st_size / 1024:.2f} KB")
        
        # 读取HTML（限制长度避免token过多）
        html_content = None
        if html_path.exists():
            with open(html_path, 'r', encoding='utf-8') as f:
                html_content = f.read()[:20000]  # 限制20000字符
            print(f"✅ 已读取HTML")
        
        # 读取提取的文本
        extracted_text = None
        if text_path.exists():
            with open(text_path, 'r', encoding='utf-8') as f:
                extracted_text = f.read()
            print(f"✅ 已读取提取的文本")
        
        # 步骤3: 构建提示词，包含HTML和提取的文本作为上下文
        prompt = f"""我需要你分析这个网站的内容。

                网站URL: {url}

                我已经为你提供了：
                1. 网页完整截图（图片）
                2. HTML源代码片段
                3. 提取的文本内容

                **HTML源代码片段：**
                ```html
                {html_content if html_content else '未获取到HTML'}
                ```

                **提取的文本：**
                ```
                {extracted_text if extracted_text else '未获取到文本'}
                ```

                请基于截图、HTML和文本内容，提取以下信息，并严格按照JSON格式返回：
                {{
                    "title": "网站标题",
                    "description": "网站简短描述/摘要 (100字以内)",
                    "keywords": ["关键词1", "关键词2", "关键词3", "关键词4", "关键词5"],
                    "main_content": "网站主要内容详情 (300-500字，保留核心价值信息)"
                }}

                注意：
                1. 必须返回合法的JSON字符串
                2. 不要包含Markdown格式标记（如 ```json ... ```）
                3. 仔细观察截图中的视觉内容和文字
                4. 结合HTML结构理解页面布局
                5. main_content应该提取网站的核心信息和价值主张
                """

        # 步骤4: 调用多模态API（图片 + 文本）
        if screenshot_base64:
            print("🤖 正在调用多模态LLM分析...")
            
            # analyze_image_detailed 返回的是 dict，直接使用
            result = await ai_service.analyze_image_detailed(prompt, screenshot_base64)
            
            print(f"✅ 内容提取成功: {result.get('title', 'Unknown')}")
            
            return {
                "title": result.get("title", "Unknown Website"),
                "description": result.get("description", "No description available"),
                "keywords": result.get("keywords", []),
                "main_content": result.get("main_content", "Content could not be extracted.")
            }
            
        else:
            # 如果没有截图，使用纯文本模式
            print("⚠️  未找到截图，使用纯文本模式")
            content = await ai_service.generate_completion(
                prompt=prompt,
                system_message="你是一个专业的网页内容提取助手。",
                temperature=0.3,
                max_tokens=4096,
                provider=text_provider
            )
            
            # 纯文本模式返回的是字符串，需要解析JSON
            cleaned_content = content.strip()
            json_match = re.search(r'\{.*\}', cleaned_content, re.DOTALL)
            if json_match:
                cleaned_content = json_match.group()
                
            data = json.loads(cleaned_content)
            
            print(f"✅ 内容提取成功: {data.get('title', 'Unknown')}")
            
            return {
                "title": data.get("title", "Unknown Website"),
                "description": data.get("description", "No description available"),
                "keywords": data.get("keywords", []),
                "main_content": data.get("main_content", "Content could not be extracted.")
            }
        
    except Exception as e:
        print(f"❌ URL内容提取失败: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # 降级：使用原来的纯文本方法
        return {
            "title": "Content Extraction Failed",
            "description": f"Failed to extract content from {url}",
            "keywords": [],
            "main_content": f"Error: {str(e)}"
        }


async def generate_images_for_scenes(scenes: List[SceneContent], unified_style: str = None, style_keywords: list = None, use_style_reference: bool = True, user_style_reference: str = None, image_provider: str = None, image_model: str = None):
    """为场景批量生成图片，保持风格一致性
    
    Args:
        scenes: 场景列表
        unified_style: 统一视觉风格（如 "cinematic", "minimal" 等）
        style_keywords: 风格关键词列表，增强风格一致性
        use_style_reference: 是否使用第一张图片作为风格参考
        user_style_reference: 用户提供的风格参考图
    """
    total_scenes = len(scenes)
    style_reference_image: str = None  # 存储第一张图片作为风格参考
    
    async def generate_single_image(scene: SceneContent, index: int, style_ref: str = None):
        """为单个场景生成图片"""
        try:
            # 构建基础prompt
            base_prompt = scene.imageMetadata.description if scene.imageMetadata else scene.imageDescription
            
            # 添加统一风格约束前缀（确保分镜风格一致）- 不使用标签格式避免被渲染成文字
            style_prefix = ""
            if unified_style:
                style_prefix = f"Visual style: {unified_style}. "
            
            # 如果有风格参考图片，添加风格参考提示（强调只参考风格，不复制内容）
            if style_ref:
                style_prefix += "Use the reference image ONLY for style guidance (color palette, lighting, artistic style, character appearance). Generate NEW and DIFFERENT scene content as described below. Do NOT copy the reference image content. "
            
            # 添加风格关键词后缀
            keywords_suffix = ""
            if style_keywords and len(style_keywords) > 0:
                keywords_suffix = f". Style keywords: {', '.join(style_keywords)}"
            
            # 组合完整prompt
            prompt = style_prefix + base_prompt
            
            # 添加场景自身的风格和情绪信息
            if scene.imageMetadata:
                if scene.imageMetadata.mood:
                    prompt += f", {scene.imageMetadata.mood} mood"
                if scene.imageMetadata.color_scheme:
                    prompt += f", {scene.imageMetadata.color_scheme} color scheme"
            
            # 关键：禁止在图片中渲染任何文字，优化画面质量
            prompt += ". CRITICAL: High quality cinematic composition. Balanced layout. DO NOT render any text, labels, titles, watermarks, or descriptions. Pure visual content only."
            prompt += keywords_suffix
            
            # 定义负面提示词 - 移除 split screen/grid 限制，重点限制低质量和构图问题
            negative_prompt = "text, watermark, signature, label, title, caption, blurry, low quality, distorted, bad anatomy, bad hands, missing fingers, extra fingers, bad composition, awkward framing, uneven layout"
            
            ref_status = "with style ref" if style_ref else "first image"
            print(f"🎨 Generating Scene {index + 1} ({ref_status}): {prompt[:70]}...")
            
            # 确定统一的风格
            final_style = unified_style if unified_style else (scene.imageMetadata.style if scene.imageMetadata and scene.imageMetadata.style else "photorealistic")
            
            # 调用图片生成API
            # 使用较高的 denoising_strength (0.75-0.8) 允许内容变化，同时保持风格一致
            # 第一张图无参考，后续图片使用第一张作为风格参考
            denoising = 0.78 if style_ref else 0.7
            
            image_url = await ai_service.generate_image(
                prompt=prompt,
                style=final_style,
                style_keywords=style_keywords,
                negative_prompt=negative_prompt,  # 传入负面提示词
                theme="video_scene",
                size="16:9",
                resolution="1024",
                reference_image=style_ref,
                denoising_strength=denoising,
                preserve_composition=False,  # 不保留构图，只保留风格
                provider=image_provider,
                image_model=image_model
            )
            
            # 更新场景的imageUrl
            scene.imageUrl = image_url
            print(f"✅ Scene {index + 1} 图片生成成功")
            
            return image_url
            
        except Exception as e:
            print(f"⚠️ Scene {index + 1} 图片生成失败: {str(e)}")
            # 使用占位图片
            scene.imageUrl = f"https://images.unsplash.com/photo-{1460925895917+index}?w=400&h=300&fit=crop"
            return None
    
    print(f"🚀 开始生成 {len(scenes)} 个场景的图片（统一风格: {unified_style or 'default'}，风格参考: {'启用' if use_style_reference else '禁用'}）...")
    
    if use_style_reference:
        # 策略：链式参考 — 每张图以上一张成功生成的图片作为风格参考
        # 这样相邻场景之间会自然过渡，避免风格突变
        prev_image: str = None
        for i, scene in enumerate(scenes):
            if i == 0:
                # 第一张图：如果有用户提供的风格参考图，使用它；否则直接生成
                prev_image = await generate_single_image(scene, i, user_style_reference)
            else:
                # 后续图片：使用上一张成功生成的图片作为风格参考
                result = await generate_single_image(scene, i, prev_image)
                if result:
                    prev_image = result  # 更新为最新成功的图片
    else:
        # 并行生成（不使用风格参考）
        import asyncio
        tasks = [generate_single_image(scene, i, None) for i, scene in enumerate(scenes)]
        await asyncio.gather(*tasks, return_exceptions=True)
    
    print(f"✨ 所有场景图片生成完成")


async def generate_scenes_from_prompt(prompt: str, video_style: str = "promo", style_keywords: list = None, generate_images: bool = True, style_reference_image: str = None, text_provider: str = None, image_provider: str = None, image_model: str = None, num_frames: int = None, scene_duration: int = 5) -> List[SceneContent]:
    """根据提示词生成场景"""
    # Build keywords context if provided
    keywords_context = ""
    if style_keywords and len(style_keywords) > 0:
        keywords_context = f"\n                        风格关键词：{', '.join(style_keywords)}"
    
    # Determined number of scenes
    target_frames = num_frames if num_frames else 6
    scene_count_prompt = f"{target_frames}个场景"
    
    system_message = f"""你是一个专业的视频内容创作专家。
                        根据用户的提示词和视频风格，生成{scene_count_prompt}，每个场景包含：
                        - timestamp: 时间戳（格式：0:00 - 0:05, 每个场景严格固定为{scene_duration}秒，不要自行调整时长）
                        - script: 场景脚本（包含旁白和视觉描述），必须用中文返回
                        - image: 图片详细信息对象

                        视频风格：{video_style}{keywords_context}
                    """

    user_prompt = f"""用户需求：{prompt}

                    请生成{scene_count_prompt}，以JSON数组格式返回，每个场景包含：   
                    {{
                        "timestamp": "时间戳",
                        "script": "脚本内容",
                        "image": {{
                            "description": "图片描述(用于AI生成图片)",
                            "tags": ["标签1", "标签2", "标签3"],
                            "mood": "情绪/氛围",
                            "color_scheme": "主要色调",
                            "composition": "构图说明",
                            "style": "视觉风格",
                            "subjects": ["主体对象1", "主体对象2"],
                            "scene_type": "场景类型"
                        }}
                    }}

                    只返回JSON数组，不要其他说明文字。
                """

    try:
        response = await ai_service.generate_completion(
            prompt=user_prompt,
            system_message=system_message,
            temperature=0.8,
            max_tokens=30000,
            provider=text_provider
        )

        # 解析JSON响应
        # 尝试从响应中提取JSON
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            scenes_data = json.loads(json_match.group())
        else:
            # 如果无法解析，返回默认场景
            scenes_data = []
            for i in range(target_frames):
                start_time = i * scene_duration
                end_time = (i + 1) * scene_duration
                scenes_data.append({
                    "timestamp": f"0:{start_time:02d} - 0:{end_time:02d}",
                    "script": f"场景 {i+1}：根据提示词生成的展示画面...",
                    "image": {
                        "description": f"Scene {i+1} visual description",
                        "tags": ["scene", "visual"],
                        "mood": "neutral",
                        "style": video_style
                    }
                })

        # 转换为SceneContent对象
        scenes = []
        for i, scene_data in enumerate(scenes_data):
            image_data = scene_data.get("image", {})

            # 构建 ImageMetadata
            from app.schemas.ai_schemas import ImageMetadata
            image_metadata = ImageMetadata(
                description=image_data.get("description", ""),
                tags=image_data.get("tags", []),
                mood=image_data.get("mood"),
                color_scheme=image_data.get("color_scheme"),
                composition=image_data.get("composition"),
                style=image_data.get("style"),
                subjects=image_data.get("subjects", []),
                scene_type=image_data.get("scene_type")
            )

            # 计算标准时间戳，强制覆盖LLM生成的时间
            start_seconds = i * scene_duration
            end_seconds = (i + 1) * scene_duration
            timestamp_str = f"0:{start_seconds:02d} - 0:{end_seconds:02d}"

            scenes.append(SceneContent(
                id=f"scene_{i+1}",
                timestamp=timestamp_str,
                script=scene_data.get("script", ""),
                imageUrl="",  # 临时为空，稍后通过图片生成填充
                imageDescription=image_data.get("description", ""),  # 保留兼容性
                imageMetadata=image_metadata,
                duration=scene_duration
            ))

        # 并行生成所有场景的图片（传递统一风格参数保持一致性）
        if scenes and generate_images:
            await generate_images_for_scenes(scenes, video_style, style_keywords, user_style_reference=style_reference_image, image_provider=image_provider, image_model=image_model)

        return scenes

    except Exception as e:
        print(f"生成场景失败: {str(e)}")
        # 返回默认场景
        from app.schemas.ai_schemas import ImageMetadata
        return [
            SceneContent(
                id="scene_1",
                timestamp="0:00 - 0:05",
                script=f"根据您的需求：{prompt}",
                imageUrl="https://images.unsplash.com/photo-1460925895917?w=400&h=300&fit=crop",
                imageDescription="Opening scene",
                imageMetadata=ImageMetadata(
                    description="Opening scene",
                    tags=["开场"],
                    mood="专业"
                ),
                duration=5
            )
        ]


async def generate_scenes_from_url(url: str, video_style: str = None, copy_style: str = None, style_keywords: list = None, generate_images: bool = True, style_reference_image: str = None, text_provider: str = None, image_provider: str = None, image_model: str = None, num_frames: int = None, scene_duration: int = 5) -> tuple[List[SceneContent], str | None]:
    """根据URL生成场景"""
    # 1. 提取网页内容
    web_content = await extract_url_content(url, text_provider=text_provider)
    try: 
        generated_copy = await ai_service.generate_copy(web_content['main_content'], copy_style, provider=text_provider)
        scenes = await generate_scenes_from_prompt(web_content['main_content'], video_style, style_keywords, generate_images, style_reference_image, text_provider=text_provider, image_provider=image_provider, image_model=image_model, num_frames=num_frames, scene_duration=scene_duration)
        return scenes, generated_copy
    except Exception as e:
        print(f"从URL生成场景失败: {str(e)}")
        raise


@router.post("/generate", response_model=GenerateContentResponse)
async def generate_content(request: GenerateContentRequest, current_user=Depends(get_current_user)):
    """生成AI内容"""
    try:
        scenes = []
        generated_copy = None

        if request.mode == "prompt":
            if not request.prompt:
                raise HTTPException(status_code=400, detail="Prompt is required for prompt mode")
            
            # Parse potential image_model from imageProvider
            image_provider_raw = request.imageProvider or "gemini"
            image_provider = image_provider_raw
            image_model = None
            if image_provider_raw.startswith("hf:") and ":" in image_provider_raw[3:]:
                parts = image_provider_raw[3:].split(":")
                image_provider = f"hf:{parts[0]}"
                if len(parts) > 1:
                    image_model = ":".join(parts[1:])

            scenes = await generate_scenes_from_prompt(
                request.prompt, 
                request.videoStyle or "promo", 
                request.styleKeywords, 
                request.generateImages, 
                request.styleReferenceImage, 
                text_provider=request.textProvider, 
                image_provider=image_provider, # Use parsed image_provider
                image_model=image_model,       # Use parsed image_model
                num_frames=request.numFrames,
                scene_duration=request.sceneDuration or 5
            )
            
            # 如果不生成图片，清空 imageUrl 以防前端显示占位符
            if not request.generateImages:
                for scene in scenes:
                    scene.imageUrl = ""

        elif request.mode == "url":
            if not request.url:
                raise HTTPException(status_code=400, detail="URL is required for url mode")
            
            # Parse potential image_model from imageProvider
            image_provider_raw = request.imageProvider or "gemini"
            image_provider = image_provider_raw
            image_model = None
            if image_provider_raw.startswith("hf:") and ":" in image_provider_raw[3:]:
                parts = image_provider_raw[3:].split(":")
                image_provider = f"hf:{parts[0]}"
                if len(parts) > 1:
                    image_model = ":".join(parts[1:])

            scenes, generated_copy = await generate_scenes_from_url(
                request.url, 
                request.videoStyle or "promo", 
                request.copyStyle, 
                request.styleKeywords, 
                request.generateImages, 
                request.styleReferenceImage, 
                text_provider=request.textProvider, 
                image_provider=image_provider, # Use parsed image_provider
                image_model=image_model,       # Use parsed image_model
                num_frames=request.numFrames, 
                scene_duration=request.sceneDuration or 5
            )
            
            # 如果不生成图片，清空 imageUrl
            if not request.generateImages:
                for scene in scenes:
                    scene.imageUrl = ""

        elif request.mode == "upload":
            if not request.uploadedAssets or len(request.uploadedAssets) == 0:
                raise HTTPException(status_code=400, detail="Uploaded assets are required for upload mode")

            # 提取图片素材进行识别
            image_assets = [a for a in request.uploadedAssets if a.get("type") == "image" and a.get("content")]
            
            if image_assets:
                # 使用第一张图片进行识别
                try:
                    from app.schemas.ai_schemas import ImageMetadata

                    image_content = image_assets[0]["content"]
                    # 使用详细分析方法
                    prompt = """请详细分析这张图片，并以JSON格式返回以下信息：
                                {
                                    "description": "图片的详细描述(50-100字)",
                                    "tags": ["标签1", "标签2", "标签3"],
                                    "mood": "情绪/氛围",
                                    "color_scheme": "主要色调",
                                    "composition": "构图特点",
                                    "subjects": ["主体对象1", "主体对象2"],
                                    "scene_type": "场景类型",
                                    "style": "视觉风格"
                                }

                                只返回JSON对象，不要其他说明文字。
                            """
                    image_analysis = await ai_service.analyze_image_detailed(prompt, image_content)

                    # Parse potential image_model from imageProvider
                    image_provider_raw = request.imageProvider or "gemini"
                    image_provider = image_provider_raw
                    image_model = None
                    if image_provider_raw.startswith("hf:") and ":" in image_provider_raw[3:]:
                        parts = image_provider_raw[3:].split(":")
                        image_provider = f"hf:{parts[0]}"
                        if len(parts) > 1:
                            image_model = ":".join(parts[1:])

                    scenes = await generate_scenes_from_prompt(
                        f"基于以下图片内容的描述生成视频：{basic_description}", 
                        "promo", 
                        None, 
                        request.generateImages, 
                        request.styleReferenceImage, 
                        text_provider=request.textProvider, 
                        image_provider=image_provider, # Use parsed image_provider
                        image_model=image_model,       # Use parsed image_model
                        num_frames=request.numFrames, 
                        scene_duration=request.sceneDuration or 5
                    )
                    
                    # 如果不生成图片，清空 imageUrl
                    if not request.generateImages:
                        for scene in scenes:
                            scene.imageUrl = ""
                    
                    # 生成文案 (如果需要)
                    if request.copyStyle:
                        try:
                            copy_content = image_analysis.get("description", basic_description)
                            generated_copy = await ai_service.generate_copy(copy_content, request.copyStyle, provider=request.textProvider)
                        except Exception as e:
                            print(f"文案生成失败: {str(e)}")

                    # 将第一个场景的图片元数据更新为实际分析结果
                    if scenes and len(scenes) > 0:
                        scenes[0].imageMetadata = ImageMetadata(
                            description=image_analysis.get("description", basic_description[:100]),
                            tags=image_analysis.get("tags", []),
                            mood=image_analysis.get("mood"),
                            color_scheme=image_analysis.get("color_scheme"),
                            composition=image_analysis.get("composition"),
                            style=image_analysis.get("style"),
                            subjects=image_analysis.get("subjects", []),
                            scene_type=image_analysis.get("scene_type")
                        )
                        scenes[0].imageDescription = image_analysis.get("description", basic_description[:100])

                except Exception as e:
                    print(f"图片识别失败: {str(e)}")
                    # 降级处理
                    from app.schemas.ai_schemas import ImageMetadata
                    scenes = [
                        SceneContent(
                            id="scene_1",
                            timestamp="0:00 - 0:10",
                            script="根据您上传的图片生成的视频内容",
                            imageUrl="https://images.unsplash.com/photo-1460925895917?w=400&h=300&fit=crop",
                            imageDescription="Scene from uploaded assets",
                            imageMetadata=ImageMetadata(
                                description="Scene from uploaded assets",
                                tags=["上传素材"]
                            ),
                            duration=10
                        )
                    ]
            else:
                # 没有图片 — 检查是否有视频分析文本
                if request.videoAnalysis:
                    # Parse potential image_model from imageProvider
                    image_provider_raw = request.imageProvider or "gemini"
                    image_provider = image_provider_raw
                    image_model = None
                    if image_provider_raw.startswith("hf:") and ":" in image_provider_raw[3:]:
                        parts = image_provider_raw[3:].split(":")
                        image_provider = f"hf:{parts[0]}"
                        if len(parts) > 1:
                            image_model = ":".join(parts[1:])

                    # 基于视频分析结果生成场景
                    print(f"📹 使用视频分析结果生成场景...")
                    user_req = f"\n\n附加要求：{request.prompt}" if request.prompt else ""
                    scenes = await generate_scenes_from_prompt(
                        f"基于以下视频内容分析生成视频分镜：\n{request.videoAnalysis}{user_req}",
                        request.videoStyle or "promo",
                        request.styleKeywords,
                        request.generateImages,
                        request.styleReferenceImage,
                        text_provider=request.textProvider,
                        image_provider=image_provider, # Use parsed image_provider
                        image_model=image_model,       # Use parsed image_model
                        num_frames=request.numFrames,
                        scene_duration=request.sceneDuration or 5
                    )
                    
                    if not request.generateImages:
                        for scene in scenes:
                            scene.imageUrl = ""
                else:
                    # 没有任何图片、视频分析或其他内容
                    from app.schemas.ai_schemas import ImageMetadata
                    scenes = [
                        SceneContent(
                            id="scene_1",
                            timestamp="0:00 - 0:10",
                            script="基于上传素材生成的场景",
                            imageUrl="https://images.unsplash.com/photo-1460925895917?w=400&h=300&fit=crop",
                            imageDescription="Generic scene",
                            imageMetadata=ImageMetadata(
                                description="Generic scene",
                                tags=["通用"]
                            ),
                            duration=10
                        )
                    ]

        return GenerateContentResponse(
            success=True,
            message="内容生成成功",
            scenes=scenes,
            copy=generated_copy
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"内容生成失败: {str(e)}"
        )


@router.post("/generate-cover", response_model=GenerateCoverResponse)
async def generate_cover(request: GenerateCoverRequest, current_user=Depends(get_current_user)):
    """生成AI封面"""
    try:
        provider = request.provider or "gemini"
        
        # Parse potential image_model from provider
        image_model = None
        if provider.startswith("hf:") and ":" in provider[3:]:
            parts = provider[3:].split(":")
            provider = f"hf:{parts[0]}"
            if len(parts) > 1:
                image_model = ":".join(parts[1:])

        # Parse provider format: "hf:alias" or plain name
        if provider.startswith("hf:"):
            # HuggingFace space specified, e.g. "hf:image_turbo"
            space_alias = provider[3:]
            
            # 解析分辨率
            width, height = 1024, 1024
            if request.resolution:
                try:
                    if 'x' in request.resolution.lower():
                        parts = request.resolution.lower().split('x')
                        if len(parts) == 2:
                            width = int(parts[0])
                            height = int(parts[1])
                    elif request.resolution.isdigit():
                        size = int(request.resolution)
                        width, height = size, size
                except:
                    print(f"分辨率解析失败: {request.resolution}, 使用默认值 1024x1024")
            
            final_prompt = get_image_prompt(intent=request.theme or "general", base_prompt=request.prompt)
            data = await ai_service.generate_image_huggingface(
                prompt=final_prompt,
                width=width,
                height=height,
                style=request.style,
                theme=request.theme,
                style_keywords=request.styleKeywords,
                negative_prompt=request.negativePrompt,
                style_weights=request.styleWeights,
                reference_image=request.referenceImage,
                denoising_strength=request.denoisingStrength or 0.7,
                preserve_composition=request.preserveComposition or False,
                image_model=image_model # Use parsed image_model
            )
        else:
            # Gemini or other providers
            final_prompt = get_image_prompt(intent=request.theme or "general", base_prompt=request.prompt)
            data = await ai_service.generate_image(
                prompt=final_prompt, 
                style=request.style,
                style_keywords=request.styleKeywords,
                negative_prompt=request.negativePrompt,
                theme=request.theme, 
                size=request.size,
                resolution=request.resolution,
                reference_image=request.referenceImage,
                denoising_strength=request.denoisingStrength or 0.7,
                preserve_composition=request.preserveComposition or False,
                style_weights=request.styleWeights,
                image_model=image_model # Use parsed image_model
            )
            
        return GenerateCoverResponse(
            success=True,
            message="封面生成成功",
            coverUrl=data
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"封面生成失败: {str(e)}"
        )


@router.post("/analyze-video", response_model=AnalyzeVideoResponse)
async def analyze_video(
    file: UploadFile = File(...),
    prompt: Optional[str] = Form(None),
    current_user=Depends(get_current_user)
):
    """分析视频内容 — 上传视频文件，使用AI分析内容并返回文本描述"""
    # Validate file type
    allowed_extensions = {"mp4", "mov", "avi", "webm", "mkv"}
    file_ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename else ""
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的视频格式: .{file_ext}，支持: {', '.join(allowed_extensions)}"
        )

    temp_path = None
    try:
        # Save uploaded file to temp location
        suffix = f".{file_ext}"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix, dir=os.path.join(".", "uploads")) as tmp:
            temp_path = tmp.name
            # Read in chunks to handle large files
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                tmp.write(chunk)

        print(f"📁 Video saved to temp: {temp_path} ({os.path.getsize(temp_path)} bytes)")

        # Delegate to provider via service
        analysis = await ai_service.analyze_video(file_path=temp_path, prompt=prompt)

        return AnalyzeVideoResponse(
            success=True,
            message="视频分析成功",
            analysis=analysis
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"视频分析失败: {str(e)}"
        )
    finally:
        # Clean up temp file
        if temp_path and os.path.exists(temp_path):
            try:
                os.unlink(temp_path)
                print(f"🗑️ Cleaned up temp file: {temp_path}")
            except Exception as cleanup_err:
                print(f"⚠️ Failed to clean up temp file: {cleanup_err}")

@router.post("/optimize-prompt", response_model=OptimizePromptResponse)
async def optimize_prompt(request: OptimizePromptRequest, current_user=Depends(get_current_user)):
    """优化图片生成提示词"""
    try:
        result = await ai_service.optimize_prompt(request.prompt)
        
        return OptimizePromptResponse(
            success=True,
            message="提示词优化成功",
            optimized=result.get("optimized", request.prompt),
            suggestions=result.get("suggestions", [])
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"提示词优化失败: {str(e)}"
        )


@router.post("/style-transfer", response_model=StyleTransferResponse)
async def style_transfer(request: StyleTransferRequest, current_user=Depends(get_current_user)):
    """风格迁移 - 将图片转换为艺术风格"""
    try:
        result = await ai_service.transfer_style(
            image_base64=request.image,
            art_style=request.artStyle,
            intensity=request.intensity,
            additional_prompt=request.prompt or ""
        )
        
        return StyleTransferResponse(
            success=True,
            message="风格迁移成功",
            imageUrl=result
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"风格迁移失败: {str(e)}"
        )


## 有问题
# @router.post("/generate-sticker", response_model=StickerResponse)
# async def generate_sticker(request: StickerRequest):
#     """生成贴纸 - 自动移除背景，生成透明PNG"""
#     try:
#         result = await openai_service.generate_sticker(
#             prompt=request.prompt,
#             style=request.style,
#             remove_background=request.removeBackground
#         )
        
#         return StickerResponse(
#             success=True,
#             message="贴纸生成成功",
#             imageUrl=result
#         )

#     except Exception as e:
#         raise HTTPException(
#             status_code=500,
#    #         detail=f"贴纸生成失败: {str(e)}"
#         )


@router.post("/sketch-to-image", response_model=SketchToImageResponse)
async def sketch_to_image(request: SketchToImageRequest, current_user=Depends(get_current_user)):
    """草图转图片 - 基于用户手绘草图生成精美图片"""
    try:
        result = await ai_service.sketch_to_image(
            sketch_base64=request.sketch,
            prompt=request.prompt,
            style=request.style
        )
        
        return SketchToImageResponse(
            success=True,
            message="草图转换成功",
            imageUrl=result
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"草图转换失败: {str(e)}"
        )


@router.post("/face-portrait", response_model=FacePortraitResponse)
async def face_portrait(request: FacePortraitRequest, current_user=Depends(get_current_user)):
    """AI写真生成 - 基于人脸照片生成特定场景下的写真"""
    try:
        result = await ai_service.face_portrait(
            face_image_base64=request.faceImage,
            scene_prompt=request.scenePrompt,
            style=request.style,
            preserve_face=request.preserveFace
        )
        
        return FacePortraitResponse(
            success=True,
            message="AI写真生成成功",
            imageUrl=result
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI写真生成失败: {str(e)}"
        )


@router.post("/face-swap", response_model=FaceSwapResponse)
async def face_swap(request: FaceSwapRequest, current_user=Depends(get_current_user)):
    """人脸融合 - 将人脸融合到目标图片中"""
    try:
        result = await ai_service.face_swap(
            face_image_base64=request.faceImage,
            target_image_base64=request.targetImage,
            blend_strength=request.blendStrength
        )
        
        return FaceSwapResponse(
            success=True,
            message="人脸融合成功",
            imageUrl=result
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"人脸融合失败: {str(e)}"
        )


@router.post("/generate-music", response_model=GenerateMusicResponse)
async def generate_music(request: GenerateMusicRequest, current_user=Depends(get_current_user)):
    """音乐生成"""
    try:
        provider = request.provider or "hf:music_gen"
        
        result_path = await ai_service.generate_music(
            prompt=request.prompt,
            duration=request.duration,
            provider=provider
        )
        
        return GenerateMusicResponse(
            success=True,
            message="音乐生成成功",
            audioUrl=result_path
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"音乐生成失败: {str(e)}"
        )


@router.post("/recommend-music", response_model=RecommendMusicResponse)
async def recommend_music(request: RecommendMusicRequest, current_user=Depends(get_current_user)):
    """BGM智能推荐 - 根据视频分镜内容推荐合适的背景音乐风格"""
    try:
        scenes_data = [
            {"script": s.script, "mood": s.mood, "tags": s.tags}
            for s in request.scenes
        ]
        raw = await ai_service.recommend_music_tags(
            scenes=scenes_data,
            provider=request.textProvider,
        )

        recommendations = []
        for item in raw:
            recommendations.append(MusicRecommendation(
                genre=item.get("genre", "Unknown"),
                mood=item.get("mood", "Neutral"),
                instruments=item.get("instruments", []),
                bpmRange=item.get("bpmRange", "100-120"),
                prompt=item.get("prompt", ""),
                reason=item.get("reason", ""),
            ))

        return RecommendMusicResponse(
            success=True,
            message="BGM推荐成功",
            recommendations=recommendations,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"BGM推荐失败: {str(e)}"
        )


@router.post("/speech", response_model=SpeechResponse)
async def generate_speech(request: SpeechRequest, current_user=Depends(get_current_user)):
    """语音生成 - 文字转语音"""
    try:
        generated_audio_path = await ai_service.generate_speech(
            text=request.text,
            voice_description=request.voiceDescription,
            language=request.language,
            provider=request.provider,
            reference_audio=request.referenceAudio,
            reference_text=request.referenceText,
        )
        
        return SpeechResponse(
            success=True,
            message="语音生成成功",
            audioUrl=generated_audio_path
        )

    except Exception as e:
        print(f"ERROR: generate_speech failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"语音生成失败: {str(e)}"
        )


@router.post("/remove-background", response_model=BackgroundRemovalResponse)
async def remove_background(request: BackgroundRemovalRequest, current_user=Depends(get_current_user)):
    """智能抠图 - 自动移除背景，生成透明PNG"""
    try:
        result = await ai_service.remove_background(
            image_base64=request.image,
            subject=request.subject,
            refine_edges=request.refineEdges
        )
        
        return BackgroundRemovalResponse(
            success=True,
            message="背景移除成功",
            imageUrl=result
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"背景移除失败: {str(e)}"
        )


@router.post("/replace-background", response_model=BackgroundReplacementResponse)
async def replace_background(request: BackgroundReplacementRequest, current_user=Depends(get_current_user)):
    """背景替换 - 移除原背景，合成新的AI生成背景"""
    try:
        result = await ai_service.replace_background(
            image_base64=request.image,
            background_scene=request.backgroundScene,
            custom_prompt=request.customPrompt,
            background_color=request.backgroundColor or "#FFFFFF",
            match_lighting=request.matchLighting,
            add_depth=request.addDepth
        )
        
        return BackgroundReplacementResponse(
            success=True,
            message="背景替换成功",
            imageUrl=result
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"背景替换失败: {str(e)}"
        )


@router.post("/generate-storyboard", response_model=StoryboardResponse)
async def generate_storyboard(request: StoryboardRequest, current_user=Depends(get_current_user)):
    """生成故事板 - 根据故事生成连续分镜"""
    try:
        frames = await ai_service.generate_storyboard(
            story_prompt=request.storyPrompt,
            character_image=request.characterImage,
            num_frames=request.numFrames,
            style=request.style,
            shot_types=request.shotTypes
        )
        
        return StoryboardResponse(
            success=True,
            message=f"故事板生成成功，共{len(frames)}个分镜",
            frames=frames
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"故事板生成失败: {str(e)}"
        )


@router.post("/generate-image-hf", response_model=HuggingFaceImageResponse)
async def generate_image_huggingface(request: HuggingFaceImageRequest, current_user=Depends(get_current_user)):
    """使用 Hugging Face Turbo 模型生成图片
    
    这个端点使用 Hugging Face 的 Z-Image-Turbo 模型，提供快速的图片生成能力。
    适合需要快速生成图片原型的场景。
    """
    try:
        provider = request.provider or "hf:image_turbo" # Default to a specific HF model if not provided
        image_model = None
        if provider.startswith("hf:") and ":" in provider[3:]:
            parts = provider[3:].split(":")
            provider = f"hf:{parts[0]}"
            if len(parts) > 1:
                image_model = ":".join(parts[1:])

        result = await ai_service.generate_image_huggingface(
            prompt=request.prompt,
            height=request.height,
            width=request.width,
            seed=request.seed,
            randomize_seed=request.randomizeSeed,
            image_model=image_model # Use parsed image_model
        )
        return HuggingFaceImageResponse(
            success=True,
            message="图片生成成功",
            imageUrl=result
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Hugging Face 图片生成失败: {str(e)}"
        )


@router.post("/generate-video-hf", response_model=HuggingFaceVideoResponse)
async def generate_video_huggingface(request: HuggingFaceVideoRequest, current_user=Depends(get_current_user)):
    """使用 Hugging Face 模型生成视频
    
    这个端点使用 Hugging Face 的 Dream-wan2-2-faster-Pro 模型，
    从静态图片生成动态视频内容。
    """
    try:
        result = await ai_service.generate_video_huggingface(
            input_image=request.inputImage,
            prompt=request.prompt,
            steps=request.steps,
            negative_prompt=request.negativePrompt,
            duration_seconds=request.durationSeconds,
            guidance_scale=request.guidanceScale,
            guidance_scale_2=request.guidanceScale2,
            seed=request.seed,
            randomize_seed=request.randomizeSeed
        )
        
        return HuggingFaceVideoResponse(
            success=True,
            message="视频生成成功",
            videoUrl=result
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Hugging Face 视频生成失败: {str(e)}"
        )


@router.post("/generate-video-image-audio", response_model=ImageAudioToVideoResponse)
async def generate_video_image_audio(request: ImageAudioToVideoRequest, current_user=Depends(get_current_user)):
    """使用 Hugging Face 图片音频生成视频
    
    这个端点使用 Hugging Face 的 image_audio_to_video 模型，
    从首帧图片（可选尾帧）和音频生成视频内容。
    支持相机运动 LoRA 预设和多种生成模式。
    """
    try:
        result = await ai_service.generate_video_image_audio(
            first_frame=request.firstFrame,
            end_frame=request.endFrame,
            prompt=request.prompt,
            duration=request.duration,
            input_video=request.inputVideo,
            generation_mode=request.generationMode,
            enhance_prompt=request.enhancePrompt,
            seed=request.seed,
            randomize_seed=request.randomizeSeed,
            height=request.height,
            width=request.width,
            camera_lora=request.cameraLora,
            audio_path=request.audioPath,
            video_provider=request.videoProvider,
        )
        
        return ImageAudioToVideoResponse(
            success=True,
            message="视频生成成功",
            videoUrl=result
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Hugging Face 图片音频转视频生成失败: {str(e)}"
        )


@router.post("/analyze-transition", response_model=AnalyzeTransitionResponse)
async def analyze_transition(request: AnalyzeTransitionRequest, current_user=Depends(get_current_user)):
    """分析首尾帧图片，生成视频转场提示词
    
    使用视觉 AI 分析两张图片之间的差异，
    生成适合用于视频生成的转场/运动描述提示词。
    """
    try:
        transition_prompt = await ai_service.analyze_transition(
            first_frame=request.firstFrame,
            end_frame=request.endFrame,
        )
        
        return AnalyzeTransitionResponse(
            success=True,
            message="转场分析成功",
            transitionPrompt=transition_prompt
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"转场分析失败: {str(e)}"
        )


@router.post("/concatenate-videos", response_model=ConcatenateVideosResponse)
async def concatenate_videos(request: ConcatenateVideosRequest, current_user=Depends(get_current_user)):
    """拼接多个视频为一个长视频
    
    使用 ffmpeg concat 协议将多个视频文件拼接为一个完整视频。
    """
    import subprocess
    import tempfile
    import os
    
    try:
        video_paths = request.videoPaths
        
        if not video_paths or len(video_paths) == 0:
            raise HTTPException(status_code=400, detail="视频路径列表不能为空")
        
        valid_paths = []
        import httpx
        from urllib.parse import urlparse
        
        # 预处理：将URL转换为本地路径
        for vpath in video_paths:
            if not vpath or not vpath.strip():
                continue
                
            local_path = vpath
            
            # 1. 尝试直接作为本地路径
            if os.path.exists(local_path):
                valid_paths.append(local_path)
                continue
                
            # 2. 处理 /static/ 路径 (映射到本地 static 目录)
            if "/static/" in vpath:
                try:
                    # 提取 /static/ 之后的部分
                    rel_path = vpath.split("/static/")[1]
                    # 假设运行目录在 backend 根目录
                    potential_path = os.path.join(os.getcwd(), "static", rel_path)
                    if os.path.exists(potential_path):
                        valid_paths.append(potential_path)
                        continue
                except Exception:
                    pass
            
            # 3. 处理 HTTP/HTTPS URL (下载到临时文件)
            if vpath.startswith("http://") or vpath.startswith("https://"):
                try:
                    print(f"📥 正在下载远程视频: {vpath}")
                    async with httpx.AsyncClient() as client:
                        response = await client.get(vpath, timeout=30.0, follow_redirects=True)
                        if response.status_code == 200:
                            # 创建临时文件
                            temp_video = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir=output_dir)
                            temp_video.write(response.content)
                            temp_video.close()
                            valid_paths.append(temp_video.name)
                            print(f"✅ 视频下载完成: {temp_video.name}")
                            continue
                except Exception as e:
                    print(f"⚠️ 下载视频失败 {vpath}: {e}")
            
            print(f"⚠️ 找不到有效视频路径: {vpath}")

        if len(valid_paths) == 0:
            raise HTTPException(status_code=400, detail="没有有效的视频可以拼接")
        
        # 如果只有一个视频，直接返回
        if len(valid_paths) == 1:
            return ConcatenateVideosResponse(
                success=True,
                message="只有一个视频，无需拼接",
                videoUrl=valid_paths[0]
            )
        
        print(f"🎬 开始拼接 {len(valid_paths)} 个视频...")
        
        # 创建输出目录
        output_dir = os.path.join(tempfile.gettempdir(), "video_concat")
        os.makedirs(output_dir, exist_ok=True)
        
        # 第一步：将所有视频重新编码为统一格式，确保拼接兼容
        normalized_paths = []
        for i, vpath in enumerate(valid_paths):
            if not os.path.exists(vpath):
                print(f"⚠️ 视频文件不存在，跳过: {vpath}")
                continue
            
            normalized_path = os.path.join(output_dir, f"norm_{i}.mp4")
            normalize_cmd = [
                "ffmpeg", "-y", "-i", vpath,
                "-c:v", "libx264", "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",  # 重新编码音频以确保兼容性
                "-r", "24",  # 统一帧率
                "-vf", "scale=768:512:force_original_aspect_ratio=decrease,pad=768:512:(ow-iw)/2:(oh-ih)/2",
                "-pix_fmt", "yuv420p",
                normalized_path
            ]
            
            print(f"📐 正在标准化视频 {i+1}/{len(valid_paths)}...")
            result = subprocess.run(normalize_cmd, capture_output=True, text=True, timeout=120)
            if result.returncode != 0:
                print(f"⚠️ 视频标准化失败: {result.stderr}")
                continue
            
            normalized_paths.append(normalized_path)
        
        if len(normalized_paths) == 0:
            raise HTTPException(status_code=500, detail="没有有效的视频可以拼接")
        
        if len(normalized_paths) == 1:
            return ConcatenateVideosResponse(
                success=True,
                message="只有一个有效视频",
                videoUrl=normalized_paths[0]
            )
        
        # 第二步：创建 ffmpeg concat 文件列表
        concat_list_path = os.path.join(output_dir, "concat_list.txt")
        with open(concat_list_path, "w") as f:
            for npath in normalized_paths:
                f.write(f"file '{npath}'\n")
        
        # 第三步：执行拼接
        import uuid
        output_filename = f"combined_{uuid.uuid4().hex[:8]}.mp4"
        output_path = os.path.join(output_dir, output_filename)
        
        concat_cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_list_path,
            "-c", "copy",
            output_path
        ]
        
        print(f"🔗 正在拼接视频...")
        result = subprocess.run(concat_cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            print(f"❌ 视频拼接失败: {result.stderr}")
            raise Exception(f"ffmpeg 拼接失败: {result.stderr}")
        
        # 清理临时标准化文件
        for npath in normalized_paths:
            try:
                os.remove(npath)
            except:
                pass
        try:
            os.remove(concat_list_path)
        except:
            pass
        
        # Move to static directory for access
        import shutil
        
        static_dir = os.path.join(os.getcwd(), "static", "videos")
        os.makedirs(static_dir, exist_ok=True)
        
        final_filename = f"concat_{uuid.uuid4().hex[:8]}.mp4"
        final_path = os.path.join(static_dir, final_filename)
        
        shutil.move(output_path, final_path)
        
        # Construct URL (assuming default local dev setup, ideally from config)
        # In production this host should be dynamic
        final_url = f"http://127.0.0.1:1111/static/videos/{final_filename}"
        
        print(f"✅ 视频拼接成功: {final_path} -> {final_url}")
        
        return ConcatenateVideosResponse(
            success=True,
            message=f"成功拼接 {len(normalized_paths)} 个视频",
            videoUrl=final_url
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 视频拼接失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"视频拼接失败: {str(e)}"
        )


# Script Creation Routes

@router.post("/enhance-script", response_model=EnhanceScriptResponse)
async def enhance_script(request: EnhanceScriptRequest, current_user=Depends(get_current_user)):
    """润色或根据主题生成完整剧本"""
    try:
        system_message = "你是一个专业的短视频编剧和导演。请根据用户提供的草稿或主题，创作一个专业、引人入胜的视频剧本。剧本应该包含场景描述、旁白/台词以及画面视觉提示，语言生动形象，适合短视频呈现。直接输出剧本内容，无需多余解释。"
        
        script = await ai_service.generate_completion(
            prompt=request.prompt,
            system_message=system_message,
            temperature=0.7,
            max_tokens=4000,
            provider=request.provider
        )
        return EnhanceScriptResponse(
            success=True,
            message="剧本生成成功",
            script=script
        )
    except Exception as e:
        print(f"❌ 剧本生成失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"剧本生成失败: {str(e)}"
        )


@router.post("/deconstruct-script", response_model=DeconstructScriptResponse)
async def deconstruct_script(request: DeconstructScriptRequest, current_user=Depends(get_current_user)):
    """将完整剧本拆解为角色列表和镜头分镜"""
    try:
        system_message = """你是一个专业的视频分镜师，兼具角色设定分析能力。
你需要将用户提供的剧本精确进行两项工作：
1. 提取出所有出现的核心角色设定（名字及详细的外貌、背景、性格描述）。
2. 将剧本拆解为具体的镜头分镜（Shot）。

返回结果必须是一个JSON对象，包含两个键：
- characters: 角色数组。每个元素包含：
  - name: 字符串，角色名称
  - description: 字符串，角色的详细背景信息、性格特点、外貌描写
- shots: 分镜数组。每个元素包含：
  - shotNumber: 整数，序号
  - scene: 场景描述（如：咖啡厅内，白天）
  - character: 人物动态/外貌（如：女主端着咖啡走到窗前）
  - props: 道具及特效（如：咖啡杯上升起热气）
  - dialogue: 旁白/台词/音乐指示（如：女主OS：又是无聊的一天...）

请仅返回合法的JSON对象（Dict，包含 characters 和 shots 两个 key），不包含任何Markdown包装（如无需 ```json 等）。"""
        
        prompt = f"请拆解以下剧本：\n\n{request.script}"
        
        response_text = await ai_service.generate_completion(
            prompt=prompt,
            system_message=system_message,
            temperature=0.5,
            max_tokens=8000,
            provider=request.provider
        )
        
        import re
        import json
        from app.schemas.ai_schemas import ScriptCharacter
        
        # 解析返回的JSON
        cleaned_content = response_text.strip()
        json_match = re.search(r'\{.*\}', cleaned_content, re.DOTALL)
        if json_match:
            cleaned_content = json_match.group()
            
        try:
            result_data = json.loads(cleaned_content)
        except json.JSONDecodeError:
            print(f"JSON解析失败，原始返回: {response_text}")
            raise Exception("AI返回格式不正确，无法解析为JSON对象")
            
        # Extract Characters
        characters = []
        chars_data = result_data.get("characters", [])
        for item in chars_data:
            characters.append(ScriptCharacter(
                name=item.get("name", "Unknown"),
                description=item.get("description", ""),
                imageUrl=""
            ))
            
        # Extract Shots
        shots_data = result_data.get("shots", [])
        if not shots_data and isinstance(result_data, list):
            # Fallback if the AI incorrectly just returned the array of shots anyway
            shots_data = result_data

        shots = []
        for index, item in enumerate(shots_data):
            shots.append(ScriptShot(
                shotNumber=item.get("shotNumber", index + 1),
                scene=item.get("scene", ""),
                character=item.get("character", ""),
                props=item.get("props", ""),
                dialogue=item.get("dialogue", "")
            ))
            
        return DeconstructScriptResponse(
            success=True,
            message="剧本拆解成功",
            characters=characters,
            shots=shots
        )
    except Exception as e:
        print(f"❌ 剧本拆解失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"剧本拆解失败: {str(e)}"
        )
