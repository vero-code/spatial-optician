from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import time
import random
from pymongo import MongoClient

app = FastAPI(
    title="Spatial Optician API",
    description="Backend API for Architectural Visual Analysis and Spatial Optometry",
    version="2.04"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection settings
MONGODB_URI = "mongodb://localhost:27017/spatial_optician"
db = None

# Proactively try to connect to MongoDB
try:
    client = MongoClient(MONGODB_URI)
    db = client.get_default_database()
    print("FastAPI successfully connected to MongoDB!")
except Exception as e:
    print(f"Warning: MongoDB connection offline. Running in sandbox-mode. Error: {e}")

class SpatialAnalysisResult(BaseModel):
    site_reference: str
    calibration_date: str
    optical_scale: str
    diffusion_coefficient: float
    rayleigh_scattering: str
    lux_deficit: float
    spatial_efficiency: float
    timestamp: float

@app.get("/")
def read_root():
    return {
        "service": "Spatial Optician Core API",
        "status": "active",
        "version": "2.04"
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "db_connected": db is not None}

@app.post("/api/analyze", response_model=SpatialAnalysisResult)
async def analyze_photo(file: UploadFile = File(...)):
    """
    Simulates optical depth analysis of uploaded architectural scans,
    stores metadata in MongoDB, and returns calculated spatial parameters.
    """
    # Simulate processing time
    time.sleep(1.0)
    
    # Generate high-fidelity simulated spatial data matching the React design
    result = SpatialAnalysisResult(
        site_reference=f"NY-HUD-{random.randint(10, 99)}",
        calibration_date=time.strftime("%d.%m.%Y"),
        optical_scale="1:500",
        diffusion_coefficient=round(random.uniform(0.75, 0.95), 3),
        rayleigh_scattering="λ-4 η",
        lux_deficit=round(random.uniform(-1.50, -0.50), 2),
        spatial_efficiency=round(random.uniform(15.0, 22.0), 1),
        timestamp=time.time()
    )

    # Save to MongoDB if online
    if db is not None:
        try:
            db.analyses.insert_one(result.dict())
            print(f"Saved analysis {result.site_reference} to MongoDB.")
        except Exception as e:
            print(f"Error saving to MongoDB: {e}")

    return result

@app.get("/api/history", response_model=List[SpatialAnalysisResult])
def get_analysis_history():
    """
    Fetches the history of past spatial analysis evaluations from MongoDB.
    """
    if db is not None:
        try:
            cursor = db.analyses.find().sort("timestamp", -1).limit(10)
            history = []
            for doc in cursor:
                doc.pop("_id", None) # Remove BSON id before serialization
                history.append(SpatialAnalysisResult(**doc))
            return history
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database query failed: {e}")
    else:
        # Fallback dummy history if MongoDB is offline
        return [
            SpatialAnalysisResult(
                site_reference="NY-HUD-01",
                calibration_date="25.05.2026",
                optical_scale="1:500",
                diffusion_coefficient=0.842,
                rayleigh_scattering="λ-4 η",
                lux_deficit=-1.24,
                spatial_efficiency=18.4,
                timestamp=time.time() - 3600
            )
        ]
