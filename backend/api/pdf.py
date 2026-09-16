"""WeatherGPT v2.0 — PDF Report Endpoint"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import io, logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["PDF"])


class PDFRequest(BaseModel):
    location: str
    weather_data: dict
    advisory_text: str
    language: str = "en"


@router.post("/pdf")
async def generate_pdf(req: PDFRequest):
    from services.pdf_generator import generate_weather_pdf
    pdf_bytes = generate_weather_pdf(req.location, req.weather_data, req.advisory_text)
    filename = f"WeatherGPT_{req.location.replace(' ', '_')}_Advisory.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
