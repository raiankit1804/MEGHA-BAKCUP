"""WeatherGPT v2.0 — User Profile Endpoint"""
from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from typing import Optional
from api.auth import require_user
from db.mongo import update_user_profile, UserProfileUpdate, get_personalization_summary

router = APIRouter(tags=["User"])


class ProfilePatch(BaseModel):
    color_scheme: Optional[str] = None
    interface_style: Optional[str] = None
    default_language: Optional[str] = None
    history_opt_in: Optional[bool] = None


@router.get("/user")
async def get_user(request: Request):
    user = await require_user(request)
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


@router.patch("/user")
async def patch_user(body: ProfilePatch, request: Request):
    user = await require_user(request)
    await update_user_profile(str(user["_id"]), UserProfileUpdate(**body.model_dump()))
    return {"status": "updated"}


@router.get("/user/suggestions")
async def get_suggestions(request: Request):
    """Return personalization suggestions — only if history_opt_in is True."""
    user = await require_user(request)
    if not user.get("history_opt_in"):
        return {"suggestions": [], "message": "Enable chat history to receive personalized suggestions."}
    summary = await get_personalization_summary(str(user["_id"]))
    suggestions = []
    if summary.get("top_location"):
        suggestions.append({
            "type": "location",
            "label": f"You often check {summary['top_location']}",
            "value": summary["top_location"],
        })
    return {"suggestions": suggestions}
