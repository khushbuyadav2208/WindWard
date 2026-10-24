"""Persisted cache with single-flight refresh and bundled real-data fallback."""
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from app.config.settings import Settings
from app.services.elexon import fetch_all, UpstreamError
from app.services.analytics import normalize


class DataUnavailable(Exception):
    pass


class Repository:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._lock = asyncio.Lock()
        self._data = None
        self.last_refresh_error: str | None = None

    def load(self, payload: dict, source: str) -> dict:
        if not isinstance(payload, dict) or not isinstance(payload.get('actuals'), list) or not isinstance(payload.get('forecasts'), list):
            raise ValueError('Dataset shape is invalid')
        fetched_at = datetime.fromisoformat(payload['fetched_at'].replace('Z', '+00:00'))
        if fetched_at.tzinfo is None:
            raise ValueError('Missing cache timestamp timezone')
        actuals, aq = normalize(payload['actuals'], False)
        forecasts, fq = normalize(payload['forecasts'], True)
        if not actuals or not forecasts:
            raise ValueError('No valid January actuals or forecasts')
        return {'actuals': actuals, 'forecasts': forecasts, 'fetched_at': fetched_at,
                'source': source, 'provenance': payload.get('provenance', {}),
                'quality': {'actuals': aq, 'forecasts': fq}}

    async def get(self) -> dict:
        if self._data:
            return self._data
        async with self._lock:
            if self._data:
                return self._data
            # Prefer the most recently fetched valid persisted dataset.
            candidates = []
            for path, source in [(self.settings.cache_path, 'persisted_cache'), (self.settings.snapshot_path, 'bundled_elexon_snapshot')]:
                try:
                    with Path(path).open(encoding='utf-8') as handle:
                        candidates.append(self.load(json.load(handle), source))
                except (OSError, ValueError, KeyError, TypeError):
                    continue
            if candidates:
                self._data = max(candidates, key=lambda d: d['fetched_at'])
                return self._data
            return await self._refresh()

    async def refresh(self) -> dict:
        if self._lock.locked():
            raise DataUnavailable('A data refresh is already in progress. Please wait and reload.')
        async with self._lock:
            return await self._refresh()

    async def _refresh(self) -> dict:
        try:
            payload = await fetch_all(self.settings.elexon_timeout_seconds)
            candidate = self.load(payload, 'elexon_live_refresh')
            if self._data:
                # Do not replace a good dataset with a truncated upstream result.
                old_counts = [len(self._data[k]) for k in ('actuals', 'forecasts')]
                if any(len(candidate[k]) < count * .95 for k, count in zip(('actuals', 'forecasts'), old_counts)):
                    raise ValueError('Refresh returned materially less data than the current cache')
            try:
                path = self.settings.cache_path
                path.parent.mkdir(parents=True, exist_ok=True)
                temp = path.with_suffix('.tmp')
                temp.write_text(json.dumps(payload, separators=(',', ':')), encoding='utf-8')
                os.replace(temp, path)
            except OSError:
                # Read-only deployments can still serve this process's cache.
                candidate['persistence_warning'] = 'Refreshed data is cached in memory only on this host.'
            self._data = candidate
            self.last_refresh_error = None
            return candidate
        except (UpstreamError, ValueError, KeyError) as exc:
            self.last_refresh_error = str(exc)
            raise DataUnavailable(str(exc)) from exc

    def metadata(self, data: dict) -> dict:
        age = (datetime.now(timezone.utc) - data['fetched_at']).total_seconds()
        return {'fetched_at': data['fetched_at'], 'cache_source': data['source'],
                'cache_age_seconds': max(0, round(age)), 'stale': age > self.settings.cache_ttl_seconds,
                'refresh_error': self.last_refresh_error, 'provenance': data['provenance'],
                'validation': data['quality'], 'persistence_warning': data.get('persistence_warning')}
