import asyncio
import uvicorn
from api import app
from db.database import init_db
from config import settings

async def startup():
    """Initialize all async resources before starting the server"""
    print("🚀 Initializing database...")
    await init_db()
    print("✅ Database initialized!")

def main():
    """Main entry point for the LangGraph Travel Planning API"""
    print("🚀 Starting LangGraph Travel Planning API...")
    print(f"📍Server will run on {settings.HOST}:{settings.PORT}")
    print(f"🔧 Debug mode: {settings.DEBUG}")
    print("📚 API Documentation available at: http://localhost:8000/docs")
    print("🎯 Available agents: Weather, Maps, Events, Budget, Itinerary")
    print("⚠️  PRODUCTION BACKEND - All API keys required (no mock data)")
    print("🔑 Check /api/v1/system/config for API key status")

    # Initialize DB before starting Uvicorn
    asyncio.run(startup())

    uvicorn.run(
        "api:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )

if __name__ == "__main__":
    main()
