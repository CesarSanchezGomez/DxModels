from fastapi import APIRouter, Request, HTTPException, Form, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from backend.auth.supabase_client import get_supabase_client
from backend.auth.dependencies import get_current_user
from backend.config import get_settings

router = APIRouter(prefix="/auth", tags=["authentication"])
templates = Jinja2Templates(directory="frontend/templates")
settings = get_settings()


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {
        "request": request,
        "supabase_url": settings.supabase_url,
        "supabase_key": settings.supabase_key,
    })


@router.get("/callback", response_class=HTMLResponse)
async def auth_callback(request: Request):
    return templates.TemplateResponse("callback.html", {
        "request": request,
        "allowed_domain": settings.allowed_domain,
    })


@router.post("/session")
async def create_session(
        access_token: str = Form(...),
        refresh_token: str = Form(None),
        email: str = Form(...),
):
    if not access_token or not email:
        raise HTTPException(status_code=400, detail="Token o email no proporcionado")

    if not email.endswith(f"@{settings.allowed_domain}"):
        raise HTTPException(
            status_code=403,
            detail=f"Solo se permite acceso a usuarios de @{settings.allowed_domain}",
        )

    response = RedirectResponse(url="/", status_code=303)

    cookie_defaults = dict(httponly=True, secure=True, samesite="lax")
    response.set_cookie(key="access_token", value=access_token, max_age=3600, **cookie_defaults)
    if refresh_token:
        response.set_cookie(key="refresh_token", value=refresh_token, max_age=604800, **cookie_defaults)

    return response


@router.get("/logout")
async def logout(request: Request):
    supabase = get_supabase_client()
    token = request.cookies.get("access_token")
    if token:
        try:
            supabase.auth.sign_out()
        except Exception:
            pass

    response = RedirectResponse(url="/auth/login", status_code=302)
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return response


@router.get("/user")
async def get_user_info(user=Depends(get_current_user)):
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "created_at": str(user.created_at),
            "user_metadata": user.user_metadata,
        }
    }
