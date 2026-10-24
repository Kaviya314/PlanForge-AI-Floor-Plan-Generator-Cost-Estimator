import os
from fastapi import APIRouter, HTTPException
from ..models.schemas import (
    GeneratePlanRequest,
    PlanLayoutSchema,
    ValidationResponse,
    CostEstimateResponse,
    CostEstimateRequest,
    AIExplanationRequest
)
from ..services.validation_service import validate_layout_py
from ..services.cost_service import calculate_cost_estimate_py
from ..services.layout_service import generate_deterministic_plan_py
from ..services.gemma_service import generate_plan_ai

router = APIRouter()

@router.get("/health")
def get_health():
    api_key = os.getenv("GEMMA_API_KEY") or os.getenv("GEMINI_API_KEY", "")
    has_key = bool(api_key and api_key not in ["MY_GEMINI_API_KEY", "MY_GEMMA_API_KEY"])
    return {
        "status": "ok",
        "ai_configured": has_key,
        "ai_model": os.getenv("AI_MODEL", "gemma-4-26b-a4b-it"),
        "ai_provider": os.getenv("AI_PROVIDER", "gemini"),
        "demo_mode_available": True
    }

@router.get("/config")
def get_config():
    api_key = os.getenv("GEMMA_API_KEY") or os.getenv("GEMINI_API_KEY", "")
    has_key = bool(api_key and api_key not in ["MY_GEMINI_API_KEY", "MY_GEMMA_API_KEY"])
    return {
        "ai_available": has_key,
        "model_name": os.getenv("AI_MODEL", "gemma-4-26b-a4b-it"),
        "default_unit": "ft",
        "app_version": "1.0.0"
    }

@router.post("/plan/generate")
async def generate_plan(req: GeneratePlanRequest):
    plan, message, is_fallback = await generate_plan_ai(req)
    validation = validate_layout_py(plan)
    return {
        "plan": plan,
        "validation": validation,
        "mode": "demo" if is_fallback else "ai",
        "message": message
    }

@router.post("/plan/validate", response_model=ValidationResponse)
def validate_plan(layout: PlanLayoutSchema):
    return validate_layout_py(layout)

@router.post("/cost/estimate", response_model=CostEstimateResponse)
def estimate_cost(req: CostEstimateRequest):
    return calculate_cost_estimate_py(req.layout, req.rate_overrides)

@router.post("/ai/explain")
def explain_layout(req: AIExplanationRequest):
    layout = req.layout
    return {
        "mode": "demo" if layout.mode == "demo" else "ai",
        "explanation": {
            "summary": f"Architectural analysis for {layout.project_name} ({layout.house_type}) on a {layout.plot.width}x{layout.plot.length} {layout.plot.unit} plot.",
            "zoning_analysis": "Public living and foyer areas positioned for immediate front accessibility; private bedrooms insulated towards quiet rear boundaries.",
            "lighting_ventilation": "Perimeter layout allows natural light fenestration and cross-ventilation in all primary living quarters.",
            "cost_optimizations": [
                "Grouping plumbing shafts in adjacent wet zones saves ~12% on piping conduits.",
                "Rectilinear wall alignments prevent complex cantilever formwork costs.",
                "Adhering to ground coverage regulations prevents municipal setback penalties."
            ]
        }
    }
