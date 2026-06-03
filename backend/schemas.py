from pydantic import BaseModel


class SpatialAnalysisResult(BaseModel):
    site_reference: str
    calibration_date: str
    optical_scale: str
    diffusion_coefficient: float
    rayleigh_scattering: str
    lux_deficit: float
    spatial_efficiency: float
    timestamp: float


class ImageAnalysisResponse(BaseModel):
    description: str


class ChatRequest(BaseModel):
    session_id: str
    message: str


class ChatResponse(BaseModel):
    message: str
