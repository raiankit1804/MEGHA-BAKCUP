"""
WeatherGPT v2.0 — Google OAuth 2.0 Authentication
Server-side code exchange — never trusts raw Google tokens from frontend.
Issues app-owned JWT on successful verification.
Guest mode: all weather core features work without login.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError
import httpx

from config import settings
from db.mongo import upsert_user_profile, get_user_by_id, UserProfile

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Auth"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def create_jwt(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expire_hours)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_jwt(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


async def get_optional_user(request: Request) -> Optional[dict]:
    """
    Dependency that returns the user dict if a valid JWT cookie is present, else None.
    NEVER raises — guest requests always pass through.
    """
    token = request.cookies.get("wgpt_token") or request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        return None
    payload = decode_jwt(token)
    if not payload:
        return None
    try:
        user = await get_user_by_id(payload["sub"])
        return user
    except Exception:
        return None


async def require_user(request: Request) -> dict:
    """Dependency that requires authentication — returns user or raises 401."""
    user = await get_optional_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


@router.get("/auth/google")
async def google_login():
    """Redirect to Google OAuth consent screen."""
    if not settings.google_oauth_available:
        raise HTTPException(
            status_code=503,
            detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env",
        )
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(url=f"{GOOGLE_AUTH_URL}?{query}")


@router.get("/auth/callback")
async def google_callback(code: str, response: Response):
    """Exchange Google auth code for user info — server-side only."""
    if not settings.google_oauth_available:
        raise HTTPException(status_code=503, detail="Google OAuth not configured")

    async with httpx.AsyncClient(timeout=10) as client:
        # Exchange code for tokens
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            logger.error("Google token exchange failed: %s", token_resp.text)
            raise HTTPException(status_code=400, detail="Failed to exchange Google auth code")

        tokens = token_resp.json()
        access_token = tokens.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="No access token from Google")

        # Verify token server-side by fetching user info
        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user info")

        userinfo = userinfo_resp.json()

    # Upsert user profile in MongoDB
    profile = UserProfile(
        google_sub=userinfo["sub"],
        name=userinfo.get("name", ""),
        email=userinfo.get("email", ""),
        avatar_url=userinfo.get("picture"),
    )
    user_id = await upsert_user_profile(profile)

    # Issue app JWT (httpOnly cookie — never exposed to JS)
    app_token = create_jwt(user_id, userinfo["email"])
    response.set_cookie(
        key="wgpt_token",
        value=app_token,
        httponly=True,
        secure=settings.environment != "development",
        samesite="lax",
        max_age=settings.jwt_expire_hours * 3600,
    )

    # Redirect to frontend
    frontend_url = settings.vite_api_base_url.replace(":8000", ":5173")
    return RedirectResponse(url=f"{frontend_url}?login=success")


@router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("wgpt_token")
    return {"status": "logged_out"}


@router.get("/auth/me")
async def get_me(user: dict = Depends(require_user)):
    """Return current user's profile."""
    return {
        "id": str(user.get("_id", "")),
        "name": user.get("name"),
        "email": user.get("email"),
        "avatar_url": user.get("avatar_url"),
        "color_scheme": user.get("color_scheme", "dark"),
        "interface_style": user.get("interface_style", "modern"),
        "default_language": user.get("default_language", "en"),
        "history_opt_in": user.get("history_opt_in", False),
    }
