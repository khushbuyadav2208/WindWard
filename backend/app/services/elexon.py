"""The sole business-data adapter: bounded, retryable Elexon stream requests."""
import asyncio
from datetime import datetime, timedelta, timezone
import httpx

BASE_URL = 'https://data.elexon.co.uk/bmrs/api/v1'


class UpstreamError(Exception):
    pass


async def fetch_window(client: httpx.AsyncClient, dataset: str, start: datetime,
                       end: datetime) -> list[dict]:
    params = {'publishDateTimeFrom': start.isoformat(), 'publishDateTimeTo': end.isoformat()}
    for attempt in range(3):
        try:
            response = await client.get(f'{BASE_URL}/datasets/{dataset}/stream', params=params)
            response.raise_for_status()
            payload = response.json()
            if not isinstance(payload, list) or any(not isinstance(r, dict) for r in payload):
                raise UpstreamError('Elexon returned an unexpected response format.')
            return [r for r in payload if dataset != 'FUELHH' or r.get('fuelType') == 'WIND']
        except (httpx.HTTPError, ValueError) as exc:
            if attempt == 2:
                raise UpstreamError(f'Elexon {dataset} is temporarily unavailable. Please retry later.') from exc
            await asyncio.sleep(0.5 * (2 ** attempt))
    raise UpstreamError('Elexon request failed.')


async def fetch_all(timeout: float = 40) -> dict:
    # A week of earlier publications avoids assuming all useful vintages were
    # published on D-1. Feb 3 covers publication lag for Feb 1 actuals.
    start = datetime(2025, 12, 24, tzinfo=timezone.utc)
    end = datetime(2026, 2, 3, tzinfo=timezone.utc)
    semaphore = asyncio.Semaphore(4)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        async def fetch(dataset, left, right):
            async with semaphore:
                return dataset, await fetch_window(client, dataset, left, right)
        tasks = []
        left = start
        while left < end:
            right = min(left + timedelta(days=3), end)
            for dataset in ('FUELHH', 'WINDFOR'):
                tasks.append(fetch(dataset, left, right))
            left = right
        result = {'actuals': [], 'forecasts': []}
        for dataset, records in await asyncio.gather(*tasks):
            result['actuals' if dataset == 'FUELHH' else 'forecasts'].extend(records)
    result['fetched_at'] = datetime.now(timezone.utc).isoformat()
    result['provenance'] = {
        'provider': 'Elexon Insights / BMRS', 'base_url': BASE_URL,
        'datasets': ['FUELHH', 'WINDFOR'], 'fuel_type': 'WIND',
        'publication_window_start': start.isoformat(), 'publication_window_end': end.isoformat(),
        'note': 'Unmodified WIND records from Elexon stream APIs; overlapping window boundaries are deduplicated during validation.'
    }
    return result
