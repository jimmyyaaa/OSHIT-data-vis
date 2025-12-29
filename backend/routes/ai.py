"""
AI 助手路由
"""
from fastapi import APIRouter, HTTPException, status
from utils.ai_helper import get_ai_summary
from .schemas import AISummaryRequest, AISummaryResponse

router = APIRouter(prefix="", tags=["AI"])


@router.post("/getAISummary", response_model=AISummaryResponse)
async def generate_ai_summary(request: AISummaryRequest):
    """
    Generate AI summary for provided data context.

    Expected request body:
    {
        "data_context": "string with data to analyze",
        "system_instruction": "instruction for the AI model"
    }
    """
    # Validate required fields
    if not request.data_context:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="data_context is required"
        )

    if not request.system_instruction:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="system_instruction is required"
        )

    try:
        summary = await get_ai_summary(request.data_context, request.system_instruction)
        return AISummaryResponse(summary=summary)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
