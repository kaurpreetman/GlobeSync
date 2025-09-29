import uvicorn
from api import app
from config import settings

def main():
    """Main entry point for the LangGraph Travel Planning API"""
    print("🚀 Starting LangGraph Travel Planning API...")
    print(f"📍Server will run on {settings.HOST}:{settings.PORT}")
    print(f"🔧 Debug mode: {settings.DEBUG}")
    print("📚 API Documentation available at: http://localhost:8000/docs")
    print("🎯 Available agents: Weather, Maps, Events, Budget, Itinerary")
    print("⚠️  PRODUCTION BACKEND - All API keys required (no mock data)")
    print("🔑 Check /api/v1/system/config for API key status")
    
    uvicorn.run(
        "api:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )

if __name__ == "__main__":
    main()