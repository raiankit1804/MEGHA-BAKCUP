"""
WeatherGPT v2.0 — Voice WebSocket + TTS REST Endpoint
Handles bidirectional audio streaming for voice queries.
Pipeline: audio → Bhashini ASR (or gTTS fallback) → text → /api/chat → TTS → audio
"""
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional
from fastapi.responses import StreamingResponse
import io

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Voice"])


class TTSRequest(BaseModel):
    text: str
    language: str = "en"


@router.post("/tts")
@router.post("/voice/tts")
async def text_to_speech(req: TTSRequest):
    """Convert text to speech audio (mp3) stream."""
    from services.bhashini import text_to_speech as tts
    audio_bytes = await tts(req.text, req.language)
    return StreamingResponse(
        io.BytesIO(audio_bytes),
        media_type="audio/mpeg",
        headers={"Content-Disposition": "inline; filename=speech.mp3"},
    )


@router.post("/asr")
async def speech_to_text_endpoint(
    audio: bytes = None,
    language: str = "en",
):
    """Convert audio bytes to transcript."""
    from services.bhashini import speech_to_text
    from fastapi import Request
    # Handle direct request body if sent as raw bytes
    return {"text": ""}


from fastapi import Request

@router.post("/transcribe")
async def transcribe_audio(request: Request, language: str = "en"):
    """Transcribe uploaded audio bytes from request body."""
    from services.bhashini import speech_to_text
    content = await request.body()
    transcript = await speech_to_text(content, language)
    return {"text": transcript}


@router.websocket("/ws/voice")
async def voice_websocket(websocket: WebSocket):
    """
    Bidirectional voice pipeline:
    Client sends audio bytes → server transcribes → queries chat → returns TTS audio
    Pipeline events sent as text frames: transcribing, understanding, fetching, synthesizing, speaking
    """
    await websocket.accept()
    from services.bhashini import speech_to_text, text_to_speech

    try:
        # Receive metadata first (JSON)
        meta = await websocket.receive_json()
        language = meta.get("language", "en")
        session_id = meta.get("session_id")
        domain_filter = meta.get("domain_filter", "normal")

        # Receive audio data
        await websocket.send_text("transcribing")
        audio_data = await websocket.receive_bytes()

        # ASR
        transcript = await speech_to_text(audio_data, language)
        await websocket.send_json({"event": "transcribed", "text": transcript})

        # Query chat endpoint
        await websocket.send_text("understanding")
        import httpx
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post("http://localhost:8000/api/chat", json={
                "query": transcript,
                "session_id": session_id,
                "language": language,
                "domain_filter": domain_filter,
            })
            chat_data = resp.json()

        await websocket.send_text("synthesizing")
        response_text = chat_data.get("response_text", "")

        # TTS
        await websocket.send_text("speaking")
        audio_bytes = await text_to_speech(response_text, language)

        # Send full response
        await websocket.send_json({
            "event": "complete",
            "chat_response": chat_data,
            "audio_size": len(audio_bytes),
        })
        await websocket.send_bytes(audio_bytes)

    except WebSocketDisconnect:
        logger.info("Voice WebSocket disconnected")
    except Exception as exc:
        logger.error("Voice pipeline error: %s", exc)
        try:
            await websocket.send_json({"event": "error", "message": str(exc)})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
