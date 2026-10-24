"""Validate actual MP4 streams/duration and update the local media manifest."""
import json
import re
import subprocess
from pathlib import Path
import imageio_ffmpeg

OUT = Path(__file__).resolve().parents[1]/'artifacts/demo'
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()


def probe(path):
    result = subprocess.run([ffmpeg,'-hide_banner','-i',str(path)],capture_output=True,text=True)
    match = re.search(r'Duration: (\d+):(\d+):(\d+(?:\.\d+)?)',result.stderr)
    if not match:
        raise ValueError(f'Cannot inspect media: {path.name}')
    hours, minutes, seconds = map(float,match.groups())
    return hours*3600 + minutes*60 + seconds,result.stderr


def verify():
    path = OUT/'windward-demo.mp4'
    duration, info = probe(path)
    assert 'Video: h264' in info and 'Audio: aac' in info and 'Subtitle: mov_text' in info
    assert duration <= 600
    manifest_path = OUT/'video-manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    manifest['planned_duration_seconds'] = manifest['duration_seconds']
    manifest['duration_seconds'] = duration
    actual_parts = {'1':0.,'2':0.}
    elapsed = 0.
    for scene in manifest['scenes']:
        actual, _ = probe(OUT/f'segment-{scene["id"]}.mp4')
        scene['actual_start_seconds'] = elapsed
        scene['actual_duration_seconds'] = actual
        actual_parts[str(scene['part'])] += actual
        elapsed += actual
    assert max(actual_parts.values()) <= 300
    manifest['parts_seconds'] = actual_parts
    manifest['part_2_start_seconds'] = actual_parts['1']
    # Decode the entire produced file: catches corrupt frames or audio packets.
    subprocess.run([ffmpeg,'-v','error','-i',str(path),'-f','null','-'],check=True,capture_output=True)
    manifest['verified'] = {'streams':'H.264 video, AAC audio, English mov_text subtitles',
                            'full_decode':'passed','size_bytes':path.stat().st_size}
    manifest_path.write_text(json.dumps(manifest,indent=2),encoding='utf-8')
    print(json.dumps({k:manifest[k] for k in ('duration_seconds','parts_seconds','verified')},indent=2))


if __name__ == '__main__':
    verify()
