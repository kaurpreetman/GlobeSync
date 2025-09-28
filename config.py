import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Gemini Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # External API Keys
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")
    # Maps now use OpenStreetMap data (no API key needed)
    
    # Google Calendar Configuration
    GOOGLE_CALENDAR_CREDENTIALS_PATH: str = os.getenv("GOOGLE_CALENDAR_CREDENTIALS_PATH", "credentials.json")
    GOOGLE_CALENDAR_TOKEN_PATH: str = os.getenv("GOOGLE_CALENDAR_TOKEN_PATH", "token.json")
    GOOGLE_CALENDAR_SCOPES: List[str] = ["https://www.googleapis.com/auth/calendar"]
    
    # RapidAPI Configuration (for IRCTC trains)
    RAPIDAPI_KEY: str = os.getenv("RAPIDAPI_KEY", "")
    IRCTC_API_HOST: str = "irctc1.p.rapidapi.com"
    
    # Amadeus API Configuration (for flights)
    AMADEUS_API_KEY: str = os.getenv("AMADEUS_API_KEY", "")
    AMADEUS_API_SECRET: str = os.getenv("AMADEUS_API_SECRET", "")
    AMADEUS_BASE_URL: str = "https://test.api.amadeus.com"
    
    # Database Configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./travel_planning.db")
    
    # FastAPI Configuration
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # LangGraph Configuration
    MAX_ITERATIONS: int = 10
    TIMEOUT: int = 300  # 5 minutes
    
    # Agent Configuration
    TEMPERATURE: float = 0.7
    MAX_TOKENS: int = 1000

settings = Settings()