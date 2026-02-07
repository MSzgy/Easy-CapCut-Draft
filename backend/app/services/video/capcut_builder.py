import json
import uuid
import os
import shutil
import time
from typing import Dict, List, Any
from .schemas import Timeline, VideoClip, AudioClip, TextClip

class CapCutDraftBuilder:
    def __init__(self, timeline: Timeline, output_dir: str):
        self.timeline = timeline
        self.output_dir = output_dir
        self.draft_content = {
            "materials": {
                "videos": [],
                "audios": [],
                "texts": [],
                "transitions": [],
                "effects": [],
            },
            "tracks": [],
            "id": str(uuid.uuid4()),
            "version": 3, # CapCut version compatibility
            "canvas_config": {
                "width": 1920,
                "height": 1080,
                "ratio": "16:9"
            }
        }
        self.assets_to_copy = []

    def _to_microseconds(self, seconds: float) -> int:
        return int(seconds * 1000000)

    def _add_material(self, type: str, path: str, duration: int, width: int = 1920, height: int = 1080) -> str:
        material_id = str(uuid.uuid4())
        filename = os.path.basename(path)
        
        # Prepare for file copy
        self.assets_to_copy.append((path, filename))
        
        if type == "video":
            self.draft_content["materials"]["videos"].append({
                "id": material_id,
                "path": filename, # Relative path in draft folder
                "duration": duration,
                "type": "video", # CapCut treats images as videos often, or specific type
                "width": width,
                "height": height
            })
        elif type == "photo":
             self.draft_content["materials"]["videos"].append({
                "id": material_id,
                "path": filename,
                "duration": duration,
                "type": "photo",
                "width": width,
                "height": height
            })
        elif type == "audio":
            self.draft_content["materials"]["audios"].append({
                "id": material_id,
                "path": filename,
                "duration": duration,
                "type": "extract_music"
            })
            
        return material_id

    def build(self):
        # 1. Process Video Tracks
        for track in self.timeline.video_tracks:
            segments = []
            for clip in track.clips:
                duration_us = self._to_microseconds(clip.duration)
                material_id = self._add_material(
                    "photo" if clip.type == "image" else "video",
                    clip.source_path,
                    duration_us
                )
                
                segment_id = str(uuid.uuid4())
                segments.append({
                    "id": segment_id,
                    "material_id": material_id,
                    "target_timerange": {
                        "start": self._to_microseconds(clip.start_time),
                        "duration": duration_us
                    },
                    "source_timerange": {
                        "start": 0,
                        "duration": duration_us
                    }
                })
            
            self.draft_content["tracks"].append({
                "id": str(uuid.uuid4()),
                "type": "video",
                "segments": segments
            })

        # 2. Process Audio Tracks
        for track in self.timeline.audio_tracks:
            segments = []
            for clip in track.clips:
                duration_us = self._to_microseconds(clip.duration)
                material_id = self._add_material(
                    "audio",
                    clip.source_path,
                    duration_us
                )
                
                segment_id = str(uuid.uuid4())
                segments.append({
                    "id": segment_id,
                    "material_id": material_id,
                    "target_timerange": {
                        "start": self._to_microseconds(clip.start_time),
                        "duration": duration_us
                    },
                    "source_timerange": {
                        "start": 0,
                        "duration": duration_us
                    }
                })
            
            self.draft_content["tracks"].append({
                "id": str(uuid.uuid4()),
                "type": "audio",
                "segments": segments
            })
            
        # 3. Write draft_content.json
        with open(os.path.join(self.output_dir, "draft_content.json"), "w") as f:
            json.dump(self.draft_content, f, indent=2)

        # 4. Write draft_info.json (Metadata)
        draft_info = {
            "draft_id": self.draft_content["id"],
            "draft_name": "AI Generated Draft",
            "draft_cover": "",
            "draft_fold_path": self.output_dir,
            "tm_draft_create": time.time(),
            "tm_draft_modified": time.time()
        }
        with open(os.path.join(self.output_dir, "draft_info.json"), "w") as f:
            json.dump(draft_info, f, indent=2)
            
        # 5. Copy Assets
        for source, filename in self.assets_to_copy:
            try:
                if os.path.exists(source):
                     shutil.copy2(source, os.path.join(self.output_dir, filename))
            except Exception as e:
                print(f"Error copying asset {source}: {e}")
