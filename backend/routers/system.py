from fastapi import APIRouter

from database import db

router = APIRouter()


@router.get("/status")
def read_root():
    return {"service": "Spatial Optician Core API", "status": "active", "version": "2.04"}


@router.get("/health")
def health_check():
    return {"status": "ok", "db_connected": db is not None}
