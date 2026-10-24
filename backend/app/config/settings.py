from pathlib import Path
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import re


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', extra='ignore')
    decision_cutoff: str = '10:00'
    cors_origins: list[str] = ['http://localhost:5173', 'http://127.0.0.1:5173']
    cache_path: Path = Path('backend/data/cache.json')
    cache_ttl_seconds: int = Field(default=86400, ge=60)
    elexon_timeout_seconds: float = Field(default=40, ge=1, le=120)
    refresh_token: str = ''
    snapshot_path: Path = Path(__file__).resolve().parents[2] / 'data' / 'january-2026.json'

    @field_validator('decision_cutoff')
    @classmethod
    def validate_cutoff(cls, value: str) -> str:
        if not re.fullmatch(r'([01]\d|2[0-3]):[0-5]\d', value):
            raise ValueError('Cutoff must be HH:MM in Europe/London')
        return value


settings = Settings()
