"""Single-origin production entrypoint for Vercel or a local production run."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'backend'))
from app.main import app
from fastapi.staticfiles import StaticFiles

frontend = ROOT / 'frontend' / 'dist'
if frontend.exists():
    app.mount('/', StaticFiles(directory=frontend, html=True), name='frontend')
