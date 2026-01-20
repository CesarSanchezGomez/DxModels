# app/main.py
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pathlib import Path
from app.routers import endpoints

app = FastAPI(
    title="DxModels - Data Models",
    description="Herramienta para depurar archivos XML de SAP SuccessFactors",
    version="2.0.0"
)

# Obtener la ruta base del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent

# Configurar archivos estáticos y templates
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "app" / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# Incluir routers
app.include_router(endpoints.router, prefix="/api", tags=["procesamiento"])

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    """Página principal con selección de operaciones"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/cdm", response_class=HTMLResponse)
async def cdm_page(request: Request):
    """Página para Corporate Data Model"""
    return templates.TemplateResponse(
        "individual.html", 
        {
            "request": request,
            "title": "Corporate Data Model (CDM)",
            "data_model": "cdm",
            "require_countries": False
        }
    )

@app.get("/csf-cdm", response_class=HTMLResponse)
async def csf_cdm_page(request: Request):
    """Página para CSF Corporate Data Model"""
    return templates.TemplateResponse(
        "individual.html",
        {
            "request": request,
            "title": "CSF Corporate Data Model",
            "data_model": "csf_cdm",
            "require_countries": True
        }
    )

@app.get("/sdm", response_class=HTMLResponse)
async def sdm_page(request: Request):
    """Página para Succession Data Model"""
    return templates.TemplateResponse(
        "individual.html",
        {
            "request": request,
            "title": "Succession Data Model (SDM)",
            "data_model": "sdm",
            "require_countries": False
        }
    )

@app.get("/csf-sdm", response_class=HTMLResponse)
async def csf_sdm_page(request: Request):
    """Página para CSF Succession Data Model"""
    return templates.TemplateResponse(
        "individual.html",
        {
            "request": request,
            "title": "CSF Succession Data Model",
            "data_model": "csf_sdm",
            "require_countries": True
        }
    )

@app.get("/completo", response_class=HTMLResponse)
async def completo_page(request: Request):
    """Página para Data Model Completo"""
    return templates.TemplateResponse("completo.html", {"request": request})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)