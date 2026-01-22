# app/routers/auth.py
from fastapi import APIRouter, Request, HTTPException, status, Form
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from app.auth.supabase_client import get_supabase_client
from app.config import get_settings

router = APIRouter(prefix="/auth", tags=["authentication"])
templates = Jinja2Templates(directory="templates")
settings = get_settings()

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Página de login"""
    return templates.TemplateResponse("login.html", {
        "request": request,
        "supabase_url": settings.supabase_url,
        "supabase_key": settings.supabase_key
    })

@router.get("/callback", response_class=HTMLResponse)
async def auth_callback(request: Request):
    """
    Callback de Google OAuth
    Supabase envía los tokens en el hash fragment (#access_token=...)
    por lo que necesitamos una página HTML que los procese
    """
    return templates.TemplateResponse("callback.html", {
        "request": request,
        "allowed_domain": settings.allowed_domain
    })

@router.post("/session")
async def create_session(
        request: Request,
        access_token: str = Form(...),
        refresh_token: str = Form(None),
        email: str = Form(...)
):
    """
    Endpoint para crear la sesión después de que el frontend
    extraiga los tokens del hash fragment.
    Recibe datos de formulario (form-data) en lugar de JSON.
    """
    try:
        if not access_token or not email:
            raise HTTPException(
                status_code=400,
                detail="Token o email no proporcionado"
            )

        # Verificar dominio del email
        if not email.endswith(f"@{settings.allowed_domain}"):
            raise HTTPException(
                status_code=403,
                detail=f"Solo se permite acceso a usuarios de @{settings.allowed_domain}"
            )

        # Crear respuesta con redirección
        response = RedirectResponse(url="/", status_code=303)

        # Establecer cookies
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=3600  # 1 hora
        )

        if refresh_token:
            response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=True,
                samesite="lax",
                max_age=604800  # 7 días
            )

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/logout")
async def logout(request: Request):
    """Cerrar sesión"""
    supabase = get_supabase_client()

    try:
        token = request.cookies.get("access_token")
        if token:
            supabase.auth.sign_out()
    except Exception as e:
        pass

    response = RedirectResponse(url="/auth/login", status_code=302)
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")

    return response

@router.get("/user")
async def get_current_user(request: Request):
    """Obtener usuario actual desde las cookies"""
    try:
        token = request.cookies.get("access_token")
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="No autenticado"
            )

        supabase = get_supabase_client()
        user = supabase.auth.get_user(token)

        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )

        return {
            "user": {
                "id": user.user.id,
                "email": user.user.email,
                "created_at": str(user.user.created_at),
                "user_metadata": user.user.user_metadata
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )