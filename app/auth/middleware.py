# app/auth/middleware.py
from fastapi import Request, HTTPException, status
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
from app.config import get_settings
from app.auth.supabase_client import get_supabase_client

settings = get_settings()


async def verify_token(request: Request):
    """Verifica el token JWT de la sesión"""
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado"
        )

    try:
        # Verificar token con Supabase
        supabase = get_supabase_client()
        user = supabase.auth.get_user(token)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )

        # Verificar dominio del email
        email = user.user.email
        if not email.endswith(f"@{settings.allowed_domain}"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Solo se permite acceso a usuarios de @{settings.allowed_domain}"
            )

        return user.user

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )


def require_auth(request: Request):
    """Decorator para proteger rutas"""
    token = request.cookies.get("access_token")
    if not token:
        return RedirectResponse(url="/login", status_code=302)
    return None