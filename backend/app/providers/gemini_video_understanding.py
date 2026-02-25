"""
Gemini Video Understanding Provider

Implements VideoUnderstandingProvider using the google-genai SDK
to upload videos via the Files API and analyze them with Gemini.
"""

import asyncio
import os
import time
from typing import Optional

from google import genai
from google.genai import types

from app.providers.base import VideoUnderstandingProvider, VideoUnderstandingRequest
from app.core.config import settings


class GeminiVideoUnderstandingProvider(VideoUnderstandingProvider):
    """Google Gemini video understanding provider using the Files API."""

    def __init__(
        self,
        api_key: str = None,
        model: str = None,
    ):
        self.api_key = api_key or settings.GEMINI_OFFICIAL_API_KEY
        self.model = model or settings.GEMINI_TEXT_MODEL
        # 直连 Google 官方 API（不走代理），因为 Files API 需要官方端点
        self.client = genai.Client(api_key=self.api_key)

    async def analyze_video(self, request: VideoUnderstandingRequest) -> str:
        """
        Upload a video to Gemini Files API and analyze its content.

        1. Upload the video file
        2. Wait for it to become ACTIVE
        3. Send to Gemini for analysis
        4. Clean up the uploaded file
        """
        uploaded_file = None
        try:
            # Step 1: Upload file (synchronous SDK call, run in executor)
            loop = asyncio.get_event_loop()
            uploaded_file = await loop.run_in_executor(
                None,
                lambda: self.client.files.upload(file=request.file_path)
            )

            print(f"📤 Video uploaded to Gemini: {uploaded_file.name}, state={uploaded_file.state}")

            # Step 2: Wait for the file to become ACTIVE
            max_wait = 300  # 5 minutes
            waited = 0
            while uploaded_file.state.name == "PROCESSING" and waited < max_wait:
                await asyncio.sleep(5)
                waited += 5
                uploaded_file = await loop.run_in_executor(
                    None,
                    lambda: self.client.files.get(name=uploaded_file.name)
                )
                print(f"⏳ Video processing... state={uploaded_file.state.name} ({waited}s)")

            if uploaded_file.state.name == "FAILED":
                raise Exception(f"Video processing failed: {uploaded_file.state}")

            if uploaded_file.state.name != "ACTIVE":
                raise Exception(f"Video processing timed out after {max_wait}s, state={uploaded_file.state.name}")

            print(f"✅ Video ready for analysis: {uploaded_file.name}")

            # Step 3: Generate content with the video
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model=self.model,
                    contents=[uploaded_file, request.prompt],
                )
            )

            # Extract text — response.text can be None if blocked or empty
            analysis_text = response.text
            if not analysis_text:
                # Try to extract from candidates directly
                print(f"⚠️ response.text is None, attempting fallback extraction...")
                print(f"   response candidates: {response.candidates}")
                if response.candidates:
                    parts = response.candidates[0].content.parts
                    analysis_text = "".join(p.text for p in parts if p.text)
            
            if not analysis_text:
                raise Exception(
                    f"Gemini returned empty response. "
                    f"Finish reason: {response.candidates[0].finish_reason if response.candidates else 'N/A'}, "
                    f"Safety: {response.candidates[0].safety_ratings if response.candidates else 'N/A'}"
                )

            print(f"✅ Video analysis complete ({len(analysis_text)} chars)")

            return analysis_text

        except Exception as e:
            print(f"❌ Video analysis failed: {str(e)}")
            raise

        finally:
            # Step 4: Clean up uploaded file from Gemini
            if uploaded_file and uploaded_file.name:
                try:
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(
                        None,
                        lambda: self.client.files.delete(name=uploaded_file.name)
                    )
                    print(f"🗑️ Cleaned up uploaded file: {uploaded_file.name}")
                except Exception as cleanup_err:
                    print(f"⚠️ Failed to clean up file: {cleanup_err}")

    async def close(self) -> None:
        """Release resources."""
        pass
