from fastapi import APIRouter, HTTPException
from app.schemas.ai_schemas import (
    GenerateContentRequest,
    GenerateContentResponse,
    GenerateCoverRequest,
    GenerateCoverResponse,
    SceneContent
)
from app.services.ai_service import openai_service
from typing import List
import json
import re

router = APIRouter()


async def extract_url_content(url: str) -> dict:
    """从URL提取内容（模拟爬虫功能）"""
    # TODO: 实现真实的网页爬虫功能
    # 目前返回模拟数据
    return {
        "title": "Example Website",
        "description": "A sample website for demonstration",
        "keywords": ["product", "service", "technology"],
        "main_content": "This is the main content of the website..."
    }


async def generate_scenes_from_prompt(prompt: str, video_style: str = "promo") -> List[SceneContent]:
    """根据提示词生成场景"""
    system_message = f"""你是一个专业的视频内容创作专家。
根据用户的提示词和视频风格，生成4-6个场景，每个场景包含：
- timestamp: 时间戳（格式：0:00 - 0:05）
- script: 场景脚本（包含旁白和视觉描述）
- image: 图片详细信息对象

视频风格：{video_style}
"""

    user_prompt = f"""用户需求：{prompt}

请生成4个场景，以JSON数组格式返回，每个场景包含：
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
        response = await openai_service.generate_completion(
            prompt=user_prompt,
            system_message=system_message,
            temperature=0.8,
            max_tokens=2000
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


async def generate_scenes_from_url(url: str) -> List[SceneContent]:
    """根据URL生成场景"""
    # 1. 提取网页内容
    web_content = await extract_url_content(url)

    # 2. 使用AI分析网页内容并生成场景
    system_message = """你是一个专业的视频内容创作专家。
根据网页内容，生成4-6个视频场景。"""

    user_prompt = f"""网页内容：
标题：{web_content['title']}
描述：{web_content['description']}
关键词：{', '.join(web_content['keywords'])}
主要内容：{web_content['main_content']}

请生成4个场景，以JSON数组格式返回。
"""

    try:
        response = await openai_service.generate_completion(
            prompt=user_prompt,
            system_message=system_message,
            temperature=0.7,
            max_tokens=1500
        )

        # 简化处理，返回模拟场景
        scenes = [
            SceneContent(
                id="scene_1",
                timestamp="0:00 - 0:03",
                script=f"介绍网站：{web_content['title']}",
                imageUrl="https://images.unsplash.com/photo-1460925895917?w=400&h=300&fit=crop",
                imageDescription="Website hero section"
            ),
            SceneContent(
                id="scene_2",
                timestamp="0:03 - 0:10",
                script=web_content['description'],
                imageUrl="https://images.unsplash.com/photo-1551288049?w=400&h=300&fit=crop",
                imageDescription="Main features"
            ),
            SceneContent(
                id="scene_3",
                timestamp="0:10 - 0:20",
                script="详细特性展示",
                imageUrl="https://images.unsplash.com/photo-1553877522?w=400&h=300&fit=crop",
                imageDescription="Feature details"
            ),
            SceneContent(
                id="scene_4",
                timestamp="0:20 - 0:30",
                script="访问网站了解更多",
                imageUrl="https://images.unsplash.com/photo-1559028012?w=400&h=300&fit=crop",
                imageDescription="Call to action"
            )
        ]

        return scenes

    except Exception as e:
        print(f"从URL生成场景失败: {str(e)}")
        raise


@router.post("/generate", response_model=GenerateContentResponse)
async def generate_content(request: GenerateContentRequest):
    """生成AI内容"""
    try:
        scenes = []

        if request.mode == "prompt":
            if not request.prompt:
                raise HTTPException(status_code=400, detail="Prompt is required for prompt mode")
            scenes = await generate_scenes_from_prompt(request.prompt, request.videoStyle or "promo")

        elif request.mode == "url":
            if not request.url:
                raise HTTPException(status_code=400, detail="URL is required for url mode")
            scenes = await generate_scenes_from_url(request.url)

        elif request.mode == "upload":
            if not request.uploadedAssets or len(request.uploadedAssets) == 0:
                raise HTTPException(status_code=400, detail="Uploaded assets are required for upload mode")

            # 提取图片素材进行识别
            image_assets = [a for a in request.uploadedAssets if a.get("type") == "image" and a.get("content")]
            print(request.uploadedAssets)
            if image_assets:
                # 使用第一张图片进行识别
                try:
                    from app.schemas.ai_schemas import ImageMetadata

                    image_content = image_assets[0]["content"]
                    # 使用详细分析方法
                    image_analysis = await openai_service.analyze_image_detailed(image_content)

                    # 基于图片识别结果生成场景
                    basic_description = await openai_service.analyze_image(image_content)
                    scenes = await generate_scenes_from_prompt(f"基于以下图片内容的描述生成视频：{basic_description}")

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
            scenes=scenes
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
        # TODO: 实现真实的AI图片生成
        cover_url = await openai_service.generate_image(prompt=request.prompt, style=request.style, size=request.size)
        return GenerateCoverResponse(
            success=True,
            message="封面生成成功",
            coverUrl=cover_url[0]['image_url']['url']
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"封面生成失败: {str(e)}"
        )
