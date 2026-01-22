# app/main.py
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from app.routers import endpoints, auth
from app.config import get_settings

settings = get_settings()

app = FastAPI(title="DxModels API")

# Static files y templates
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="templates")

# Incluir routers
app.include_router(auth.router)  # Auth router (ya tiene /auth prefix)
app.include_router(endpoints.router, prefix="/api")  # API router


# Middleware para inyectar settings en templates
@app.middleware("http")
async def add_settings_to_templates(request: Request, call_next):
    request.state.supabase_url = settings.supabase_url
    request.state.supabase_key = settings.supabase_key
    response = await call_next(request)
    return response


# Función auxiliar para verificar autenticación
def check_auth(request: Request):
    """Verifica si hay token en las cookies"""
    token = request.cookies.get("access_token")
    if not token:
        return RedirectResponse(url="/auth/login", status_code=302)
    return None


# ==========================================
# RUTAS DE VISTAS (Protegidas)
# ==========================================

@app.get("/")
async def home(request: Request):
    """Página de inicio"""
    auth_redirect = check_auth(request)
    if auth_redirect:
        return auth_redirect

    return templates.TemplateResponse("index.html", {
        "request": request,
        "supabase_url": settings.supabase_url,
        "supabase_key": settings.supabase_key
    })


@app.get("/cdm")
async def cdm_page(request: Request):
    """Página de Corporate Data Model"""
    auth_redirect = check_auth(request)
    if auth_redirect:
        return auth_redirect

    return templates.TemplateResponse("individual.html", {
        "request": request,
        "title": "Corporate Data Model (CDM)",
        "data_model": "cdm",
        "require_countries": False,
        "supabase_url": settings.supabase_url,
        "supabase_key": settings.supabase_key
    })


@app.get("/csf-cdm")
async def csf_cdm_page(request: Request):
    """Página de CSF Corporate Data Model"""
    auth_redirect = check_auth(request)
    if auth_redirect:
        return auth_redirect

    return templates.TemplateResponse("individual.html", {
        "request": request,
        "title": "CSF Corporate Data Model",
        "data_model": "csf_cdm",
        "require_countries": True,
        "supabase_url": settings.supabase_url,
        "supabase_key": settings.supabase_key
    })


@app.get("/sdm")
async def sdm_page(request: Request):
    """Página de Succession Data Model"""
    auth_redirect = check_auth(request)
    if auth_redirect:
        return auth_redirect

    return templates.TemplateResponse("individual.html", {
        "request": request,
        "title": "Succession Data Model (SDM)",
        "data_model": "sdm",
        "require_countries": False,
        "supabase_url": settings.supabase_url,
        "supabase_key": settings.supabase_key
    })


@app.get("/csf-sdm")
async def csf_sdm_page(request: Request):
    """Página de CSF Succession Data Model"""
    auth_redirect = check_auth(request)
    if auth_redirect:
        return auth_redirect

    return templates.TemplateResponse("individual.html", {
        "request": request,
        "title": "CSF Succession Data Model",
        "data_model": "csf_sdm",
        "require_countries": True,
        "supabase_url": settings.supabase_url,
        "supabase_key": settings.supabase_key
    })


@app.get("/full")
async def completo_page(request: Request):
    """Página de Data Model Completo"""
    auth_redirect = check_auth(request)
    if auth_redirect:
        return auth_redirect

    return templates.TemplateResponse("full.html", {
        "request": request,
        "supabase_url": settings.supabase_url,
        "supabase_key": settings.supabase_key
    })


