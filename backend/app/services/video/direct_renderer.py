import os
from typing import List, Optional
try:
    from moviepy.editor import (
        VideoFileClip, ImageClip, TextClip, CompositeVideoClip, 
        AudioFileClip, CompositeAudioClip, concatenate_videoclips, vfx
    )
    MOVIEPY_AVAILABLE = True
except ImportError:
    MOVIEPY_AVAILABLE = False
    print("Warning: moviepy not installed. Direct rendering will not work on backend unless installed.")

from .schemas import Timeline, VideoClip as SchemaVideoClip, AudioClip as SchemaAudioClip, RenderConfig

class DirectVideoRenderer:
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        if not MOVIEPY_AVAILABLE:
            raise ImportError("MoviePy is required for direct rendering. Please install it with `pip install moviepy`.")

    def _apply_ken_burns(self, clip, zoom_ratio=1.1):
        # Simple Ken Burns effect: Zoom in slightly over duration
        # This is a basic implementation; moviepy requires custom transformation for smooth zoom
        # For now, we just resize to fit width (keeping simple) or we can implement a sliding crop
        w, h = clip.size
        # Expanding duration for safety
        return clip.resize(lambda t: 1 + (zoom_ratio - 1) * t / clip.duration)

    def render(self, timeline: Timeline, config: RenderConfig = RenderConfig()) -> str:
        """
        Renders the timeline to an MP4 file.
        Returns the absolute path to the generated file.
        """
        video_clips = []
        
        # 1. Process Video Track (Base Layer)
        # Assuming single video track for MVP
        main_track = timeline.video_tracks[0] if timeline.video_tracks else None
        
        if not main_track:
            raise ValueError("No video track found in timeline")

        for clip_data in main_track.clips:
            if clip_data.type == "image":
                # Create Image Clip
                img_clip = ImageClip(clip_data.source_path).set_duration(clip_data.duration)
                
                # Apply Ken Burns if requested
                if clip_data.ken_burns:
                    img_clip = self._apply_ken_burns(img_clip)
                else:
                    # Static resize to 1080p (or config resolution)
                    # For simplicity, we are not handling aspect ratio cropping here yet
                    img_clip = img_clip.resize(height=1080) 
                    
                video_clips.append(img_clip)
                
            elif clip_data.type == "video":
                # Create Video Clip
                vid_clip = VideoFileClip(clip_data.source_path)
                # Trim if needed? Currently assuming source matches desired duration or loops
                if clip_data.duration > 0:
                     vid_clip = vid_clip.subclip(0, clip_data.duration)
                video_clips.append(vid_clip)

        # Concatenate main video
        final_video = concatenate_videoclips(video_clips, method="compose")

        # 2. Process Audio
        audio_clips = []
        
        # Voiceover Track
        for track in timeline.audio_tracks:
            for clip_data in track.clips:
                if os.path.exists(clip_data.source_path):
                    audio = AudioFileClip(clip_data.source_path)
                    audio = audio.set_start(clip_data.start_time).volumex(clip_data.volume)
                    audio_clips.append(audio)
        
        if audio_clips:
            final_audio = CompositeAudioClip(audio_clips)
            # Ensure audio doesn't exceed video
            final_audio = final_audio.set_duration(min(final_audio.duration, final_video.duration))
            final_video = final_video.set_audio(final_audio)

        # 3. Write Output
        output_filename = f"render_{timeline.project_id}.mp4"
        output_path = os.path.join(self.output_dir, output_filename)
        
        # Use 'libx264' for compatibility
        final_video.write_videofile(
            output_path, 
            fps=config.fps, 
            codec='libx264', 
            audio_codec='aac',
            threads=4,
            logger=None # Supress verbose logging
        )
        
        return output_path
