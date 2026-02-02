from fastapi import APIRouter, HTTPException
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
    SceneContent
)
from app.services.ai_service import openai_service
from typing import List
import json
import re

router = APIRouter()


async def extract_url_content(url: str) -> dict:
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
            result = await openai_service.analyze_image_detailed(prompt, screenshot_base64)
            
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
            content = await openai_service.generate_completion_gemini_format(
                prompt=prompt,
                system_message="你是一个专业的网页内容提取助手。",
                temperature=0.3,
                max_tokens=4096
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


async def generate_scenes_from_prompt(prompt: str, video_style: str = "promo", style_keywords: list = None) -> List[SceneContent]:
    """根据提示词生成场景"""
    # Build keywords context if provided
    keywords_context = ""
    if style_keywords and len(style_keywords) > 0:
        keywords_context = f"\n                        风格关键词：{', '.join(style_keywords)}"
    
    system_message = f"""你是一个专业的视频内容创作专家。
                        根据用户的提示词和视频风格，生成6-8个场景，每个场景包含：
                        - timestamp: 时间戳（格式：0:00 - 0:05）
                        - script: 场景脚本（包含旁白和视觉描述），必须用中文返回
                        - image: 图片详细信息对象

                        视频风格：{video_style}{keywords_context}
                    """

    user_prompt = f"""用户需求：{prompt}

                    请生成6个场景，以JSON数组格式返回，每个场景包含：   
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
        response = await openai_service.generate_completion_gemini_format(
            prompt=user_prompt,
            system_message=system_message,
            temperature=0.8,
            max_tokens=30000
        )

        # 解析JSON响应
        # 尝试从响应中提取JSON
        json_match = re.search(r'\[.*\]', response, re.DOTALL)
        if json_match:
            scenes_data = json.loads(json_match.group())
        else:
            # 如果无法解析，返回默认场景
            scenes_data = [
                {
                    "timestamp": "0:00 - 0:05",
                    "script": f"开场：{prompt[:50]}...",
                    "image": {
                        "description": "Dynamic opening scene",
                        "tags": ["开场", "动态"],
                        "mood": "激动",
                        "style": video_style
                    }
                },
                {
                    "timestamp": "0:05 - 0:15",
                    "script": "主要内容展示",
                    "image": {
                        "description": "Main content showcase",
                        "tags": ["主要内容", "展示"],
                        "mood": "专业",
                        "style": video_style
                    }
                },
                {
                    "timestamp": "0:15 - 0:25",
                    "script": "详细特性介绍",
                    "image": {
                        "description": "Feature details",
                        "tags": ["特性", "细节"],
                        "mood": "信息性",
                        "style": video_style
                    }
                },
                {
                    "timestamp": "0:25 - 0:30",
                    "script": "结尾与号召",
                    "image": {
                        "description": "Call to action",
                        "tags": ["结尾", "号召"],
                        "mood": "鼓励",
                        "style": video_style
                    }
                }
            ]

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

            scenes.append(SceneContent(
                id=f"scene_{i+1}",
                timestamp=scene_data.get("timestamp", f"0:{i*5:02d} - 0:{(i+1)*5:02d}"),
                script=scene_data.get("script", ""),
                imageUrl=f"https://images.unsplash.com/photo-{1460925895917+i}?w=400&h=300&fit=crop",
                imageDescription=image_data.get("description", ""),  # 保留兼容性
                imageMetadata=image_metadata
            ))

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
                )
            )
        ]


async def generate_scenes_from_url(url: str, video_style: str = None, copy_style: str = None, style_keywords: list = None) -> tuple[List[SceneContent], str | None]:
    """根据URL生成场景"""
    # 1. 提取网页内容
    web_content = await extract_url_content(url)
    try: 
        generated_copy = await openai_service.generate_copy(web_content['main_content'], copy_style)
        scenes = await generate_scenes_from_prompt(web_content['main_content'], video_style, style_keywords)
        return scenes, generated_copy
    except Exception as e:
        print(f"从URL生成场景失败: {str(e)}")
        raise
    # # 2. 生成文案 (如果需要)
    # if copy_style:
    #     content_text = f"{web_content['title']}\n{web_content['description']}\n{web_content['main_content']}"
    #     try:
    #         generated_copy = await openai_service.generate_copy(content_text, copy_style)
    #     except Exception as e:
    #         print(f"文案生成失败: {str(e)}")
    
    # # 3. 使用AI分析网页内容并生成场景
    # system_message = f"""你是一个专业的视频内容创作专家。
    #                     根据用户的提示词和视频风格，生成6-8个场景，每个场景包含：
    #                     - timestamp: 时间戳（格式：0:00 - 0:05）
    #                     - script: 场景脚本（包含旁白和视觉描述），必须用中文返回
    #                     - image: 图片详细信息对象

    #                     视频风格：{video_style}
    #                 """

    # user_prompt = f"""网页内容：
    #                 标题：{web_content['title']}
    #                 描述：{web_content['description']}
    #                 关键词：{', '.join(web_content['keywords'])}
    #                 主要内容：{web_content['main_content']}

    #                 请生成6个场景，以JSON数组格式返回，每个场景包含：   
    #                 {{
    #                     "timestamp": "时间戳",
    #                     "script": "脚本内容",
    #                     "image": {{
    #                         "description": "图片描述(用于AI生成图片)",
    #                         "tags": ["标签1", "标签2", "标签3"],
    #                         "mood": "情绪/氛围",
    #                         "color_scheme": "主要色调",
    #                         "composition": "构图说明",
    #                         "style": "视觉风格",
    #                         "subjects": ["主体对象1", "主体对象2"],
    #                         "scene_type": "场景类型"
    #                     }}
    #                 }}

    #                 只返回JSON数组，不要其他说明文字。
    #                 """
    # try:
    #     response = await openai_service.generate_completion_gemini_format(
    #         prompt=user_prompt,
    #         system_message=system_message,
    #         temperature=0.7,
    #         max_tokens=5000
    #     )

    #     # 简化处理，返回模拟场景
    #     scenes = [
    #         SceneContent(
    #             id="scene_1",
    #             timestamp="0:00 - 0:03",
    #             script=f"介绍网站：{web_content['title']}",
    #             imageUrl="https://images.unsplash.com/photo-1460925895917?w=400&h=300&fit=crop",
    #             imageDescription="Website hero section"
    #         ),
    #         SceneContent(
    #             id="scene_2",
    #             timestamp="0:03 - 0:10",
    #             script=web_content['description'],
    #             imageUrl="https://images.unsplash.com/photo-1551288049?w=400&h=300&fit=crop",
    #             imageDescription="Main features"
    #         ),
    #         SceneContent(
    #             id="scene_3",
    #             timestamp="0:10 - 0:20",
    #             script="详细特性展示",
    #             imageUrl="https://images.unsplash.com/photo-1553877522?w=400&h=300&fit=crop",
    #             imageDescription="Feature details"
    #         ),
    #         SceneContent(
    #             id="scene_4",
    #             timestamp="0:20 - 0:30",
    #             script="访问网站了解更多",
    #             imageUrl="https://images.unsplash.com/photo-1559028012?w=400&h=300&fit=crop",
    #             imageDescription="Call to action"
    #         )
    #     ]

    #     return scenes, generated_copy

    except Exception as e:
        print(f"从URL生成场景失败: {str(e)}")
        raise


@router.post("/generate", response_model=GenerateContentResponse)
async def generate_content(request: GenerateContentRequest):
    """生成AI内容"""
    try:
        scenes = []
        generated_copy = None

        if request.mode == "prompt":
            if not request.prompt:
                raise HTTPException(status_code=400, detail="Prompt is required for prompt mode")
            scenes = await generate_scenes_from_prompt(request.prompt, request.videoStyle or "promo", request.styleKeywords)

        elif request.mode == "url":
            if not request.url:
                raise HTTPException(status_code=400, detail="URL is required for url mode")
            scenes, generated_copy = await generate_scenes_from_url(request.url, request.videoStyle or "promo", request.copyStyle, request.styleKeywords)

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
                    image_analysis = await openai_service.analyze_image_detailed(prompt, image_content)

                    # 基于图片识别结果生成场景
                    basic_description = await openai_service.analyze_image(image_content)
                    scenes = await generate_scenes_from_prompt(f"基于以下图片内容的描述生成视频：{basic_description}")
                    
                    # 生成文案 (如果需要)
                    if request.copyStyle:
                        try:
                            copy_content = image_analysis.get("description", basic_description)
                            generated_copy = await openai_service.generate_copy(copy_content, request.copyStyle)
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
                            )
                        )
                    ]
            else:
                # 没有任何图片或图片内容
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
                        )
                    )
                ]

        return GenerateContentResponse(
            success=True,
            message="内容生成成功",
            scenes=scenes,
            copy=generated_copy
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"内容生成失败: {str(e)}"
        )


@router.post("/generate-cover", response_model=GenerateCoverResponse)
async def generate_cover(request: GenerateCoverRequest):
    """生成AI封面"""
    try:
        # Phase 2: 支持高级参数
        data = await openai_service.generate_image_gemini_format(
            prompt=request.prompt, 
            style=request.style,
            style_keywords=request.styleKeywords,
            negative_prompt=request.negativePrompt,
            theme=request.theme, 
            size=request.size,
            resolution=request.resolution,
            # Phase 2 新增参数
            reference_image=request.referenceImage,
            denoising_strength=request.denoisingStrength or 0.7,
            preserve_composition=request.preserveComposition or False,
            style_weights=request.styleWeights
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


@router.post("/optimize-prompt", response_model=OptimizePromptResponse)
async def optimize_prompt(request: OptimizePromptRequest):
    """优化图片生成提示词"""
    try:
        result = await openai_service.optimize_prompt(request.prompt)
        
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
async def style_transfer(request: StyleTransferRequest):
    """风格迁移 - 将图片转换为艺术风格"""
    try:
        result = await openai_service.transfer_style(
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
async def sketch_to_image(request: SketchToImageRequest):
    """草图转图片 - 基于用户手绘草图生成精美图片"""
    try:
        result = await openai_service.sketch_to_image(
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
async def face_portrait(request: FacePortraitRequest):
    """AI写真生成 - 基于人脸照片生成特定场景下的写真"""
    try:
        result = await openai_service.face_portrait(
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
async def face_swap(request: FaceSwapRequest):
    """人脸融合 - 将人脸融合到目标图片中"""
    try:
        result = await openai_service.face_swap(
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
