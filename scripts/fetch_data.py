"""Fetch a reproducible, real Elexon snapshot. Run from the repository root."""
import asyncio
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from app.services.elexon import fetch_all
from app.services.repository import Repository
from app.config.settings import settings


async def main():
    payload = await fetch_all(settings.elexon_timeout_seconds)
    validated = Repository(settings).load(payload, 'snapshot_validation')
    path = settings.snapshot_path
    content = json.dumps(payload, separators=(',', ':'))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')
    manifest = {'file': path.name, 'sha256': hashlib.sha256(content.encode()).hexdigest(),
                'fetched_at': payload['fetched_at'], 'provenance': payload['provenance'],
                'valid_actual_records': len(validated['actuals']),
                'valid_forecast_records': len(validated['forecasts']), 'validation': validated['quality']}
    path.with_suffix('.manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    asyncio.run(main())
