from fastapi import APIRouter

from app.api.v1 import jobs, storage

router = APIRouter(prefix="/v1")
router.include_router(storage.router)
router.include_router(jobs.router)
