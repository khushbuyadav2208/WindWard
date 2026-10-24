"""Pure analytics. Never use post-cutoff publications or fill missing actuals."""
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from math import ceil, sqrt
from statistics import mean
from zoneinfo import ZoneInfo
from pydantic import ValidationError
from app.models.schemas import Comparison, Metrics, SourceRecord

LONDON = ZoneInfo('Europe/London')
UTC = timezone.utc


def normalize(records: list[dict], forecast: bool) -> tuple[list[SourceRecord], dict]:
    quality = {'invalid_records': 0, 'duplicate_records': 0, 'conflicting_records': 0,
               'non_wind_records': 0, 'out_of_scope_records': 0}
    grouped = defaultdict(list)
    for raw in records:
        if not isinstance(raw, dict):
            quality['invalid_records'] += 1
            continue
        if not forecast and raw.get('fuelType') != 'WIND':
            quality['non_wind_records'] += 1
            continue
        try:
            record = SourceRecord.model_validate(raw)
            target = record.start_time.astimezone(UTC)
            if target.minute not in (0, 30) or target.second or target.microsecond:
                raise ValueError('Delivery time is off the settlement grid')
            if not datetime(2026, 1, 1, tzinfo=UTC) <= target < datetime(2026, 2, 2, tzinfo=UTC):
                quality['out_of_scope_records'] += 1
                continue
        except (ValidationError, ValueError, TypeError):
            quality['invalid_records'] += 1
            continue
        grouped[(target, record.publish_time.astimezone(UTC))].append(record)
    valid = []
    for group in grouped.values():
        quality['duplicate_records'] += len(group) - 1
        if len({r.generation for r in group}) > 1:
            quality['conflicting_records'] += 1
            continue  # Same vintage disagrees: quarantine, never pick arbitrarily.
        valid.append(group[0])
    return sorted(valid, key=lambda r: (r.start_time, r.publish_time)), quality


def decision_time(delivery: datetime, cutoff: str) -> datetime:
    hour, minute = map(int, cutoff.split(':'))
    day = delivery.astimezone(LONDON).date() - timedelta(days=1)
    return datetime.combine(day, time(hour, minute), tzinfo=LONDON).astimezone(UTC)


def select_forecast(target: datetime, cutoff: datetime,
                    by_target: dict[datetime, list[SourceRecord]],
                    hourly_publications: set[datetime] | None = None) -> tuple[SourceRecord | None, str]:
    # A source hourly value represents that hour, held constant for the second
    # half-hour. No interpolation and no carry across a missing hour/day.
    candidates = [(r, 'exact') for r in by_target.get(target, []) if r.publish_time <= cutoff]
    if hourly_publications is None:
        all_records = [r for group in by_target.values() for r in group]
        half_hour_publications = {r.publish_time for r in all_records if r.start_time.minute == 30}
        hourly_publications = {r.publish_time for r in all_records} - half_hour_publications
    if target.minute == 30:
        candidates.extend((r, 'hourly_hold') for r in by_target.get(target - timedelta(minutes=30), [])
                          if r.publish_time <= cutoff and r.publish_time in hourly_publications)
    if not candidates:
        return None, 'missing'
    # Select vintage first; within the same vintage prefer an exact target.
    return max(candidates, key=lambda pair: (pair[0].publish_time, pair[1] == 'exact'))


def compare(actuals: list[SourceRecord], forecasts: list[SourceRecord],
            start: date, end: date, basis: str, cutoff: str,
            hour_from: int = 0, hour_to: int = 24) -> list[Comparison]:
    by_target = defaultdict(list)
    for r in forecasts:
        by_target[r.start_time.astimezone(UTC)].append(r)
    hourly_publications = {r.publish_time for r in forecasts} - {
        r.publish_time for r in forecasts if r.start_time.minute == 30}
    actual_by_target = {}
    for r in actuals:
        key = r.start_time.astimezone(UTC)
        if key not in actual_by_target or r.publish_time > actual_by_target[key].publish_time:
            actual_by_target[key] = r
    first = start + timedelta(days=basis == 'decision')
    last = end + timedelta(days=1 + (basis == 'decision'))
    target = datetime.combine(first, time(), tzinfo=LONDON).astimezone(UTC)
    stop = datetime.combine(last, time(), tzinfo=LONDON).astimezone(UTC)
    rows = []
    while target < stop:
        if hour_from <= target.astimezone(LONDON).hour < hour_to:
            cutoff_at = decision_time(target, cutoff)
            record, alignment = select_forecast(target, cutoff_at, by_target, hourly_publications)
            actual = actual_by_target.get(target)
            f = record.generation if record else None
            a = actual.generation if actual else None
            error = f - a if f is not None and a is not None else None
            rows.append(Comparison(
                delivery_time=target, decision_time=cutoff_at,
                publish_time=record.publish_time if record else None,
                source_target_time=record.start_time if record else None,
                forecast_mw=f, actual_mw=a, error_mw=error,
                absolute_error_mw=abs(error) if error is not None else None,
                percentage_error=error / a * 100 if error is not None and a != 0 else None,
                lead_hours=(target - record.publish_time).total_seconds()/3600 if record else None,
                alignment=alignment,
            ))
        target += timedelta(minutes=30)
    return rows


def metrics(rows: list[Comparison]) -> Metrics:
    paired = [r for r in rows if r.error_mw is not None]
    result = Metrics(count=len(paired), expected_count=len(rows),
                     coverage_pct=100 * len(paired) / len(rows) if rows else 0,
                     mean_forecast_mw=mean([r.forecast_mw for r in rows if r.forecast_mw is not None])
                     if any(r.forecast_mw is not None for r in rows) else None,
                     mean_actual_mw=mean([r.actual_mw for r in rows if r.actual_mw is not None])
                     if any(r.actual_mw is not None for r in rows) else None)
    if not paired:
        return result
    errors = [r.error_mw for r in paired]
    absolute = sorted(abs(e) for e in errors)
    percentages = [abs(r.percentage_error) for r in paired if r.percentage_error is not None]
    actual_total = sum(r.actual_mw for r in paired)
    return result.model_copy(update={
        'mae_mw': mean(absolute), 'rmse_mw': sqrt(mean([e*e for e in errors])),
        'bias_mw': mean(errors), 'max_absolute_error_mw': max(absolute),
        'p90_absolute_error_mw': absolute[max(0, ceil(0.9 * len(absolute)) - 1)],
        'mape_pct': mean(percentages) if percentages else None,
        'wape_pct': sum(absolute) / actual_total * 100 if actual_total else None,
        'zero_actual_count': sum(r.actual_mw == 0 for r in paired),
    })


def breakdown(rows: list[Comparison], grouping: str) -> list[dict]:
    groups = defaultdict(list)
    for row in rows:
        local = row.delivery_time.astimezone(LONDON)
        key = local.strftime('%Y-%m-%d') if grouping == 'day' else local.strftime('%H:%M')
        groups[key].append(row)
    return [{'label': key, **metrics(value).model_dump()} for key, value in sorted(groups.items())]


def distribution(rows: list[Comparison]) -> list[dict]:
    bounds = [float('-inf'), -3000, -2000, -1000, -500, 0, 500, 1000, 2000, 3000, float('inf')]
    labels = ['< −3k', '−3–−2k', '−2–−1k', '−1k–−500', '−500–0', '0–500', '500–1k', '1–2k', '2–3k', '≥ 3k']
    return [{'label': label, 'count': sum(r.error_mw is not None and left <= r.error_mw < right for r in rows),
             'direction': 'under' if right <= 0 else 'over'}
            for left, right, label in zip(bounds, bounds[1:], labels)]


def insights(rows: list[Comparison], overall: Metrics, daily: list[dict]) -> list[dict]:
    result = []
    if overall.bias_mw is not None:
        bias = overall.bias_mw
        result.append({'title': 'Wind shortfall exposure' if bias > 0 else 'Wind surplus tendency',
                       'text': f'Forecasts {"over-predict" if bias > 0 else "under-predict"} by {abs(bias):,.0f} MW on average in this selection. '
                               + ('Over-prediction can leave less wind than anticipated.' if bias > 0 else 'Under-prediction can lead to excess additional procurement.'),
                       'tone': 'warning' if bias > 0 else 'neutral'})
        result.append({'title': 'Historical uncertainty',
                       'text': f'90% of matched intervals have an absolute error of {overall.p90_absolute_error_mw:,.0f} MW or less. This is descriptive history, not a future confidence bound.',
                       'tone': 'neutral'})
    valid_days = [d for d in daily if d['mae_mw'] is not None]
    if valid_days:
        worst = max(valid_days, key=lambda d: d['mae_mw'])
        result.append({'title': 'Day to investigate',
                       'text': f'{date.fromisoformat(worst["label"]).strftime("%d %b")} has the largest daily MAE: {worst["mae_mw"]:,.0f} MW across {worst["count"]} matched intervals.',
                       'tone': 'warning'})
    if overall.coverage_pct < 100:
        result.append({'title': 'Incomplete comparison', 'text': f'{overall.count} of {overall.expected_count} intervals are matched. Missing pairs are excluded from accuracy metrics.', 'tone': 'warning'})
    return result
