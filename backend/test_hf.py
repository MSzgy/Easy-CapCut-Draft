import asyncio
import os
from dotenv import load_dotenv
from app.services.ai_service import OpenAIService
from app.core.config import settings

# Load environment variables
load_dotenv()

async def test_hf_generation():
    print(f"Testing Hugging Face generation with token: {settings.HF_TOKEN[:5]}..." if settings.HF_TOKEN else "No HF_TOKEN found")
    service = OpenAIService()
    try:
        print("Sending request to Hugging Face...")
        result = await service.generate_image_huggingface(
            prompt="Test image",
            width=512,
            height=512
        )
        print("Generation successful!")
        print(f"Result length: {len(result)}")
    except Exception as e:
        print(f"Generation failed: {e}")
    finally:
        await service.close()

if __name__ == "__main__":
    asyncio.run(test_hf_generation())
