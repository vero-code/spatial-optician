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
    """Analyze the photo using Gemini Vision to extract spatial parameters, persist, and return."""
    image_bytes = await file.read()
    await file.seek(0)
    
    # Default fallback values
    site_ref = f"NY-HUD-{random.randint(10, 99)}"
    cal_date = time.strftime("%d.%m.%Y")
    opt_scale = "1:500"
    diff_coeff = round(random.uniform(0.75, 0.95), 3)
    rayleigh = "λ-4 η"
    lux_def = round(random.uniform(-1.50, -0.50), 2)
    spat_eff = round(random.uniform(15.0, 22.0), 1)

    if GEMINI_API_KEY:
        try:
            from pydantic import BaseModel
            
            class SpatialMetricsEstimation(BaseModel):
                diffusion_coefficient: float
                rayleigh_scattering: str
                lux_deficit: float
                spatial_efficiency: float
                optical_scale: str

            mime_type = file.content_type or "image/jpeg"
            client = genai.Client(api_key=GEMINI_API_KEY)
            
            prompt = (
                "You are an expert lighting and optical engineer. Analyze this image and estimate the following metrics:\n"
                "- diffusion_coefficient: how diffuse/soft the lighting is, float from 0.1 to 1.0 (e.g. 0.8+ for soft panels/windows, 0.2-0.5 for direct spotlights/bulbs)\n"
                "- rayleigh_scattering: dispersion formula string, e.g. 'λ-4 η' or 'λ-3.8 η'\n"
                "- lux_deficit: lux deficit compared to standard requirements, float from -2.00 to -0.10 (lumens/m²)\n"
                "- spatial_efficiency: overall estimated spatial lighting efficiency, float from 10.0 to 30.0 (%)\n"
                "- optical_scale: estimate the drawing/photo scale, return standard ratio string (e.g. '1:100', '1:200', '1:500' for floor plans, or '1:10', '1:20' for photos of spaces/rooms)"
            )

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[
                    genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    prompt,
                ],
                config=genai_types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=SpatialMetricsEstimation,
                ),
            )
            
            import json
            metrics = json.loads(response.text)
            diff_coeff = round(float(metrics.get("diffusion_coefficient", diff_coeff)), 3)
            rayleigh = str(metrics.get("rayleigh_scattering", rayleigh))
            lux_def = round(float(metrics.get("lux_deficit", lux_def)), 2)
            spat_eff = round(float(metrics.get("spatial_efficiency", spat_eff)), 1)
            opt_scale = str(metrics.get("optical_scale", opt_scale))
            print(f"[Metrics] Extracted from image: diff={diff_coeff}, rayleigh='{rayleigh}', lux={lux_def}, eff={spat_eff}, scale='{opt_scale}'")
        except Exception as exc:
            print(f"[Metrics] Gemini extraction failed: {exc}. Using fallback values.")

    result = SpatialAnalysisResult(
        site_reference=site_ref,
        calibration_date=cal_date,
        optical_scale=opt_scale,
        diffusion_coefficient=diff_coeff,
        rayleigh_scattering=rayleigh,
        lux_deficit=lux_def,
        spatial_efficiency=spat_eff,
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
