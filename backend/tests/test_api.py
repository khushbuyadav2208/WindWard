from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_and_security_headers():
    response = client.get('/api/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'
    assert response.headers['X-Content-Type-Options'] == 'nosniff'


def test_real_snapshot_end_to_end_without_network():
    data = client.get('/api/dashboard').json()
    assert data['metrics']['expected_count'] == 31 * 48
    assert data['metrics']['count'] == 31 * 48
    assert data['metrics']['mae_mw'] > 0
    assert data['meta']['basis'] == 'decision'
    for row in data['rows']:
        assert row['publish_time'] <= row['decision_time']
        assert row['error_mw'] == row['forecast_mw'] - row['actual_mw']
    assert data['rows'][0]['delivery_time'].startswith('2026-01-02')
    assert data['rows'][-1]['delivery_time'].startswith('2026-02-01')


def test_filters_apply_to_metrics_charts_and_export():
    query = '?start=2026-01-05&end=2026-01-05&basis=delivery&hour_from=6&hour_to=8&cutoff=09:00'
    data = client.get('/api/dashboard' + query).json()
    assert len(data['rows']) == data['metrics']['expected_count'] == 4
    assert len(data['daily']) == 1 and len(data['time_of_day']) == 4
    assert data['meta']['cutoff'] == '09:00'
    export = client.get('/api/export' + query)
    assert export.status_code == 200
    assert len(export.text.strip().splitlines()) == 5
    assert export.headers['x-decision-cutoff'] == '09:00'


def test_invalid_periods_hours_cutoff():
    for query in ['start=2025-12-01', 'end=2026-02-01', 'start=2026-01-20&end=2026-01-01',
                  'hour_from=20&hour_to=5', 'cutoff=25:00', 'basis=unknown']:
        assert client.get('/api/dashboard?' + query).status_code == 422


def test_read_endpoints():
    for endpoint in ['actuals','forecasts','forecast-comparison','accuracy','summary']:
        response = client.get('/api/' + endpoint + '?start=2026-01-01&end=2026-01-01')
        assert response.status_code == 200


def test_refresh_does_not_allow_untrusted_proxy_requests():
    response = client.post('/api/refresh', headers={'x-forwarded-for':'203.0.113.1'})
    assert response.status_code == 403
