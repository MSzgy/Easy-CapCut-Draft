import asyncio
import base64
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai_service import openai_service
from app.api.routes.ai_content import generate_content
from app.schemas.ai_schemas import GenerateContentRequest

async def test_vision_logic():
    print("Testing Vision Analysis Logic...")
    
    # A small red dot as base64 for testing (if we don't have a real file)
    test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
    
    try:
        print("Analyzing image...")
        analysis = await openai_service.analyze_image(test_image_base64)
        print(f"Analysis successful: {analysis}")
        
        print("\nTesting Generate Request (Upload mode)...")
        request = GenerateContentRequest(
            mode="upload",
            uploadedAssets=[
                {
                    "id": "test_1",
                    "name": "test.png",
                    "type": "image",
                    "size": "1KB",
                    "content": test_image_base64
                }
            ]
        )
        
        # We can't easily call the route directly because of FastAPI dependencies if any (but here it seems pure)
        # We'll just test the service methods which is the core
        from app.api.routes.ai_content import generate_content
        # Mocking the request if needed, but GenerateContentRequest is already a pydantic model
        
        # For simplicity, let's just run what the route does
        image_content = test_image_base64
        analysis = await openai_service.analyze_image(image_content)
        print(f"Vision Analysis for Scene Gen: {analysis}")
        
        from app.api.routes.ai_content import generate_scenes_from_prompt
        scenes = await generate_scenes_from_prompt(f"基于以下图片内容的描述生成视频：{analysis}")
        print(f"\nGenerated Scenes: {len(scenes)}")
        for s in scenes:
            print(f"- {s.timestamp}: {s.script[:50]}...")
            
        print("\n✅ Verification SUCCESS")
    except Exception as e:
        print(f"\n❌ Verification FAILED: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_vision_logic())
