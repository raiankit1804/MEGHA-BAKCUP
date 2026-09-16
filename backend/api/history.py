"""
WeatherGPT v2.0 — Chat History & User Endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ─── History Router ───────────────────────────────────────────────────────────
router = APIRouter(tags=["History"])


@router.get("/history")
async def get_history(request: Request):
    from api.auth import require_user
    from db.mongo import get_user_history
    user = await require_user(request)
    if not user.get("history_opt_in"):
        return {"history": [], "message": "Chat history is disabled. Enable it in your profile settings."}
    history = await get_user_history(str(user["_id"]))
    return {"history": history, "count": len(history)}


@router.delete("/history")
async def clear_history(request: Request):
    from api.auth import require_user
    from db.mongo import clear_user_history
    user = await require_user(request)
    count = await clear_user_history(str(user["_id"]))
    return {"deleted": count, "message": f"Deleted {count} chat history documents."}
