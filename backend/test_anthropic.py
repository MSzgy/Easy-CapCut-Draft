import asyncio
import os
import sys

# Add the backend directory to python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.providers.openai_compat import OpenAICompatProvider
from app.providers.base import TextRequest
from app.core.config import settings

async def main():
    try:
        print("Testing OpenAICompatProvider with Claude proxy...")
        provider = OpenAICompatProvider(
            api_key=settings.ANTHROPIC_API_KEY,
            base_url=settings.ANTHROPIC_BASE_URL,
            model=settings.ANTHROPIC_MODEL,
        )
        print(f"Base URL: {provider.base_url}")
        print(f"Model: {provider.model}")
        
        req = TextRequest(prompt="Say 'Hello World' and nothing else.", system_message="You are a helpful assistant.")
        res = await provider.generate_text(req)
        print(f"Success! Response: {res}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await provider.close()

if __name__ == "__main__":
    asyncio.run(main())
