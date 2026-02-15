import asyncio
import os
from app.services.ai_service_v2 import ai_service

async def test_tts():
    print("Testing TTS Provider...")
    text = "It's in the top drawer... wait, it's empty? No way, that's impossible! I'm sure I put it there!"
    
    try:
        result = await ai_service.generate_speech(
            text=text,
            voice_description="Speak in an incredulous tone, but with a hint of panic beginning to creep into your voice.",
            language="Auto",
            provider="hf:tts_qwen"
        )
        print(f"✅ TTS Success: {result}")
    except Exception as e:
        print(f"❌ TTS Failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_tts())
