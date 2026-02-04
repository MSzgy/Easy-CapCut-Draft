import httpx
import json
import base64
import io
from typing import Optional, Dict, Any
# from PIL import Image
# from rembg import remove
from app.core.config import settings


class OpenAIService:
    """OpenAI 兼容 API服务封装 - 使用纯HTTP请求"""

    def __init__(self):
        self.base_url = settings.OPENAI_API_BASE_URL.rstrip('/')
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.WEB_TOOL_MODEL
        self.image_model = settings.IMAGE_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS

        # 创建HTTP客户端
        self.client = httpx.AsyncClient(
            timeout=100.0,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
        )

    async def _make_request(
        self,
        endpoint: str,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """发送HTTP请求到API"""
        url = f"{self.base_url}{endpoint}"

        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            raise Exception(f"API请求失败 [{e.response.status_code}]: {error_detail}")
        except httpx.RequestError as e:
            raise Exception(f"网络请求错误: {str(e)}")
        except Exception as e:
            raise Exception(f"API调用失败: {str(e)}")

    async def generate_completion(
        self,
        prompt: str,
        system_message: str = "You are a helpful assistant.",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """生成文本补全"""

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens or self.max_tokens,
        }

        result = await self._make_request("/v1/chat/completions", payload)

        # 解析响应
        try:
            return result["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise Exception(f"解析API响应失败: {str(e)}, 响应: {result}")

    async def generate_completion_gemini_format(
        self,
        prompt: str,
        system_message: str = "You are a helpful assistant.",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,

    ) -> str:
        """生成文本补全 (Gemini Format)"""

        # Construct payload in Gemini format
        payload = {
            "contents": [
                {
                    "role": "model",
                    "parts": [
                    {
                        "text": system_message
                    }
                    ]
                },
                {
                    "role": "user",
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens or self.max_tokens,
                "thinkingConfig": { 
                    "thinkingLevel": "high",
                    "includeThoughts": "true"
                },
            },
            "tools": [
                {
                    "googleSearch": {}
                },
                {
                    "urlContext": {}
                }
            ]
        }

        # Use the Gemini generateContent endpoint
        # Assuming self.model contains a valid Gemini model ID (e.g. gemini-2.0-flash, gemini-1.5-pro)
        result = await self._make_request(f"/v1beta/models/{self.model}:generateContent", payload)

        # Parse response
        try:
            # Handle potential multiple candidates or thoughts
            candidate = result["candidates"][-1]
            content_parts = candidate["content"]["parts"]
            
            # Filter out parts that are marked as thoughts
            full_text = "".join([
                part.get("text", "") 
                for part in content_parts 
                if part.get("thought") is not True and part.get("thought") != "true"
            ])
            return full_text or ""
        except (KeyError, IndexError) as e:
            raise Exception(f"解析Gemini API响应失败: {str(e)}, 响应: {result}")

    async def generate_image(
        self,
        prompt: str,
        size: str,
        style: str,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> str:
        """生成图片"""
        system_message: str = f"""你是一个专业的视频封面设计AI助手。你的任务是生成适合抖音平台的高清晰度视频封面图片。要求：
                                    1. 符合抖音平台的视觉风格：鲜艳、吸引眼球、高对比度
                                    2. 适配{size}比例
                                    3. 符合用户要求
                                    4. 符合平台内容审核标准
                                """
        payload = {
            "model": self.image_model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            "temperature": temperature,
        }

        result = await self._make_request("/v1/chat/completions", payload)

        # 解析响应
        try:
            return result["choices"][0]["message"]["images"] or []
        except (KeyError, IndexError) as e:
            raise Exception(f"解析API响应失败: {str(e)}, 响应: {result}")

    async def generate_image_gemini_format(
        self,
        prompt: str,
        size: str,
        style: str,
        theme: str,
        style_keywords: Optional[list] = None,
        negative_prompt: Optional[str] = None,
        resolution: str = "4k",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        # Phase 2 parameters
        reference_image: Optional[str] = None,
        denoising_strength: float = 0.7,
        preserve_composition: bool = False,
        style_weights: Optional[dict] = None,
    ) -> str:
        """生成图片"""
        # Build keywords context if provided
        keywords_context = ""
        if style_keywords and len(style_keywords) > 0:
            keywords_context = f"\n                                    7. 风格关键词参考：{', '.join(style_keywords)}"
        
        # Build negative prompt context if provided
        negative_context = ""
        if negative_prompt and negative_prompt.strip():
            negative_context = f"\n                                    8. 避免出现的元素：{negative_prompt}"
        
        # Build style mixing context if provided
        style_mix_context = ""
        if style_weights and len(style_weights) > 0:
            style_descriptions = [f"{s} ({int(w*100)}%)" for s, w in style_weights.items()]
            style_mix_context = f"\n                                    9. 风格混合：{', '.join(style_descriptions)}"
            # Override single style with mixed description
            style = "混合风格 - " + ", ".join(style_weights.keys())
        
        # Build image-to-image context if reference image is provided
        i2i_context = ""
        if reference_image:
            strength_desc = "轻微" if denoising_strength < 0.4 else "中等" if denoising_strength < 0.7 else "强烈"
            composition_note = "，必须保留原图构图和布局" if preserve_composition else ""
            i2i_context = f"\n                                    10. 图生图模式：基于参考图片进行{strength_desc}程度的重绘{composition_note}"
        
        system_message: str = f"""你是一个专业的视频封面设计AI助手。你的任务是生成适合抖音平台的高清晰度视频封面图片。要求：
                                    1. 符合抖音平台的视觉风格：鲜艳、吸引眼球、高对比度
                                    2. 符合用户要求
                                    3. 符合平台内容审核标准
                                    4. 主题：{theme}
                                    5. 风格：{style}{keywords_context}{negative_context}{style_mix_context}{i2i_context}
                                    6. 质量指标: 最终图像必须在视觉上与高端摄影编辑传播难以区分-适合：
                                    - 奢华生活方式目录
                                    - 纪实肖像展览
                                    - 医学或人类学可视化
                                    - 优质品牌叙事活动
                                    - 美术摄影收藏
                                """
        
        # Prepare content parts
        user_parts = [{"text": prompt}]
        
        # Add reference image if provided (for image-to-image)
        if reference_image:
            # Extract base64 data if it's a data URL
            if reference_image.startswith('data:'):
                # Format: data:image/jpeg;base64,xxxxx
                parts = reference_image.split(',', 1)
                if len(parts) == 2:
                    mime_part = parts[0].split(';')[0].split(':')[1]  # Extract mime type
                    base64_data = parts[1]
                    user_parts.insert(0, {
                        "inlineData": {
                            "mimeType": mime_part,
                            "data": base64_data
                        }
                    })
        
        payload = {
            "contents": [
                {
                    "role": "model",
                    "parts": [
                        {"text": system_message}
                    ]   
                },
                {   
                    "role": "user",
                    "parts": user_parts
                }
            ],
            "generationConfig": {
                "responseModalities": ["Image"],
                "imageConfig": {
                    "aspectRatio": size,
                    "imageSize": resolution
                }
            }   
        }

        result = await self._make_request("/v1beta/models/gemini-3-pro-image-preview:generateContent", payload)
        try:
            inline_data = result["candidates"][0]["content"]["parts"][0]["inlineData"]
            mime_type = inline_data.get("mimeType", "image/jpeg")
            data = inline_data["data"]
            return f"data:{mime_type};base64,{data}"
        except (KeyError, IndexError) as e:
            raise Exception(f"解析API响应失败: {str(e)}, 响应: {result}")

    async def generate_video_script(
        self,
        theme: str,
        description: str = "",
        keywords: list = None,
        style: str = "professional",
        duration: int = 60,
    ) -> dict:
        """生成视频文案"""
        keywords_str = ", ".join(keywords) if keywords else ""

        prompt = f"""请为以下视频内容生成专业的文案：

主题: {theme}
描述: {description}
关键词: {keywords_str}
风格: {style}
视频时长: {duration}秒

请生成以下内容：
1. 3-5个吸引人的标题（适合短视频）
2. 开场白（5-10秒）
3. 主体内容（适配{duration}秒视频）
4. 结尾号召语（CTA）
5. 字幕分段（每段3-5秒）

请以JSON格式返回，格式如下：
{{
    "titles": ["标题1", "标题2", "标题3"],
    "opening": "开场白内容",
    "body": "主体内容",
    "closing": "结尾内容",
    "subtitles": [
        {{"text": "字幕1", "duration": 3}},
        {{"text": "字幕2", "duration": 4}}
    ]
}}
"""

        system_message = "你是一个专业的视频内容创作专家，擅长撰写吸引人的视频文案和字幕。"

        response = await self.generate_completion(
            prompt=prompt,
            system_message=system_message,
            temperature=0.8,
        )

        # 这里应该解析JSON，但先返回原始响应
        return {"raw_response": response}

    async def generate_copy(self, content: str, style: str) -> str:
        """生成抖音文案"""
        prompt = f"""请根据以下内容，创作一段吸引人的抖音文案：
        
                内容：{content}

                风格要求：{style}

                要求：
                1. 包含合适的Emoji表情
                2. 添加3-5个相关话题标签（hashtags）
                3. 语言生动有趣，符合抖音用户习惯
                4. 控制在200字以内
                """
        system_message = "你是一个爆款短视频文案专家。"
        
        return await self.generate_completion(
            prompt=prompt,
            system_message=system_message,
        )

    async def analyze_image(self, image_url: str) -> str:
        """分析图片内容（如果API支持vision）- 简单版本"""

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "请详细描述这张图片的内容、主题、情绪和适合的使用场景。这将被用于生成视频脚本。"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_url}" if not image_url.startswith("http") else image_url
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 500,
        }

        result = await self._make_request("/v1/chat/completions", payload)

        try:
            return result["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as e:
            raise Exception(f"图片分析失败: {str(e)}")

    async def analyze_image_detailed(self, prompt: str, image_url: str) -> dict:
        """详细分析图片内容，返回结构化数据
        
        Args:
            prompt: 自定义分析提示词
            image_url: 图片的base64编码或URL
        """

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_url}" if not image_url.startswith("http") else image_url
                            }
                        }
                    ]
                }
            ],
            "max_tokens": 800,
        }

        result = await self._make_request("/v1/chat/completions", payload)

        try:
            content = result["choices"][0]["message"]["content"]
            # 尝试提取JSON
            import re
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # 如果无法解析，返回默认结构
                return {
                    "description": content[:200],
                    "tags": [],
                    "mood": None,
                    "color_scheme": None,
                    "composition": None,
                    "subjects": [],
                    "scene_type": None,
                    "style": None
                }
        except (KeyError, IndexError) as e:
            raise Exception(f"图片详细分析失败: {str(e)}")

    async def recommend_music_tags(
        self,
        theme: str,
        description: str = "",
    ) -> dict:
        """基于内容推荐音乐标签"""
        prompt = f"""基于以下视频内容，推荐合适的背景音乐标签：

主题: {theme}
描述: {description}

请分析视频的：
1. 情绪（如：欢快、悲伤、激昂、平和等）
2. 节奏（如：快速、中速、慢速）
3. 适合的音乐类型（如：流行、电子、古典、氛围音乐等）
4. 建议的BPM范围

请以JSON格式返回：
{{
    "mood": ["情绪1", "情绪2"],
    "tempo": "节奏",
    "genres": ["类型1", "类型2"],
    "bpm_range": [最小BPM, 最大BPM]
}}
"""

        response = await self.generate_completion(
            prompt=prompt,
            system_message="你是一个音乐推荐专家。",
            temperature=0.5,
        )

        return {"raw_response": response}

    async def optimize_prompt(self, prompt: str) -> dict:
        """优化图片生成提示词"""
        optimization_prompt = f"""作为AI图片生成提示词优化专家，请优化以下提示词以获得更好的生成效果：

原始提示词：{prompt}

请提供：
1. 优化后的提示词（更详细、更具体、更适合图片生成）
2. 3-5条具体的改进建议

要求：
- 保留用户的核心意图
- 添加视觉细节描述（光线、色调、构图等）
- 使用专业的摄影/艺术术语
- 提高描述的精确度

请以JSON格式返回：
{{
    "optimized": "优化后的详细提示词",
    "suggestions": ["建议1", "建议2", "建议3"]
}}
"""
        
        response = await self.generate_completion_gemini_format(
            prompt=optimization_prompt,
            system_message="你是一个专业的AI图片生成提示词优化专家。",
            temperature=0.7,
        )
        
        # 尝试解析JSON响应
        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            else:
                # 如果无法解析JSON，返回默认结构
                return {
                    "optimized": response[:500] if len(response) > 500 else response,
                   "suggestions": ["添加更多视觉细节", "指定光线和色调", "描述构图和视角"]
                }
        except Exception as e:
            # 出错时返回原始提示词
            return {
                "optimized": prompt,
                "suggestions": ["优化失败，请手动改进提示词"]
            }

    async def transfer_style(
        self,
        image_base64: str,
        art_style: str,
        intensity: float = 0.8,
        additional_prompt: str = ""
    ) -> str:
        """风格迁移 - 将图片转换为特定艺术风格"""
        
        # 艺术风格库
        STYLE_LIBRARY = {
            # 艺术大师
            "vangogh_starry": {
                "name": "梵高星空",
                "prompt": "in the style of Vincent van Gogh's Starry Night, swirling brushstrokes, vibrant blues and yellows, post-impressionist masterpiece"
            },
            "monet_impressionist": {
                "name": "莫奈印象派",
                "prompt": "in the style of Claude Monet, soft light, impressionist painting, pastel colors, gentle brushwork"
            },
            "picasso_cubist": {
                "name": "毕加索立体主义",
                "prompt": "in the style of Pablo Picasso's cubism, geometric shapes, fragmented perspectives, bold colors"
            },
            "ukiyoe": {
                "name": "日本浮世绘",
                "prompt": "in the style of Japanese Ukiyo-e woodblock prints, bold outlines, flat colors, traditional Japanese art"
            },
            "kandinsky_abstract": {
                "name": "康定斯基抽象",
                "prompt": "in the style of Wassily Kandinsky, abstract geometric forms, vibrant colors, expressionist art"
            },
            
            # 流行风格
            "pixar_animation": {
                "name": "皮克斯动画",
                "prompt": "Pixar animation style, 3D rendered, colorful and vibrant, cute character design, family-friendly"
            },
            "lego_bricks": {
                "name": "乐高积木",
                "prompt": "made of LEGO bricks, blocky construction, colorful plastic pieces, toy-like appearance"
            },
            "cyberpunk": {
                "name": "赛博朋克",
                "prompt": "cyberpunk style, neon lights, futuristic cityscape, dark and moody, high-tech dystopia"
            },
            "vaporwave": {
                "name": "蒸汽波",
                "prompt": "vaporwave aesthetic, retro 80s/90s, pink and cyan gradients, glitch art, nostalgic"
            },
            "anime": {
                "name": "日本动漫",
                "prompt": "anime art style, cel-shaded, vibrant colors, expressive characters, Japanese animation"
            },
            
            # 材质风格
            "crystal": {
                "name": "水晶材质",
                "prompt": "made of transparent crystal, glass-like, refractive surfaces, prismatic light effects"
            },
            "metallic": {
                "name": "金属质感",
                "prompt": "metallic surface, chrome and steel, reflective, industrial aesthetic"
            },
            "wood_carving": {
                "name": "木雕",
                "prompt": "carved from wood, wooden texture, crafted sculpture, natural wood grain"
            },
            "paper_art": {
                "name": "纸艺",
                "prompt": "paper craft style, cut paper art, layered paper, origami-inspired"
            },
            "watercolor": {
                "name": "水彩画",
                "prompt": "watercolor painting, soft washes, flowing colors, artistic brush effects"
            }
        }
        
        # 获取风格定义
        style_def = STYLE_LIBRARY.get(art_style)
        if not style_def:
            # 默认风格
            style_def = {
                "name": "艺术风格",
                "prompt": f"artistic style: {art_style}"
            }
        
        # 构建提示词
        style_prompt = style_def["prompt"]
        
        # 根据强度调整提示词
        if intensity < 0.3:
            strength_desc = "subtle hint of"
        elif intensity < 0.6:
            strength_desc = "moderate"
        elif intensity < 0.8:
            strength_desc = "strong"
        else:
            strength_desc = "extreme, highly stylized"
        
        full_prompt = f"Transform this image with {strength_desc} {style_prompt}. "
        full_prompt += "IMPORTANT: Preserve the original composition, layout, and main subjects. "
        full_prompt += "Only change the artistic style and visual treatment. "
        
        if additional_prompt:
            full_prompt += f"{additional_prompt}. "
        
        # 使用 image-to-image 模式
        result = await self.generate_image_gemini_format(
            prompt=full_prompt,
            style=art_style,
            theme="style_transfer",
            size="16:9",
            resolution="1024",
            reference_image=image_base64,
            denoising_strength=intensity,  # 强度直接映射到重绘强度
            preserve_composition=True  # 始终保留构图
        )
        
        return result

    # async def generate_sticker(
    #     self,
    #     prompt: str,
    #     style: str = "cartoon",
    #     remove_background: bool = True
    # ) -> str:
    #     """生成贴纸 - 带透明背景的PNG图片"""
        
    #     # 风格提示词映射
    #     STYLE_PROMPTS = {
    #         "cartoon": "cute cartoon sticker style, simple clean design, bold outlines, vibrant colors, chibi style, kawaii",
    #         "pixel": "pixel art sticker, 8-bit retro style, pixelated, retro gaming aesthetic, limited color palette",
    #         "3d": "3D rendered sticker, Pixar style, glossy finish, depth and dimension, smooth surfaces, modern 3D graphics",
    #         "hand-drawn": "hand-drawn sticker style, sketch-like, artistic lines, watercolor accents, handcrafted feel"
    #     }
        
    #     style_prompt = STYLE_PROMPTS.get(style, STYLE_PROMPTS["cartoon"])
        
    #     # 构建完整提示词 - 强调孤立对象和干净背景
    #     full_prompt = f"{prompt}, {style_prompt}"
    #     full_prompt += ", isolated object on white background, centered composition, no shadows, clean edges, sticker design"
    #     full_prompt += ", professional product photography lighting, high contrast with background"
        
    #     # 负面提示词 - 避免复杂背景
    #     negative_prompt = "complex background, messy background, gradients in background, multiple objects, cluttered, busy scene, text, watermark"
        
    #     # 生成图片
    #     image_url = await self.generate_image_gemini_format(
    #         prompt=full_prompt,
    #         style=style,
    #         theme="sticker",
    #         size="1:1",  # 贴纸通常是方形
    #         resolution="1024",
    #         negative_prompt=negative_prompt,
    #         temperature=0.7
    #     )
        
    #     # 如果需要移除背景
    #     if remove_background:
    #         try:
    #             # 从base64 data URL中提取图片数据
    #             if image_url.startswith('data:image'):
    #                 # 移除 "data:image/png;base64," 前缀
    #                 base64_data = image_url.split(',', 1)[1]
    #             else:
    #                 base64_data = image_url
                
    #             # 解码base64图片
    #             image_bytes = base64.b64decode(base64_data)
    #             input_image = Image.open(io.BytesIO(image_bytes))
                
    #             # 使用rembg移除背景
    #             output_image = remove(input_image)
                
    #             # 确保输出是RGBA模式（透明背景）
    #             if output_image.mode != 'RGBA':
    #                 output_image = output_image.convert('RGBA')
                
    #             # 转换回base64
    #             buffered = io.BytesIO()
    #             output_image.save(buffered, format="PNG")
    #             img_base64 = base64.b64encode(buffered.getvalue()).decode()
                
    #             return f"data:image/png;base64,{img_base64}"
                
    #         except Exception as e:
    #             # 如果背景移除失败，返回原图
    #             print(f"Background removal failed: {str(e)}")
    #             return image_url
        
    #     return image_url

    async def sketch_to_image(
        self,
        sketch_base64: str,
        prompt: str,
        style: str = "photorealistic"
    ) -> str:
        """草图转图片 - 基于用户手绘草图生成精美图片"""
        
        # 构建提示词 - 强调基于草图生成
        full_prompt = f"Based on this rough sketch, create a detailed {style} image: {prompt}"
        full_prompt += ", professional quality, highly detailed, interpret the sketch accurately"
        full_prompt += ", preserve the composition and layout from the sketch, enhance with details"
        
        # 使用 image-to-image 模式，低denoising让AI更多参考草图结构
        result = await self.generate_image_gemini_format(
            prompt=full_prompt,
            style=style,
            theme="sketch_to_image",
            size="1:1",
            resolution="2k",
            reference_image=sketch_base64,
            denoising_strength=0.7,  # 较高denoising让AI有足够创作空间
            preserve_composition=True  # 保留草图布局
        )
        
        return result

    async def face_portrait(
        self,
        face_image_base64: str,
        scene_prompt: str,
        style: str = "photorealistic",
        preserve_face: float = 0.3
    ) -> str:
        """AI写真生成 - 基于人脸照片生成特定场景下的写真"""
        
        # 构建提示词 - 强调保留人脸特征，改变场景和风格
        full_prompt = f"Create a professional {style} portrait: {scene_prompt}. "
        full_prompt += "CRITICAL REQUIREMENTS: "
        full_prompt += "1. PRESERVE the facial features, face shape, and facial identity from the reference photo EXACTLY. "
        full_prompt += "2. DO NOT change the person's face, eyes, nose, mouth, or facial structure. "
        full_prompt += "3. ONLY change: background scene, clothing/outfit, lighting, pose, and artistic style. "
        full_prompt += "4. The final image should look like the SAME PERSON in a different setting. "
        full_prompt += "5. Maintain photorealistic quality with professional photography lighting. "
        
        # 场景风格映射
        SCENE_STYLES = {
            "business": "in a modern office environment, wearing professional business attire, confident pose",
            "casual": "in a relaxed outdoor setting, casual clothing, natural and friendly expression",
            "traditional": "in traditional Chinese style setting, wearing hanfu or traditional clothing, elegant atmosphere",
            "sci-fi": "in a futuristic cyberpunk environment, high-tech outfit, dramatic neon lighting",
            "beach": "on a beautiful beach at sunset, summer outfit, relaxed vacation vibe",
            "studio": "in a professional photo studio, clean background, studio lighting setup"
        }
        
        # 如果场景提示是预设关键词，使用完整描述
        scene_lower = scene_prompt.lower()
        for key, description in SCENE_STYLES.items():
            if key in scene_lower:
                full_prompt += f" Scene details: {description}"
                break
        
        # preserve_face参数转换为denoising_strength
        # preserve_face越高，denoising_strength应该越低（保留原图更多）
        denoising = 1.0 - (preserve_face * 0.5)  # 范围 0.5-1.0
        
        # 使用 image-to-image 模式
        result = await self.generate_image_gemini_format(
            prompt=full_prompt,
            style=style,
            theme="face_portrait",
            size="3:4",  # 人像常用比例
            resolution="2k",
            reference_image=face_image_base64,
            denoising_strength=denoising,
            preserve_composition=False  # 不保留构图，允许改变姿势
        )
        
        return result

    async def face_swap(
        self,
        face_image_base64: str,
        target_image_base64: str,
        blend_strength: float = 0.7
    ) -> str:
        """人脸融合 - 将人脸融合到目标图片中"""
        
        # 构建提示词 - 强调自然融合
        full_prompt = "FACE SWAP TASK: Replace the face in the target image with the face from the reference photo. "
        full_prompt += "CRITICAL REQUIREMENTS: "
        full_prompt += "1. PRESERVE the exact facial features, face shape, and identity from the reference face photo. "
        full_prompt += "2. PRESERVE the exact pose, body, background, lighting, and composition from the target image. "
        full_prompt += "3. ONLY change: replace the target person's face with the reference face. "
        full_prompt += "4. Blend the face naturally: match skin tone, lighting direction, and head angle. "
        full_prompt += "5. Ensure seamless edges where the face meets the neck and hair. "
        full_prompt += "6. The result should look like the reference person is naturally in the target scene. "
        
        # 注意：这里我们使用face_image作为参考，但提示词指示使用其内容替换target中的人脸
        # 由于API限制，我们实际上将face和target组合处理
        # blend_strength越高，融合应该越自然（需要更多AI处理）
        denoising = 0.4 + (blend_strength * 0.4)  # 范围 0.4-0.8
        
        # 使用 image-to-image 模式，以target为基础
        result = await self.generate_image_gemini_format(
            prompt=full_prompt,
            style="photorealistic",
            theme="face_swap",
            size="1:1",
            resolution="2k",
            reference_image=target_image_base64,  # 以目标图片为基础
            denoising_strength=denoising,
            preserve_composition=True  # 保留目标图片的构图
        )
        
        # 注意：由于Gemini API的限制，我们只能传入一张参考图
        # 这里的实现可能无法完美实现人脸替换
        # 实际效果取决于API的理解能力
        # 如果效果不佳，可能需要使用专门的face swap API
        
        return result

    async def remove_background(
        self,
        image_base64: str,
        subject: str = "auto",
        refine_edges: bool = True
    ) -> str:
        """智能抠图 - 移除背景，生成透明PNG
        
        Args:
            image_base64: 原始图片的base64编码
            subject: 主体类型提示 (person/object/auto)
            refine_edges: 是否精细化边缘
        """
        
        # 构建提示词 - 强调生成透明背景
        subject_hints = {
            "person": "the person in the image",
            "object": "the main object in the image",
            "auto": "the main subject in the image"
        }
        
        subject_desc = subject_hints.get(subject, subject_hints["auto"])
        
        full_prompt = f"Task: Remove the background from this image, keeping only {subject_desc}. "
        full_prompt += "CRITICAL REQUIREMENTS: "
        full_prompt += "1. PRESERVE the exact appearance, colors, and details of the subject. "
        full_prompt += "2. REMOVE everything in the background completely. "
        full_prompt += "3. Output should have a TRANSPARENT background (alpha channel). "
        full_prompt += "4. Keep the subject in the same position and size. "
        
        if refine_edges:
            full_prompt += "5. Refine edges carefully - smooth transitions, no jagged edges, preserve fine details like hair. "
        
        full_prompt += "The result should be a clean cutout suitable for compositing onto other backgrounds."
        
        # 使用 image-to-image 模式，较高denoising让AI重新绘制背景为透明
        result = await self.generate_image_gemini_format(
            prompt=full_prompt,
            style="photorealistic",
            theme="background_removal",
            size="1:1",
            resolution="2k",
            reference_image=image_base64,
            denoising_strength=0.3,  # 低denoising保留主体细节
            preserve_composition=True
        )
        
        return result

    async def replace_background(
        self,
        image_base64: str,
        background_scene: str = "nature",
        custom_prompt: str = None,
        background_color: str = "#FFFFFF",
        match_lighting: bool = True,
        add_depth: bool = True
    ) -> str:
        """背景替换 - 移除原背景，合成到新的AI生成背景
        
        Args:
            image_base64: 原始图片的base64编码
            background_scene: 背景场景预设
            custom_prompt: 自定义场景描述（会覆盖预设）
            background_color: 纯色背景时的颜色
            match_lighting: 是否匹配光照
            add_depth: 是否添加景深效果
        """
        
        # 背景场景库
        BACKGROUND_SCENES = {
            "office": {
                "name": "现代办公室",
                "prompt": "modern office environment, professional workspace, clean desk, soft window lighting, corporate setting, high-end office interior"
            },
            "nature": {
                "name": "自然风光",
                "prompt": "beautiful natural landscape, outdoor scenery, soft natural lighting, green plants, fresh air, peaceful environment"
            },
            "tech": {
                "name": "科技感",
                "prompt": "futuristic tech environment, cyberpunk style, neon lights, high-tech laboratory, holographic displays, modern technology"
            },
            "fantasy": {
                "name": "梦幻场景",
                "prompt": "dreamy fantasy background, soft pastel colors, magical atmosphere, ethereal lighting, floating particles, enchanted environment"
            },
            "solid": {
                "name": "纯色背景",
                "prompt": f"solid color background {background_color}, smooth gradient, professional studio lighting, clean backdrop"
            },
            "blur": {
                "name": "模糊背景",
                "prompt": "same background but heavily blurred, bokeh effect, shallow depth of field, professional portrait photography style"
            }
        }
        
        # 确定背景描述
        if custom_prompt and custom_prompt.strip():
            background_desc = custom_prompt
            scene_name = "自定义场景"
        else:
            scene_def = BACKGROUND_SCENES.get(background_scene, BACKGROUND_SCENES["nature"])
            background_desc = scene_def["prompt"]
            scene_name = scene_def["name"]
        
        # 构建完整提示词
        full_prompt = f"Task: Replace the background of this image with a new scene: {background_desc}. "
        full_prompt += "CRITICAL REQUIREMENTS: "
        full_prompt += "1. PRESERVE the exact appearance of the main subject (person/object) - keep face, body, clothes, colors identical. "
        full_prompt += "2. ONLY change the background behind the subject. "
        full_prompt += "3. Keep the subject in the same position, pose, and size. "
        full_prompt += "4. The new background should be: " + background_desc + ". "
        
        if match_lighting:
            full_prompt += "5. Match the lighting direction and color temperature between the subject and new background for realistic integration. "
        
        if add_depth:
            full_prompt += "6. Add subtle depth of field effect - slightly blur the background to make the subject stand out. "
        
        if background_scene == "blur":
            full_prompt += "SPECIAL: Keep the original background colors and scene, just apply heavy blur/bokeh effect. "
        
        full_prompt += "The result should look natural and professionally composited."
        
        # 使用 image-to-image 模式
        result = await self.generate_image_gemini_format(
            prompt=full_prompt,
            style="photorealistic",
            theme="background_replacement",
            size="1:1",
            resolution="2k",
            reference_image=image_base64,
            denoising_strength=0.6,  # 中等强度，保留主体但允许背景重绘
            preserve_composition=True
        )
        
        return result

    async def generate_storyboard(
        self,
        story_prompt: str,
        character_image: str = None,
        num_frames: int = 6,
        style: str = "photorealistic",
        shot_types: list = None
    ) -> list:
        """生成故事板 - 根据故事生成连续分镜
        
        Args:
            story_prompt: 故事情节描述
            character_image: 角色参考图（可选）
            num_frames: 分镜数量（4-8）
            style: 画面风格
            shot_types: 偏好的镜头类型
        
        Returns:
            list: 包含每个分镜的字典列表
        """
        
        # 镜头类型库
        SHOT_TYPES = {
            "closeup": "close-up shot focusing on character's face and expression",
            "medium": "medium shot showing character from waist up",
            "wide": "wide shot showing full scene and environment",
            "over_shoulder": "over-the-shoulder shot for dialogue or interaction",
            "birds_eye": "bird's eye view from above"
        }
        
        # 如果没有指定镜头类型，使用默认组合
        if not shot_types:
            shot_types = ["medium", "closeup", "wide", "medium", "closeup", "wide"]
        
        # 确保有足够的镜头类型
        while len(shot_types) < num_frames:
            shot_types.extend(shot_types)
        shot_types = shot_types[:num_frames]
        
        # 第一步：让AI拆分故事为多个场景
        split_prompt = f"""Given this story: "{story_prompt}"

Please split it into exactly {num_frames} sequential scenes/moments for a storyboard.
For each scene, provide:
1. A brief description (1-2 sentences)
2. The key action or moment
3. Character's emotion/state

Format your response as a numbered list (1. Scene description, 2. Scene description, etc.)
Keep descriptions visual and specific for image generation."""

        try:
            # 调用AI拆分场景
            split_response = await self.generate_completion(
                prompt=split_prompt,
                temperature=0.7
            )
            
            # 解析场景描述
            scenes = []
            lines = split_response.strip().split('\n')
            for line in lines:
                line = line.strip()
                # 匹配 "1. " 或 "1) " 开头的行
                if line and (line[0].isdigit() or line.startswith('-')):
                    # 移除序号
                    scene_desc = line.split('.', 1)[-1].split(')', 1)[-1].strip()
                    if scene_desc:
                        scenes.append(scene_desc)
            
            # 如果解析失败，使用简单拆分
            if len(scenes) < num_frames:
                scenes = [f"Scene {i+1}: {story_prompt}" for i in range(num_frames)]
            
            scenes = scenes[:num_frames]
            
        except Exception as e:
            # 如果AI调用失败，使用简单拆分
            print(f"Scene splitting failed: {e}")
            scenes = [f"Scene {i+1}: {story_prompt}" for i in range(num_frames)]
        
        # 第二步：为每个场景生成图片
        frames = []
        previous_image = None
        
        for i, scene_desc in enumerate(scenes):
            shot_type_key = shot_types[i]
            shot_type_desc = SHOT_TYPES.get(shot_type_key, SHOT_TYPES["medium"])
            
            # 构建完整提示词
            full_prompt = f"Storyboard frame {i+1}/{num_frames}: {scene_desc}. "
            full_prompt += f"Camera angle: {shot_type_desc}. "
            full_prompt += f"Style: {style}, cinematic lighting, professional storyboard quality. "
            
            if character_image or previous_image:
                full_prompt += "CRITICAL: Maintain consistent character appearance - "
                full_prompt += "same face, same clothing, same physical features. "
                full_prompt += "ONLY change the pose, expression, and scene background based on the story moment."
            
            # 选择参考图：优先用角色图，其次用上一帧
            reference = character_image if character_image else previous_image
            
            try:
                # 生成分镜图片
                image_url = await self.generate_image_gemini_format(
                    prompt=full_prompt,
                    style=style,
                    theme="storyboard",
                    size="16:9",  # 常用的故事板比例
                    resolution="1024",
                    reference_image=reference,
                    denoising_strength=0.5 if reference else 0.7,
                    preserve_composition=False
                )
                
                # 保存这一帧作为下一帧的参考（如果没有角色图）
                if not character_image:
                    previous_image = image_url
                
                # 添加到结果
                frames.append({
                    "frameNumber": i + 1,
                    "imageUrl": image_url,
                    "description": scene_desc,
                    "shotType": shot_type_key
                })
                
            except Exception as e:
                print(f"Frame {i+1} generation failed: {e}")
                # 继续生成下一帧
                continue
        
        return frames

    async def close(self):

        """关闭HTTP客户端连接"""
        await self.client.aclose()


# 创建单例
openai_service = OpenAIService()
