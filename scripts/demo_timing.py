import json
import wave
from pathlib import Path

root = Path(__file__).resolve().parents[1]
scenes = json.loads((root/'docs/demo-scenes.json').read_text(encoding='utf-8'))
total = 0
parts = {1: 0, 2: 0}
for scene in scenes:
    with wave.open(str(root/'artifacts/demo'/f'{scene["id"]}.wav')) as audio:
        seconds = audio.getnframes()/audio.getframerate()
    scene['audio_seconds'] = seconds
    scene['duration_seconds'] = seconds + 3
    total += scene['duration_seconds']
    parts[scene['part']] += scene['duration_seconds']
if total > 590 or max(parts.values()) > 295:
    raise SystemExit(f'Demo exceeds challenge time budget: {total=}, {parts=}')
(root/'artifacts/demo/timing.json').write_text(json.dumps(scenes, indent=2), encoding='utf-8')
print(json.dumps({'total_seconds': total, 'parts_seconds': parts}, indent=2))
