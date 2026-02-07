from .schemas import Timeline, Track, VideoClip, AudioClip, RenderConfig
from .capcut_builder import CapCutDraftBuilder
from .direct_renderer import DirectVideoRenderer
from .ai_video_engine import AIVideoEngine
import os
import shutil

class VideoManager:
    def __init__(self, output_base_dir: str = "generated_videos"):
        self.output_base_dir = output_base_dir
        os.makedirs(output_base_dir, exist_ok=True)
        # Lazy load heavy AI engine to save startup time
        self.ai_engine = None 

    def get_ai_engine(self):
        if not self.ai_engine:
             # Initialize with default Model or config
             self.ai_engine = AIVideoEngine()
        return self.ai_engine

    def create_timeline_from_script(self, project_id: str, script_sections: list, images: list, audio_files: list) -> Timeline:
        """
        Helper to convert simple list of images/script into a valid Timeline structure.
        Assumes 1 image per script section.
        """
        timeline = Timeline(project_id=project_id)
        
        # Create Main Video Track
        video_track = Track(type="video")
        # Create Main Audio Track (Voiceover)
        voice_track = Track(type="audio")
        
        # Simple Logic: Pair image[i] with audio[i] duration
        for i, section in enumerate(script_sections):
            # Duration logic: get from audio file duration if available, else estimate
            duration = section.get("duration", 5.0) 
            
            img_path = images[i] if i < len(images) else images[-1] # Fallback to last image
            audio_path = audio_files[i] if i < len(audio_files) else None
            
            # Add Video Clip
            video_clip = VideoClip(
                source_path=img_path,
                duration=duration,
                type="image"
            )
            video_track.add_clip(video_clip)
            
            # Add Voice Clip
            if audio_path and os.path.exists(audio_path):
                 audio_clip = AudioClip(
                    source_path=audio_path,
                    type="voice",
                    volume=1.0,
                    duration=duration 
                 )
                 voice_track.add_clip(audio_clip)

        timeline.video_tracks.append(video_track)
        timeline.audio_tracks.append(voice_track)
        timeline.calculate_duration()
        return timeline

    def process_video_generation(self, timeline: Timeline, mode: str = "capcut", ai_enhanced: bool = False) -> str:
        """
        Main entry point.
        mode: 'capcut' or 'direct'
        Returns: Path to output file (zip or mp4)
        """
        
        # 1. AI Enhancement Phase (Optional)
        if ai_enhanced and mode == "direct":
            ai_engine = self.get_ai_engine()
            for track in timeline.video_tracks:
                for clip in track.clips:
                    if clip.type == "image":
                         # Generate Video from Image
                         print(f"Generating AI Video for clip: {clip.id}")
                         video_path = os.path.join(self.output_base_dir, f"{clip.id}_ai.mp4")
                         try:
                            ai_engine.generate_video(clip.source_path, video_path)
                            # Update Clip to be video type
                            clip.type = "video"
                            clip.source_path = video_path
                            clip.ai_generated = True
                         except Exception as e:
                             print(f"AI Generation failed for clip {clip.id}: {e}")
                             # Fallback to image
            
            # Unload to save VRAM for rendering
            ai_engine.unload_pipeline() 

        # 2. Rendering Phase
        project_dir = os.path.join(self.output_base_dir, timeline.project_id)
        os.makedirs(project_dir, exist_ok=True)

        if mode == "capcut":
            builder = CapCutDraftBuilder(timeline, project_dir)
            builder.build()
            
            # Zip the folder
            shutil.make_archive(project_dir, 'zip', project_dir)
            return f"{project_dir}.zip"
            
        elif mode == "direct":
            renderer = DirectVideoRenderer(project_dir)
            config = RenderConfig(use_ai_generation=ai_enhanced)
            return renderer.render(timeline, config)
            
        else:
            raise ValueError(f"Unknown mode: {mode}")
