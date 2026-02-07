import requests
import os
import json

# Configuration
API_URL = "http://localhost:8000/api/video/generate"
PROJECT_ID = "test_video_project_001"

# Use existing images in the project root for testing
# Adjust paths if running from different directory
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
IMAGE_PATHS = [
    os.path.join(BASE_DIR, "ai-generated-cinematic-1.png"),
    os.path.join(BASE_DIR, "ai-generated-photorealistic-1.png")
]

# Ensure images exist
for p in IMAGE_PATHS:
    if not os.path.exists(p):
        print(f"Warning: Test image not found at {p}")

# Mock Payload
payload = {
    "project_id": PROJECT_ID,
    "script_data": {
        "sections": [
            {"text": "This is the first scene showing a cinematic view.", "duration": 3.0},
            {"text": "This is the second scene showing a photorealistic view.", "duration": 3.0}
        ]
    },
    "image_paths": IMAGE_PATHS,
    "audio_paths": [], # No audio for this simple test
    "mode": "capcut", # Change to 'direct' to test renderer
    "ai_enhanced": False
}

def test_generate(mode="capcut"):
    print(f"\n--- Testing Mode: {mode} ---")
    payload["mode"] = mode
    try:
        response = requests.post(API_URL, json=payload)
        if response.status_code == 200:
            data = response.json()
            print("✅ Success!")
            print(f"Output Path: {data['output_path']}")
        else:
            print(f"❌ Failed with status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # 1. Test CapCut Export
    test_generate("capcut")
    
    # 2. Test Direct Render
    # Note: Requires MoviePy installed in backend environment
    test_generate("direct")
