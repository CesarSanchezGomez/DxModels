import os

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, Response, FileResponse

from backend.auth.router import router as auth_router
from backend.api.router import router as api_router
from backend.views.router import router as views_router

app = FastAPI(title="DxModels API")

app.mount("/static", StaticFiles(directory="frontend/static"), name="static")

app.include_router(auth_router)
app.include_router(api_router, prefix="/api")
app.include_router(views_router)


@app.middleware("http")
async def auth_guard(request: Request, call_next):
    public_prefixes = ("/auth/", "/static/", "/favicon.ico", "/api/")
    if any(request.url.path.startswith(p) for p in public_prefixes):
        return await call_next(request)

    if not request.cookies.get("access_token"):
        return RedirectResponse(url="/auth/login", status_code=302)

    return await call_next(request)


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    path = "frontend/static/images/favicon.ico"
    if os.path.exists(path):
        return FileResponse(path)
    return Response(status_code=204)
