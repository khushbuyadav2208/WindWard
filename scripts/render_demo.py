"""Assemble the actual recorded UI tour and narration into an uploadable MP4."""
import json
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'artifacts/demo'
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
scenes = json.loads((OUT/'recording-timeline.json').read_text(encoding='utf-8'))
total = sum(s['duration_seconds'] for s in scenes)
parts = {str(p): sum(s['duration_seconds'] for s in scenes if s['part'] == p) for p in (1,2)}
assert total <= 600 and max(parts.values()) <= 300, 'Challenge duration exceeded'


def run(args):
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)


def timestamp(value):
    milliseconds = round(value * 1000)
    hours, milliseconds = divmod(milliseconds, 3600000)
    minutes, milliseconds = divmod(milliseconds, 60000)
    seconds, milliseconds = divmod(milliseconds, 1000)
    return f'{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}'


captions = []
elapsed = 0
caption_index = 1
for scene in scenes:
    duration = scene['duration_seconds']
    output = OUT/f'segment-{scene["id"]}.mp4'
    run(['-ss', str(scene['video_start']), '-i', str(OUT/'walkthrough.webm'),
         '-i', str(OUT/f'{scene["id"]}.wav'), '-t', str(duration),
         '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'fast',
         '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-b:a', '128k',
         '-af', 'adelay=350|350,apad', '-movflags', '+faststart', str(output)])
    # Sidecar captions, distributed over narration duration. Speech timings are
    # approximate; the actual audio remains the source of narration.
    words = scene['text'].split()
    chunks = [' '.join(words[i:i+14]) for i in range(0,len(words),14)]
    for i, chunk in enumerate(chunks):
        begin = elapsed + .35 + scene['audio_seconds'] * i/len(chunks)
        end = elapsed + .35 + scene['audio_seconds'] * (i+1)/len(chunks)
        captions.append(f'{caption_index}\n{timestamp(begin)} --> {timestamp(end)}\n{chunk}\n')
        caption_index += 1
    scene['final_start_seconds'] = elapsed
    elapsed += duration
    print(f'Rendered scene {scene["id"]}: {scene["title"]}', flush=True)

concat = OUT/'segments.txt'
concat.write_text('\n'.join(f"file 'segment-{s['id']}.mp4'" for s in scenes), encoding='utf-8')
srt = OUT/'windward-demo.srt'
srt.write_text('\n'.join(captions),encoding='utf-8')
run(['-f','concat','-safe','0','-i',str(concat),'-i',str(srt),'-map','0:v','-map','0:a','-map','1:0',
     '-c:v','copy','-c:a','copy','-c:s','mov_text','-metadata:s:s:0','language=eng',
     '-metadata','title=Windward: Customer demo and technical review',
     '-movflags','+faststart',str(OUT/'windward-demo.mp4')])
manifest = {'video':'windward-demo.mp4','duration_seconds':total,'parts_seconds':parts,
            'part_2_start_seconds':parts['1'],'resolution':'1440x900','narration':'Windows Microsoft Zira speech synthesis',
            'captions':'windward-demo.srt (approximate speech timing); embedded English subtitle track',
            'publication':'Local artifact only; unlisted YouTube upload pending account access.',
            'scenes':[{'id':s['id'],'part':s['part'],'title':s['title'],'start_seconds':s['final_start_seconds'],'duration_seconds':s['duration_seconds']} for s in scenes]}
(OUT/'video-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest,indent=2))
from verify_demo import verify
verify()
