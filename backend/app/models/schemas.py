from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
import math


class SourceRecord(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    start_time: datetime = Field(alias='startTime')
    publish_time: datetime = Field(alias='publishTime')
    generation: float

    @field_validator('start_time', 'publish_time')
    @classmethod
    def aware(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError('Source timestamps must include timezone')
        return value

    @field_validator('generation', mode='before')
    @classmethod
    def valid_generation(cls, value):
        if isinstance(value, bool) or value is None:
            raise ValueError('Generation must be numeric')
        value = float(value)
        if not math.isfinite(value) or value < 0:
            raise ValueError('Generation must be finite and non-negative')
        return value


class Comparison(BaseModel):
    delivery_time: datetime
    decision_time: datetime
    publish_time: datetime | None
    source_target_time: datetime | None
    forecast_mw: float | None
    actual_mw: float | None
    error_mw: float | None
    absolute_error_mw: float | None
    percentage_error: float | None
    lead_hours: float | None
    alignment: Literal['exact', 'hourly_hold', 'missing']


class Metrics(BaseModel):
    count: int
    expected_count: int
    coverage_pct: float
    mae_mw: float | None = None
    rmse_mw: float | None = None
    mape_pct: float | None = None
    wape_pct: float | None = None
    bias_mw: float | None = None
    max_absolute_error_mw: float | None = None
    p90_absolute_error_mw: float | None = None
    zero_actual_count: int = 0
    mean_forecast_mw: float | None = None
    mean_actual_mw: float | None = None


class AnalysisResponse(BaseModel):
    meta: dict
    metrics: Metrics
    rows: list[Comparison]
    daily: list[dict]
    time_of_day: list[dict]
    distribution: list[dict]
    insights: list[dict]
