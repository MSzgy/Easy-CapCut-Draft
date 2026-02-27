import asyncio
import os
import sys

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.providers.gemini import GeminiProvider
from app.providers.openai_compat import OpenAICompatProvider
from app.providers.base import TextRequest
from app.core.config import settings

async def main():
    req = TextRequest(prompt="Say 'Hello'", system_message="Test")

    print("\n--- Testing GeminiProvider ---")
    try:
        gemini = GeminiProvider(api_key=settings.GEMINI_API_KEY, base_url=settings.GEMINI_BASE_URL, model=settings.GEMINI_TEXT_MODEL)
        res = await gemini.generate_text(req)
        print(f"Gemini Success: {res[:50]}")
    except Exception as e:
        print(f"Gemini Error: {e}")

    print("\n--- Testing OpenAICompatProvider ---")
    try:
        openai = OpenAICompatProvider(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL, model=settings.OPENAI_MODEL)
        res = await openai.generate_text(req)
        print(f"OpenAI Success: {res[:50]}")
    except Exception as e:
        print(f"OpenAI Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
