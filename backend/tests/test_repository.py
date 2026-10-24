import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock
import pytest
from app.config.settings import Settings
from app.services.repository import Repository, DataUnavailable
from app.services.elexon import UpstreamError, fetch_window
import httpx


def test_failed_refresh_preserves_last_good_snapshot(monkeypatch, tmp_path):
    repo = Repository(Settings(cache_path=tmp_path/'cache.json'))
    async def scenario():
        previous = await repo.get()
        monkeypatch.setattr('app.services.repository.fetch_all', AsyncMock(side_effect=UpstreamError('Elexon timeout')))
        with pytest.raises(DataUnavailable):
            await repo.refresh()
        assert await repo.get() is previous
        assert repo.last_refresh_error == 'Elexon timeout'
    asyncio.run(scenario())


def test_invalid_cache_falls_back_to_real_bundled_snapshot(tmp_path):
    path = tmp_path/'cache.json'
    path.write_text('{malformed')
    repo = Repository(Settings(cache_path=path))
    data = asyncio.run(repo.get())
    assert data['source'] == 'bundled_elexon_snapshot'


def test_empty_dataset_is_rejected():
    repo = Repository(Settings())
    with pytest.raises(ValueError):
        repo.load({'actuals': [], 'forecasts': [], 'fetched_at': datetime.now(timezone.utc).isoformat()}, 'test')


def test_upstream_shape_rejected_and_non_wind_filtered():
    async def scenario():
        now = datetime.now(timezone.utc)
        transport = httpx.MockTransport(lambda request: httpx.Response(200, json={'unexpected': True}))
        async with httpx.AsyncClient(transport=transport) as client:
            with pytest.raises(UpstreamError):
                await fetch_window(client, 'WINDFOR', now, now)
        transport = httpx.MockTransport(lambda request: httpx.Response(200, json=[{'fuelType':'GAS'}, {'fuelType':'WIND', 'generation':1}]))
        async with httpx.AsyncClient(transport=transport) as client:
            assert await fetch_window(client, 'FUELHH', now, now) == [{'fuelType':'WIND', 'generation':1}]
    asyncio.run(scenario())
