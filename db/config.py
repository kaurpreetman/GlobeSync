from pydantic_settings import BaseSettings
from pydantic import PrivateAttr

class Settings(BaseSettings):
    # App secrets and config
    NEXTAUTH_SECRET: str = "your-random-secret"
    NEXTAUTH_URL: str = "http://localhost:3000"
    GOOGLE_CLIENT_ID: str = "..."
    GOOGLE_CLIENT_SECRET: str = "..."
    GEMINI_API_KEY: str = "..."

    # External APIs
    WEATHER_API_KEY: str = "..."
    x_rapidapi_key: str = "..."
    x_rapidapi_host: str = "..."
    AMADEUS_API_KEY: str = "..."
    AMADEUS_API_SECRET: str = "..."
    AMADEUS_BASE_URL: str = "https://test.api.amadeus.com"

    # FastAPI config
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    GOOGLE_CALENDAR_CREDENTIALS_PATH: str = "credentials.json"
    GOOGLE_CALENDAR_TOKEN_PATH: str = "token.json"
    MONGO_DBNAME: str = "GlobeSync"
    # Private attributes (not part of the model fields)
    _MONGO_URI: str = PrivateAttr("mongodb+srv://preetkaurpawar8_db_user:cgHndcuK5RlqTSSb@cluster0.nhvlyqr.mongodb.net/")

settings = Settings()
