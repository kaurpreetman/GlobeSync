"""
Simple AI Query API
Provides a basic endpoint for AI queries using Gemini
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import google.generativeai as genai
from config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])

# Configure Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

class AIQueryRequest(BaseModel):
    """Request model for AI query"""
    prompt: str
    context: Optional[str] = None
    max_tokens: Optional[int] = 300

@router.post("/query")
async def query_ai(request: AIQueryRequest):
    """
    Simple AI query endpoint using Gemini
    """
    try:
        if not settings.GEMINI_API_KEY:
            raise HTTPException(
                status_code=500,
                detail="AI service not configured. Please set GEMINI_API_KEY."
            )
        
        # Create Gemini model
        model = genai.GenerativeModel(settings.GEMINI_MODEL or 'gemini-1.5-flash')
        
        # Prepare the prompt
        full_prompt = request.prompt
        if request.context:
            full_prompt = f"Context: {request.context}\n\n{request.prompt}"
        
        # Generate response
        response = model.generate_content(full_prompt)
        
        if not response or not response.text:
            raise HTTPException(
                status_code=500,
                detail="AI service returned empty response"
            )
        
        return {
            "success": True,
            "response": response.text,
            "message": response.text,  # Alias for compatibility
            "context": request.context,
            "prompt_length": len(request.prompt)
        }
        
    except Exception as e:
        logger.error(f"AI query error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI query failed: {str(e)}")

@router.get("/status")
async def ai_status():
    """
    Check AI service status
    """
    try:
        configured = bool(settings.GEMINI_API_KEY)
        model_name = settings.GEMINI_MODEL or 'gemini-1.5-flash'
        
        if configured:
            # Try a simple test query
            model = genai.GenerativeModel(model_name)
            test_response = model.generate_content("Hello, respond with 'OK' if you're working")
            working = bool(test_response and test_response.text)
        else:
            working = False
        
        return {
            "configured": configured,
            "working": working,
            "model": model_name,
            "status": "operational" if working else "not available"
        }
        
    except Exception as e:
        logger.error(f"AI status check error: {e}")
        return {
            "configured": bool(settings.GEMINI_API_KEY),
            "working": False,
            "model": settings.GEMINI_MODEL or 'gemini-1.5-flash',
            "status": "error",
            "error": str(e)
        }