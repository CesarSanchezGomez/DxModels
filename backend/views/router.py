from fastapi import APIRouter, Request
from fastapi.templating import Jinja2Templates

router = APIRouter()
templates = Jinja2Templates(directory="frontend/templates")

INDIVIDUAL_PAGES = {
    "/cdm": {
        "title": "Corporate Data Model (CDM)",
        "data_model": "cdm",
        "require_countries": False,
    },
    "/csf-cdm": {
        "title": "CSF Corporate Data Model",
        "data_model": "csf_cdm",
        "require_countries": True,
    },
    "/sdm": {
        "title": "Succession Data Model (SDM)",
        "data_model": "sdm",
        "require_countries": False,
    },
    "/csf-sdm": {
        "title": "CSF Succession Data Model",
        "data_model": "csf_sdm",
        "require_countries": True,
    },
}


@router.get("/")
async def home(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})


for _path, _config in INDIVIDUAL_PAGES.items():
    def _make_handler(cfg: dict):
        async def handler(request: Request):
            return templates.TemplateResponse("individual.html", {"request": request, **cfg})

        return handler


    router.add_api_route(_path, _make_handler(_config), methods=["GET"])


@router.get("/full")
async def full_page(request: Request):
    return templates.TemplateResponse("full.html", {"request": request})
