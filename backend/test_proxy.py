import asyncio
import httpx
from app.core.config import settings

async def main():
    api_key = "darry"
    base_url = "https://cpa.mosuyang.org"
    model = "claude-opus-4-6-thinking"

    print("--- 1. Testing /v1/chat/completions (OpenAI format) ---")
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{base_url}/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Hello"}],
                },
                timeout=10
            )
            print(res.status_code, res.text[:200])
        except Exception as e:
            print(f"Error: {e}")

    print("\n--- 2. Testing /v1/messages (Anthropic native format) ---")
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{base_url}/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": model,
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": "Hello"}],
                },
                timeout=10
            )
            print(res.status_code, res.text[:200])
        except Exception as e:
            print(f"Error: {e}")
            
    print("\n--- 3. Testing /v1/messages with Bearer Token ---")
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(
                f"{base_url}/v1/messages",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json"
                },
                json={
                    "model": model,
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": "Hello"}],
                },
                timeout=10
            )
            print(res.status_code, res.text[:200])
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
