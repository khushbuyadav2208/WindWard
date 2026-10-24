"""Package only reviewable project source, excluding runtime and private files."""
from pathlib import Path
import os
import zipfile

root = Path(__file__).resolve().parents[1]
excluded = {'.git','.venv','node_modules','dist','__pycache__','.pytest_cache','.vercel','artifacts','test-results','playwright-report'}


def source_files():
    for directory, children, files in os.walk(root):
        children[:] = sorted(d for d in children if d not in excluded)
        for name in sorted(files):
            path = Path(directory)/name
            if path.suffix in {'.docx','.log','.pyc','.mp4','.webm','.tsbuildinfo'}:
                continue
            if (name.startswith('.env') and name != '.env.example') or name == 'cache.json' or path.suffix == '.tmp':
                continue
            yield path


if __name__ == '__main__':
    out = root/'artifacts/windward-source.zip'
    out.parent.mkdir(exist_ok=True)
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        for path in source_files():
            archive.write(path,path.relative_to(root).as_posix())
    print(f'Packaged {out.name}: {out.stat().st_size:,} bytes')
