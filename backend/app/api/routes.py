from datetime import date
from typing import Annotated, Literal
import csv
import io
import secrets
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import Response
from app.config.settings import settings
from app.models.schemas import AnalysisResponse, Comparison
from app.services.analytics import compare, metrics, breakdown, distribution, insights
from app.services.repository import Repository, DataUnavailable

router = APIRouter(prefix='/api')
repository = Repository(settings)


def filters(
    start: date = date(2026, 1, 1), end: date = date(2026, 1, 31),
    basis: Literal['decision', 'delivery'] = 'decision',
    cutoff: Annotated[str | None, Query(pattern=r'^([01]\d|2[0-3]):[0-5]\d$')] = None,
    hour_from: Annotated[int, Query(ge=0, le=23)] = 0,
    hour_to: Annotated[int, Query(ge=1, le=24)] = 24,
) -> dict:
    if not date(2026, 1, 1) <= start <= end <= date(2026, 1, 31):
        raise HTTPException(422, 'Choose a valid date range within January 2026.')
    if hour_from >= hour_to:
        raise HTTPException(422, 'The end hour must be later than the start hour.')
    return dict(start=start, end=end, basis=basis, cutoff=cutoff or settings.decision_cutoff,
                hour_from=hour_from, hour_to=hour_to)


async def analysis(selected: dict = Depends(filters)) -> AnalysisResponse:
    try:
        data = await repository.get()
    except DataUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    rows = compare(data['actuals'], data['forecasts'], **selected)
    overall = metrics(rows)
    daily = breakdown(rows, 'day')
    latest = next((r for r in reversed(rows) if r.forecast_mw is not None), None)
    missing_actual = sum(r.actual_mw is None for r in rows)
    missing_forecast = sum(r.forecast_mw is None for r in rows)
    meta = {
        **repository.metadata(data), **selected,
        'timezone': 'Europe/London', 'resolution_minutes': 30,
        'source_forecast_resolution': 'Hourly targets held across two half-hours; exact targets preferred within a vintage.',
        'cutoff_assumption': 'Configurable pilot assumption; not an asserted exchange gate-closure rule.',
        'latest': latest.model_dump() if latest else None,
        'delivery_start': rows[0].delivery_time if rows else None,
        'delivery_end': rows[-1].delivery_time if rows else None,
        'quality': {'missing_actual': missing_actual, 'missing_forecast': missing_forecast,
                    'hourly_hold_intervals': sum(r.alignment == 'hourly_hold' for r in rows),
                    'matched_intervals': overall.count, 'expected_intervals': len(rows)},
        'refresh_protected': bool(settings.refresh_token),
    }
    return AnalysisResponse(meta=meta, metrics=overall, rows=rows, daily=daily,
                            time_of_day=breakdown(rows, 'time'), distribution=distribution(rows),
                            insights=insights(rows, overall, daily))


@router.get('/health')
async def health():
    return {'status': 'ok', 'service': 'windward-api', 'analysis_period': '2026-01', 'version': '1.0.0'}


@router.get('/config')
async def config():
    return {'default_cutoff': settings.decision_cutoff, 'timezone': 'Europe/London',
            'default_basis': 'decision', 'analysis_month': '2026-01'}


@router.get('/dashboard', response_model=AnalysisResponse)
async def dashboard(result: AnalysisResponse = Depends(analysis)):
    return result


@router.get('/forecast-comparison')
async def comparison(result: AnalysisResponse = Depends(analysis)):
    return {'meta': result.meta, 'rows': result.rows}


@router.get('/accuracy')
async def accuracy(result: AnalysisResponse = Depends(analysis)):
    return {'meta': result.meta, 'metrics': result.metrics, 'daily': result.daily,
            'time_of_day': result.time_of_day, 'distribution': result.distribution}


@router.get('/summary')
async def summary(result: AnalysisResponse = Depends(analysis)):
    return {'meta': result.meta, 'metrics': result.metrics, 'insights': result.insights}


@router.get('/actuals')
async def actuals(result: AnalysisResponse = Depends(analysis)):
    return {'meta': result.meta, 'rows': [{'delivery_time': r.delivery_time, 'generation_mw': r.actual_mw} for r in result.rows]}


@router.get('/forecasts')
async def forecasts(result: AnalysisResponse = Depends(analysis)):
    return {'meta': result.meta, 'rows': [{
        'delivery_time': r.delivery_time, 'publish_time': r.publish_time, 'decision_time': r.decision_time,
        'generation_mw': r.forecast_mw, 'lead_hours': r.lead_hours, 'alignment': r.alignment,
        'source_target_time': r.source_target_time,
    } for r in result.rows]}


@router.get('/export')
async def export(result: AnalysisResponse = Depends(analysis)):
    output = io.StringIO(newline='')
    fields = list(Comparison.model_fields)
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    for row in result.rows:
        writer.writerow(row.model_dump(mode='json'))
    return Response(output.getvalue(), media_type='text/csv', headers={
        'Content-Disposition': 'attachment; filename="windward-january-2026.csv"',
        'X-Analysis-Basis': result.meta['basis'], 'X-Decision-Cutoff': result.meta['cutoff'],
        'Cache-Control': 'no-store',
    })


@router.post('/refresh')
async def refresh(request: Request, x_refresh_token: str = Header(default='')):
    # Local reviewers can refresh without a secret. Internet deployments require
    # a configured token. Forwarded loopback requests do not bypass protection.
    host = request.client.host if request.client else ''
    loopback = host in ('127.0.0.1', '::1', 'testclient') and 'x-forwarded-for' not in request.headers
    if settings.refresh_token:
        if not secrets.compare_digest(x_refresh_token, settings.refresh_token):
            raise HTTPException(403, 'Enter the refresh token configured by the deployment owner.')
    elif not loopback:
        raise HTTPException(403, 'Live refresh is disabled on this host until REFRESH_TOKEN is configured.')
    try:
        data = await repository.refresh()
    except DataUnavailable as exc:
        raise HTTPException(503, str(exc)) from exc
    return jsonable_encoder(repository.metadata(data))
