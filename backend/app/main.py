import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes import router
from app.config.settings import settings

app = FastAPI(title='Windward API', version='1.0.0', description='January 2026 wind forecast decision intelligence.')
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                   allow_credentials=False, allow_methods=['GET', 'POST'],
                   allow_headers=['Content-Type', 'X-Refresh-Token'])
app.include_router(router)


@app.middleware('http')
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['X-Frame-Options'] = 'DENY'
    return response


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    logging.getLogger('windward').exception('Unexpected API error')
    return JSONResponse(status_code=500, content={'detail': 'The analysis could not be loaded. Please retry or contact the deployment owner.'})
