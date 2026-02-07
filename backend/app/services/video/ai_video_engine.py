import torch
import os
from diffusers import StableVideoDiffusionPipeline
from diffusers.utils import load_image, export_to_video
from typing import Optional

class AIVideoEngine:
    def __init__(self, model_id: str = "stabilityai/stable-video-diffusion-img2vid-xt", device: str = "cuda"):
        self.model_id = model_id
        self.device = device
        self.pipeline = None
        
    def load_pipeline(self):
        """Loads the pipeline into memory. This is heavy operations."""
        if self.pipeline is None:
            print(f"Loading AI Video Model: {self.model_id}...")
            try:
                self.pipeline = StableVideoDiffusionPipeline.from_pretrained(
                    self.model_id, 
                    torch_dtype=torch.float16, 
                    variant="fp16"
                )
                if self.device == "cuda":
                    self.pipeline.enable_model_cpu_offload()
                elif self.device == "mps":
                     # MPS support is experimental for video generation depending on Diffusers version
                     self.pipeline.to("mps")
            except Exception as e:
                print(f"Error loading AI Video Model: {e}")
                raise

    def generate_video(self, image_path: str, output_path: str, num_frames: int = 25, fps: int = 7) -> str:
        """
        Generates a video from a single image.
        Returns the path to the generated video file.
        """
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Image not found: {image_path}")

        self.load_pipeline()
        
        image = load_image(image_path)
        image = image.resize((1024, 576)) # SVD resolution constraint (often 1024x576)

        generator = torch.manual_seed(42)
        frames = self.pipeline(image, decode_chunk_size=8, generator=generator, num_frames=num_frames).frames[0]
        
        export_to_video(frames, output_path, fps=fps)
        return output_path

    def unload_pipeline(self):
        """Unload pipeline to free up VRAM/RAM"""
        if self.pipeline:
            del self.pipeline
            torch.cuda.empty_cache() if torch.cuda.is_available() else None
            self.pipeline = None
