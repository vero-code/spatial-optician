import random
import time
from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from google import genai
from google.genai import types as genai_types

from config import GEMINI_API_KEY, GEMINI_MODEL
from database import db
from prompts import DR_ARIS_VISION_PROMPT
from schemas import ImageAnalysisResponse, SpatialAnalysisResult

router = APIRouter(prefix="/api")

_FALLBACK_HISTORY = [
    SpatialAnalysisResult(
        site_reference="NY-HUD-01",
        calibration_date="25.05.2026",
        optical_scale="1:500",
        diffusion_coefficient=0.842,
        rayleigh_scattering="λ-4 η",
        lux_deficit=-1.24,
        spatial_efficiency=18.4,
        timestamp=time.time() - 3_600,
    )
]


@router.post("/analyze", response_model=SpatialAnalysisResult)
async def analyze_photo(file: UploadFile = File(...)):
    """Simulate optical depth analysis, persist metadata, and return spatial parameters."""
    time.sleep(1.0)

    result = SpatialAnalysisResult(
        site_reference=f"NY-HUD-{random.randint(10, 99)}",
        calibration_date=time.strftime("%d.%m.%Y"),
        optical_scale="1:500",
        diffusion_coefficient=round(random.uniform(0.75, 0.95), 3),
        rayleigh_scattering="λ-4 η",
        lux_deficit=round(random.uniform(-1.50, -0.50), 2),
        spatial_efficiency=round(random.uniform(15.0, 22.0), 1),
        timestamp=time.time(),
    )

    if db is not None:
        try:
            db.analyses.insert_one(result.model_dump())
            print(f"Saved analysis {result.site_reference} to MongoDB.")
        except Exception as exc:
            print(f"MongoDB write error: {exc}")

    return result


@router.post("/analyze-image", response_model=ImageAnalysisResponse)
async def analyze_image_with_ai(file: UploadFile = File(...)):
    """Send the uploaded image to Gemini Vision and return an AI lighting analysis."""
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server.",
        )

    image_bytes = await file.read()
    mime_type = file.content_type or "image/jpeg"

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                DR_ARIS_VISION_PROMPT,
            ],
        )
        description = response.text or "No description returned from Gemini."
        print(f"[Vision] '{file.filename}': {description[:80]}...")
        return ImageAnalysisResponse(description=description)

    except Exception as exc:
        print(f"[Vision] Gemini error: {exc}")
        raise HTTPException(status_code=500, detail=f"Gemini Vision error: {exc}")


@router.get("/history", response_model=List[SpatialAnalysisResult])
def get_analysis_history():
    """Return the last 10 audit records from MongoDB, or a fallback stub."""
    if db is None:
        return _FALLBACK_HISTORY

    try:
        docs = db.analyses.find().sort("timestamp", -1).limit(10)
        return [
            SpatialAnalysisResult(**{k: v for k, v in doc.items() if k != "_id"})
            for doc in docs
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Database query failed: {exc}")
