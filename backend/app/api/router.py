"""Main API Router Aggregator"""
from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.logs import router as logs_router
from app.api.incidents import router as incidents_router
from app.api.timeline import router as timeline_router
from app.api.export import router as export_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(logs_router)
api_router.include_router(incidents_router)
api_router.include_router(timeline_router)
api_router.include_router(export_router)
