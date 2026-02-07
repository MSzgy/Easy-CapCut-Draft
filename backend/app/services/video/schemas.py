from typing import List, Optional, Union, Dict, Literal
from pydantic import BaseModel, Field
from uuid import uuid4

class ClipBase(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    start_time: float = 0.0 # Seconds
    duration: float = 0.0 # Seconds
    
    @property
    def end_time(self) -> float:
        return self.start_time + self.duration

class VideoClip(ClipBase):
    type: Literal["video", "image"] = "image"
    source_path: str
    transition_in: Optional[str] = None
    transition_out: Optional[str] = None
    # Effects
    ken_burns: bool = False
    ai_generated: bool = False

class AudioClip(ClipBase):
    type: Literal["music", "voice", "sfx"] = "voice"
    source_path: str
    volume: float = 1.0 # 0.0 to 1.0
    fade_in: float = 0.0
    fade_out: float = 0.0

class TextClip(ClipBase):
    content: str
    style: str = "default"
    position: tuple = (0.5, 0.8) # (x, y) normalized

class Track(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    type: Literal["video", "audio", "text"]
    clips: List[Union[VideoClip, AudioClip, TextClip]] = []
    
    def add_clip(self, clip: Union[VideoClip, AudioClip, TextClip]):
        # Simple Logic: append to end
        if self.clips:
            last_clip = self.clips[-1]
            clip.start_time = last_clip.end_time
        else:
            clip.start_time = 0.0
        self.clips.append(clip)

class Timeline(BaseModel):
    project_id: str
    video_tracks: List[Track] = []
    audio_tracks: List[Track] = []
    text_tracks: List[Track] = []
    total_duration: float = 0.0
    
    def calculate_duration(self):
        max_duration = 0.0
        for track in self.video_tracks + self.audio_tracks + self.text_tracks:
            if track.clips:
                max_duration = max(max_duration, track.clips[-1].end_time)
        self.total_duration = max_duration

class RenderConfig(BaseModel):
    resolution: Literal["1080p", "4k", "720p"] = "1080p"
    aspect_ratio: Literal["16:9", "9:16", "1:1"] = "16:9"
    fps: int = 30
    use_ai_generation: bool = False # If True, convert images to video using AI I2V
