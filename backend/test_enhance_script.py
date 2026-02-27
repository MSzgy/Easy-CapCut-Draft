import asyncio
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.abspath('.'))

from app.api.routes.ai_content import enhance_script
from app.schemas.ai_schemas import EnhanceScriptRequest

async def test_enhance():
    req = EnhanceScriptRequest(prompt="一个下雨的北京的午后，两人相遇", provider="gemini")
    try:
        res = await enhance_script(request=req, current_user={"username": "test"})
        print("SUCCESS:")
        print(res.model_dump_json(indent=2))
    except Exception as e:
        print("FAILED WITH EXCEPTION:")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_enhance())
