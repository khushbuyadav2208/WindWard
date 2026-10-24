from datetime import date, datetime
from math import sqrt
import pytest
from app.models.schemas import SourceRecord
from app.services.analytics import compare, decision_time, metrics, normalize, select_forecast


def dt(value):
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def record(target='2026-01-02T12:00:00Z', publication='2026-01-01T09:30:00Z', generation=100):
    return SourceRecord(startTime=target, publishTime=publication, generation=generation)


def test_selects_latest_available_vintage_never_hindsight():
    target = dt('2026-01-02T12:00:00Z')
    records = [record(publication='2026-01-01T08:30:00Z', generation=50),
               record(publication='2026-01-01T10:00:00Z', generation=90),
               record(publication='2026-01-01T10:00:01Z', generation=500),
               record(publication='2026-01-02T09:00:00Z', generation=999)]
    selected, alignment = select_forecast(target, decision_time(target, '10:00'), {target: records})
    assert selected.generation == 90
    assert alignment == 'exact'


def test_hourly_alignment_cannot_cross_hour_or_admit_late_publications():
    target = dt('2026-01-02T12:30:00Z')
    by_target = {dt('2026-01-02T12:00:00Z'): [record()]}
    selected, alignment = select_forecast(target, decision_time(target, '10:00'), by_target)
    assert selected.generation == 100 and alignment == 'hourly_hold'
    assert select_forecast(dt('2026-01-02T13:30:00Z'), decision_time(target, '10:00'), by_target)[0] is None
    assert select_forecast(target, decision_time(target, '09:00'), by_target)[0] is None


def test_half_hour_vintage_missing_target_is_not_held():
    a = record()
    b = record(target='2026-01-02T11:30:00Z')
    target = dt('2026-01-02T12:30:00Z')
    by_target = {a.start_time: [a], b.start_time: [b]}
    assert select_forecast(target, decision_time(target, '10:00'), by_target)[0] is None


def test_same_vintage_prefers_exact_target():
    target = dt('2026-01-02T12:30:00Z')
    exact = record(target=target.isoformat(), generation=150)
    previous = record(generation=100)
    selected, alignment = select_forecast(target, decision_time(target, '10:00'), {target: [exact], previous.start_time: [previous]})
    assert selected.generation == 150 and alignment == 'exact'


def test_missing_forecast_actual_and_zero_denominator_are_not_zero_filled():
    target = '2026-01-02T12:00:00Z'
    rows = compare([record(target, generation=0)], [record(target, generation=100)], date(2026,1,2), date(2026,1,2), 'delivery', '10:00', 12, 13)
    assert rows[0].error_mw == 100 and rows[0].percentage_error is None
    assert rows[1].actual_mw is None and rows[1].error_mw is None
    result = metrics(rows)
    assert result.count == 1 and result.expected_count == 2
    assert result.mape_pct is None and result.wape_pct is None
    assert result.zero_actual_count == 1
    assert metrics([]).mae_mw is None


def test_metrics_known_errors():
    rows = compare([record('2026-01-02T12:00:00Z', generation=100), record('2026-01-02T12:30:00Z', generation=200)],
                   [record('2026-01-02T12:00:00Z', generation=120), record('2026-01-02T12:30:00Z', generation=160)],
                   date(2026,1,2), date(2026,1,2), 'delivery', '10:00', 12, 13)
    result = metrics(rows)
    assert [r.error_mw for r in rows] == [20, -40]
    assert result.mae_mw == 30
    assert result.rmse_mw == pytest.approx(sqrt(1000))
    assert result.bias_mw == -10
    assert result.mape_pct == 20 and result.wape_pct == 20
    assert result.max_absolute_error_mw == 40 and result.p90_absolute_error_mw == 40


def test_period_basis_and_hour_filter():
    rows = compare([], [], date(2026,1,31), date(2026,1,31), 'decision', '10:00')
    assert len(rows) == 48
    assert rows[0].delivery_time == dt('2026-02-01T00:00:00Z')
    assert rows[0].decision_time == dt('2026-01-31T10:00:00Z')
    delivery = compare([], [], date(2026,1,1), date(2026,1,1), 'delivery', '10:00', 6, 8)
    assert len(delivery) == 4
    assert delivery[0].decision_time == dt('2025-12-31T10:00:00Z')


def test_validation_deduplicates_quarantines_and_rejects_bad_records():
    good = {'startTime': '2026-01-02T12:00:00Z', 'publishTime': '2026-01-01T09:30:00Z', 'generation': 100, 'fuelType': 'WIND'}
    records = [good, good, {**good, 'generation': -1}, {**good, 'generation': None},
               {**good, 'generation': float('nan')}, {**good, 'generation': True},
               {**good, 'startTime': '2026-01-02T12:15:00Z'},
               {**good, 'startTime': '2026-01-02T12:00:00'}, {**good, 'fuelType': 'GAS'}]
    valid, quality = normalize(records, False)
    assert len(valid) == 1
    assert quality['duplicate_records'] == 1
    assert quality['invalid_records'] == 6
    assert quality['non_wind_records'] == 1
    valid, quality = normalize([good, {**good, 'generation': 200}], True)
    assert not valid and quality['conflicting_records'] == 1


def test_latest_revised_actual_is_selected():
    old = record(generation=80)
    revised = record(publication='2026-01-03T09:30:00Z', generation=110)
    rows = compare([old, revised], [record(generation=100)], date(2026,1,2), date(2026,1,2), 'delivery', '10:00', 12, 13)
    assert rows[0].actual_mw == 110
    assert rows[0].error_mw == -10
