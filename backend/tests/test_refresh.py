from unittest.mock import AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.api import routes
from app.services.repository import DataUnavailable

client = TestClient(app)


def test_refresh_token_required_and_success_metadata(monkeypatch):
    monkeypatch.setattr(routes.settings, 'refresh_token', 'test-only-secret')
    assert client.post('/api/refresh').status_code == 403
    assert client.post('/api/refresh', headers={'X-Refresh-Token': 'wrong'}).status_code == 403
    data = __import__('asyncio').run(routes.repository.get())
    refresh = AsyncMock(return_value=data)
    monkeypatch.setattr(routes.repository, 'refresh', refresh)
    response = client.post('/api/refresh', headers={'X-Refresh-Token': 'test-only-secret'})
    assert response.status_code == 200
    assert 'fetched_at' in response.json()
    refresh.assert_awaited_once()


def test_failed_upstream_refresh_returns_safe_503(monkeypatch):
    monkeypatch.setattr(routes.settings, 'refresh_token', '')
    monkeypatch.setattr(routes.repository, 'refresh', AsyncMock(side_effect=DataUnavailable('Elexon is temporarily unavailable.')))
    response = client.post('/api/refresh')
    assert response.status_code == 503
    assert response.json() == {'detail': 'Elexon is temporarily unavailable.'}
