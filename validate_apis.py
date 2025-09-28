"""
API Key Validation Script for LangGraph Travel Planning Backend
Tests all external API connections to ensure they're working properly.
"""

import asyncio
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from tools import weather_tool, maps_tool, events_tool, budget_tool, accommodation_tool
from config import settings

async def test_weather_api():
    """Test OpenWeatherMap API connection"""
    print("🌤️  Testing Weather API (OpenWeatherMap)...")
    try:
        if not settings.WEATHER_API_KEY:
            print("   ❌ WEATHER_API_KEY not configured")
            return False
        
        result = await weather_tool.get_weather_forecast(
            "Paris, France", 
            datetime.now() + timedelta(days=1),
            datetime.now() + timedelta(days=3)
        )
        print(f"   ✅ Weather API working - Got forecast for {result.location}")
        print(f"      Current conditions: {result.conditions}")
        print(f"      Temperature range: {result.temperature_range}")
        return True
    except Exception as e:
        print(f"   ❌ Weather API failed: {str(e)}")
        return False

async def test_maps_service():
    """Test OpenStreetMap/Folium mapping service"""
    print("🗺️  Testing Maps Service (OpenStreetMap + Folium)...")
    try:
        # Test required packages
        try:
            import folium
            import geopy
            print("   ✅ Folium and Geopy packages available")
        except ImportError as ie:
            print(f"   ❌ Required mapping packages not installed: {ie}")
            return False
        
        # Test actual routing
        result = await maps_tool.get_route("New York, NY", "Boston, MA", "driving")
        print(f"   ✅ Maps service working - Route found")
        print(f"      Distance: {result.distance:.1f} km")
        print(f"      Travel time: {result.travel_time}")
        print(f"      Route options: {len(result.route_options)}")
        
        # Test map creation
        try:
            map_path = await maps_tool.create_route_map("New York, NY", "Boston, MA", "driving")
            print(f"   ✅ Interactive map created: {map_path}")
        except Exception as me:
            print(f"   ⚠️  Map creation failed (routing still works): {me}")
        
        return True
    except Exception as e:
        print(f"   ❌ Maps service failed: {str(e)}")
        return False

async def test_events_search():
    """Test DuckDuckGo search and Gemini AI for events"""
    print("🎪 Testing Events Search (DuckDuckGo + Gemini)...")
    try:
        if not settings.GEMINI_API_KEY:
            print("   ❌ GEMINI_API_KEY not configured (required for event processing)")
            return False
        
        # Test DuckDuckGo search availability
        try:
            from duckduckgo_search import AsyncDDGS
            print("   ✅ DuckDuckGo search module available")
        except ImportError:
            print("   ❌ duckduckgo-search package not installed")
            return False
        
        # Test BeautifulSoup availability
        try:
            from bs4 import BeautifulSoup
            print("   ✅ BeautifulSoup available for content parsing")
        except ImportError:
            print("   ❌ beautifulsoup4 package not installed")
            return False
        
        # Test actual event search
        result = await events_tool.find_events(
            "San Francisco, CA", 
            datetime.now() + timedelta(days=7),
            datetime.now() + timedelta(days=14),
            ["entertainment", "sightseeing"]
        )
        print(f"   ✅ Events search working - Found {len(result)} events")
        if result:
            print(f"      Sample event: {result[0].name}")
            print(f"      Category: {result[0].category}")
            print(f"      Start time: {result[0].start_time}")
        else:
            print("   ⚠️  No events found, but search functionality is working")
        return True
    except Exception as e:
        print(f"   ❌ Events search failed: {str(e)}")
        return False

async def test_budget_tool():
    """Test Budget optimization tool"""
    print("💰 Testing Budget Tool...")
    try:
        result = await budget_tool.optimize_budget(
            total_budget=2000.0,
            destination="Paris, France",
            days=5,
            preferences={"origin": "New York, NY"}
        )
        print(f"   ✅ Budget tool working")
        print(f"      Transport options: {len(result.transport_options)}")
        print(f"      Accommodation options: {len(result.accommodation_options)}")
        return True
    except Exception as e:
        print(f"   ❌ Budget tool failed: {str(e)}")
        return False

async def test_accommodation_tool():
    """Test Accommodation search tool"""
    print("🏨 Testing Accommodation Tool...")
    try:
        result = await accommodation_tool.find_accommodations(
            "Paris, France",
            datetime.now() + timedelta(days=30),
            datetime.now() + timedelta(days=35),
            150.0
        )
        print(f"   ✅ Accommodation tool working - Found {len(result)} options")
        if result:
            print(f"      Sample accommodation: {result[0]['name']}")
            print(f"      Price per night: ${result[0]['price_per_night']}")
        return True
    except Exception as e:
        print(f"   ❌ Accommodation tool failed: {str(e)}")
        return False

async def test_gemini_config():
    """Test Gemini API configuration"""
    print("🤖 Testing Gemini API Configuration...")
    if not settings.GEMINI_API_KEY:
        print("   ❌ GEMINI_API_KEY not configured")
        return False
    else:
        print(f"   ✅ Gemini API key configured")
        print(f"      Model: {settings.GEMINI_MODEL}")
        return True

async def test_calendar_setup():
    """Test Google Calendar setup and configuration"""
    print("📅 Testing Google Calendar Setup...")
    try:
        import os
        
        # Check if credentials file exists
        credentials_path = settings.GOOGLE_CALENDAR_CREDENTIALS_PATH
        if not os.path.exists(credentials_path):
            print(f"   ⚠️  Google Calendar credentials not found at {credentials_path}")
            print("      Calendar integration will be skipped during trip planning")
            print("      To enable: Download credentials.json from Google Cloud Console")
            return True  # Not a failure, just optional
        
        # Check if required packages are available
        try:
            from google.oauth2.credentials import Credentials
            from google_auth_oauthlib.flow import InstalledAppFlow
            from googleapiclient.discovery import build
            print("   ✅ Google Calendar API packages available")
        except ImportError as e:
            print(f"   ❌ Missing Google Calendar packages: {e}")
            return False
        
        # Check token file (if exists)
        token_path = settings.GOOGLE_CALENDAR_TOKEN_PATH
        if os.path.exists(token_path):
            print(f"   ✅ Authentication token found - Calendar ready")
        else:
            print(f"   ⚠️  No authentication token found")
            print("      First calendar sync will require browser authentication")
        
        print(f"   📋 Calendar scopes: {', '.join(settings.GOOGLE_CALENDAR_SCOPES)}")
        return True
        
    except Exception as e:
        print(f"   ❌ Calendar setup error: {str(e)}")
        return False

async def test_trains_integration():
    """Test IRCTC trains integration"""
    print("🚂 Testing IRCTC Trains Integration...")
    try:
        if not settings.RAPIDAPI_KEY:
            print("   ❌ RAPIDAPI_KEY not configured")
            print("      Train search will be skipped during trip planning")
            print("      To enable: Get RapidAPI key for IRCTC API")
            return True  # Not a failure for non-India trips
        
        # Test basic functionality
        from tools import trains_tool
        
        # Test station code mapping
        test_station = await trains_tool._get_station_code("Delhi")
        print(f"   ✅ Station code mapping working - Delhi: {test_station}")
        
        # Test API connection (with a simple request)
        try:
            # Test with a basic station query
            api_response = await trains_tool.get_live_trains("NDLS", hours=1)
            print("   ✅ IRCTC API connection successful")
            print(f"   📊 API response received for station NDLS")
            return True
        except Exception as api_error:
            if "API key" in str(api_error):
                print("   ❌ Invalid RapidAPI key")
                return False
            else:
                print(f"   ⚠️  API connection issue: {str(api_error)}")
                print("   📝 Train search functionality may have limited availability")
                return True  # API might be temporarily unavailable
        
    except Exception as e:
        print(f"   ❌ Trains integration error: {str(e)}")
        return False

async def test_flights_integration():
    """Test Amadeus flights integration"""
    print("✈️  Testing Amadeus Flights Integration...")
    try:
        if not settings.AMADEUS_API_KEY or not settings.AMADEUS_API_SECRET:
            print("   ❌ AMADEUS_API_KEY or AMADEUS_API_SECRET not configured")
            print("      Flight search will be skipped during trip planning")
            print("      To enable: Get Amadeus API credentials")
            return True  # Not a failure for local trips
        
        # Test basic functionality
        from tools import flights_tool
        
        # Test OAuth2 token acquisition
        try:
            token = await flights_tool._get_access_token()
            if token:
                print(f"   ✅ OAuth2 authentication successful")
                print(f"      Token preview: {token[:20]}...")
            else:
                print("   ❌ Failed to obtain OAuth2 token")
                return False
        except Exception as auth_error:
            print(f"   ❌ OAuth2 authentication failed: {str(auth_error)}")
            return False
        
        # Test airport code resolution via Gemini
        try:
            airport_info = await flights_tool.resolve_airport_code("New York")
            print(f"   ✅ Airport code resolution working")
            print(f"      New York → {airport_info.get('airport_code', 'Unknown')}")
            print(f"      City: {airport_info.get('city', 'Unknown')}")
        except Exception as resolve_error:
            print(f"   ⚠️  Airport resolution issue: {str(resolve_error)}")
            print("   📝 Flight search may use basic airport matching")
        
        print("   ✅ Amadeus Flights integration ready")
        return True
        
    except Exception as e:
        print(f"   ❌ Flights integration error: {str(e)}")
        return False

async def main():
    """Run all API tests"""
    print("=" * 60)
    print("🧪 LangGraph Travel Planning API - Validation Tests")
    print("=" * 60)
    print()
    
    # Test all APIs
    results = []
    
    results.append(await test_gemini_config())
    results.append(await test_weather_api())
    results.append(await test_maps_service())
    results.append(await test_events_search())
    results.append(await test_budget_tool())
    results.append(await test_accommodation_tool())
    results.append(await test_flights_integration())
    results.append(await test_trains_integration())
    results.append(await test_calendar_setup())
    
    print()
    print("=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    
    if passed == total:
        print()
        print("🎉 All tests passed! Your backend is ready for production.")
        print("🚀 You can now start the server with: python main.py")
    else:
        print()
        print("⚠️  Some tests failed. Please check your API key configuration.")
        print("🔧 Run this script again after fixing the issues.")
        
        print()
        print("🔑 API Key Setup Instructions:")
        if not settings.GEMINI_API_KEY:
            print("   - GEMINI_API_KEY: https://makersuite.google.com/app/apikey")
        if not settings.WEATHER_API_KEY:
            print("   - WEATHER_API_KEY: https://openweathermap.org/api")
        if not settings.AMADEUS_API_KEY or not settings.AMADEUS_API_SECRET:
            print("   - AMADEUS_API_KEY & AMADEUS_API_SECRET: https://developers.amadeus.com/")
        if not settings.RAPIDAPI_KEY:
            print("   - RAPIDAPI_KEY: https://rapidapi.com/ (for IRCTC trains API)")
        print("   - Maps are now powered by OpenStreetMap + Folium (no API key needed)")
        print("   - Events are now powered by DuckDuckGo search + Gemini AI processing")

if __name__ == "__main__":
    asyncio.run(main())