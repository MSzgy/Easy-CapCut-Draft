
import asyncio
import httpx
import json

async def test_generate_content():
    url = "http://localhost:8000/api/ai/generate"
    
    payload = {
        "mode": "prompt",
        "prompt": "Generating a storyboard with 4 frames",
        "videoStyle": "promo",
        "generateImages": False,
        "numFrames": 4,
        "textProvider": "gemini",
        "imageProvider": "gemini"
    }
    
    print(f"Sending request with numFrames: {payload['numFrames']}")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, json=payload, timeout=60.0)
            if response.status_code == 200:
                data = response.json()
                frames = len(data.get("scenes", []))
                print(f"Success! Generated {frames} frames.")
                print(json.dumps(data, indent=2, ensure_ascii=False))
            else:
                print(f"Error: {response.status_code}")
                print(response.text)
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_generate_content())
