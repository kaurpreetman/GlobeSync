from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
import uuid
from datetime import datetime
import asyncio

from models import TripRequest, TripSummary, UserPreferences
from orchestrator import orchestrator
from config import settings
from calendar_api import router as calendar_router

# Initialize FastAPI app
app = FastAPI(
    title="LangGraph Travel Planning API",
    description="AI-powered travel planning system using LangGraph and multiple specialized agents",
    version="1.0.0",
    debug=settings.DEBUG
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include calendar router
app.include_router(calendar_router)

# In-memory storage for demo purposes (use proper database in production)
trip_store: Dict[str, Dict[str, Any]] = {}
active_tasks: Dict[str, asyncio.Task] = {}

class TripPlanRequest(BaseModel):
    """Request model for trip planning"""
    user_id: str
    destination: str
    start_date: datetime
    end_date: datetime
    budget: float
    preferences: Optional[UserPreferences] = None

class TripStatusResponse(BaseModel):
    """Response model for trip status"""
    trip_id: str
    status: str
    current_step: str
    completed_agents: list
    progress_percentage: int
    estimated_completion_time: Optional[str] = None
    error_message: Optional[str] = None

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "LangGraph Travel Planning API",
        "version": "1.0.0",
        "status": "active",
        "agents": ["weather", "maps", "events", "budget", "itinerary"],
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/api/v1/system/config")
async def get_system_config():
    """Get system configuration and API key status"""
    api_keys_status = {
        "gemini_api_key": "configured" if settings.GEMINI_API_KEY else "missing",
        "weather_api_key": "configured" if settings.WEATHER_API_KEY else "missing",
    }
    
    all_configured = all(status == "configured" for status in api_keys_status.values())
    
    return {
        "system_ready": all_configured,
        "api_keys": api_keys_status,
        "gemini_model": settings.GEMINI_MODEL,
        "configuration_instructions": {
            "gemini_api_key": "Get from Google AI Studio: https://makersuite.google.com/app/apikey",
            "weather_api_key": "Get from OpenWeatherMap: https://openweathermap.org/api",
        },
        "required_apis": {
            "weather": "OpenWeatherMap One Call API 3.0",
            "ai": "Google Gemini 2.5-flash"
        }
    }

@app.post("/api/v1/trips/plan")
async def plan_trip(request: TripPlanRequest, background_tasks: BackgroundTasks):
    """
    Start a new trip planning process
    This will initiate the LangGraph workflow with all agents
    """
    try:
        # Validate required API keys
        missing_keys = []
        if not settings.GEMINI_API_KEY:
            missing_keys.append("GEMINI_API_KEY")
        if not settings.WEATHER_API_KEY:
            missing_keys.append("WEATHER_API_KEY")
        # Maps now use OpenStreetMap (no API key needed)
        # Events now use DuckDuckGo search + Gemini (no additional API key needed)
        
        if missing_keys:
            raise HTTPException(
                status_code=500, 
                detail=f"Missing required API keys: {', '.join(missing_keys)}. Please configure these in your environment variables."
            )
        
        # Generate unique trip ID
        trip_id = str(uuid.uuid4())
        
        # Convert request to TripRequest model
        trip_request = TripRequest(
            user_id=request.user_id,
            destination=request.destination,
            start_date=request.start_date,
            end_date=request.end_date,
            budget=request.budget,
            preferences=request.preferences.dict() if request.preferences else None
        )
        
        # Initialize trip in store
        trip_store[trip_id] = {
            "trip_id": trip_id,
            "status": "started",
            "current_step": "initializing",
            "completed_agents": [],
            "start_time": datetime.now(),
            "trip_request": trip_request.dict(),
            "result": None,
            "error": None
        }
        
        # Start background task for trip planning
        task = asyncio.create_task(process_trip_planning(trip_id, trip_request))
        active_tasks[trip_id] = task
        
        return {
            "trip_id": trip_id,
            "status": "started",
            "message": "Trip planning initiated. Use the status endpoint to check progress.",
            "status_url": f"/api/v1/trips/{trip_id}/status"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start trip planning: {str(e)}")

async def process_trip_planning(trip_id: str, trip_request: TripRequest):
    """Background task to process trip planning"""
    try:
        # Update status
        trip_store[trip_id]["status"] = "processing"
        trip_store[trip_id]["current_step"] = "weather_analysis"
        
        # Run the orchestrator
        result = await orchestrator.plan_trip(trip_request)
        
        # Update with results
        trip_store[trip_id]["status"] = "completed"
        trip_store[trip_id]["current_step"] = "finished"
        trip_store[trip_id]["result"] = result
        trip_store[trip_id]["end_time"] = datetime.now()
        trip_store[trip_id]["completed_agents"] = result.get("completed_agents", [])
        
    except Exception as e:
        # Update with error
        trip_store[trip_id]["status"] = "failed"
        trip_store[trip_id]["error"] = str(e)
        trip_store[trip_id]["end_time"] = datetime.now()
    
    finally:
        # Clean up task reference
        if trip_id in active_tasks:
            del active_tasks[trip_id]

@app.get("/api/v1/trips/{trip_id}/status")
async def get_trip_status(trip_id: str):
    """Get the current status of a trip planning process"""
    if trip_id not in trip_store:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip_data = trip_store[trip_id]
    
    # Calculate progress percentage
    total_agents = 5  # weather, maps, events, budget, itinerary
    completed_count = len(trip_data.get("completed_agents", []))
    progress_percentage = min(int((completed_count / total_agents) * 100), 100)
    
    return TripStatusResponse(
        trip_id=trip_id,
        status=trip_data["status"],
        current_step=trip_data["current_step"],
        completed_agents=trip_data.get("completed_agents", []),
        progress_percentage=progress_percentage,
        estimated_completion_time=None,  # Could implement ETA calculation
        error_message=trip_data.get("error")
    )

@app.get("/api/v1/trips/{trip_id}/result")
async def get_trip_result(trip_id: str):
    """Get the complete result of a trip planning process"""
    if trip_id not in trip_store:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    trip_data = trip_store[trip_id]
    
    if trip_data["status"] == "processing":
        raise HTTPException(status_code=202, detail="Trip planning still in progress")
    
    if trip_data["status"] == "failed":
        raise HTTPException(status_code=500, detail=f"Trip planning failed: {trip_data.get('error')}")
    
    return {
        "trip_id": trip_id,
        "status": trip_data["status"],
        "result": trip_data.get("result"),
        "processing_time": (
            trip_data.get("end_time", datetime.now()) - trip_data["start_time"]
        ).total_seconds(),
        "completed_agents": trip_data.get("completed_agents", [])
    }

@app.get("/api/v1/trips")
async def list_trips(user_id: Optional[str] = None):
    """List all trips, optionally filtered by user_id"""
    trips = []
    
    for trip_id, trip_data in trip_store.items():
        trip_request = trip_data.get("trip_request", {})
        
        # Filter by user_id if provided
        if user_id and trip_request.get("user_id") != user_id:
            continue
        
        trips.append({
            "trip_id": trip_id,
            "user_id": trip_request.get("user_id"),
            "destination": trip_request.get("destination"),
            "status": trip_data["status"],
            "start_time": trip_data["start_time"],
            "current_step": trip_data["current_step"]
        })
    
    return {"trips": trips, "total": len(trips)}

@app.delete("/api/v1/trips/{trip_id}")
async def cancel_trip(trip_id: str):
    """Cancel an ongoing trip planning process"""
    if trip_id not in trip_store:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Cancel the task if it's still running
    if trip_id in active_tasks:
        task = active_tasks[trip_id]
        task.cancel()
        del active_tasks[trip_id]
    
    # Update status
    trip_store[trip_id]["status"] = "cancelled"
    trip_store[trip_id]["end_time"] = datetime.now()
    
    return {"message": "Trip planning cancelled successfully"}

@app.get("/api/v1/agents")
async def list_agents():
    """List all available agents and their capabilities"""
    return {
        "agents": [
            {
                "name": "weather_agent",
                "description": "Provides weather forecasts and travel recommendations",
                "capabilities": ["weather_forecast", "clothing_recommendations", "activity_suggestions"]
            },
            {
                "name": "maps_agent",
                "description": "Handles route planning and location services",
                "capabilities": ["route_planning", "distance_calculation", "transport_options"]
            },
            {
                "name": "events_agent",
                "description": "Finds and recommends events and activities",
                "capabilities": ["event_discovery", "activity_recommendations", "booking_information"]
            },
            {
                "name": "budget_agent",
                "description": "Optimizes budget allocation and finds cost-effective options",
                "capabilities": ["budget_optimization", "cost_estimation", "money_saving_tips"]
            },
            {
                "name": "itinerary_agent",
                "description": "Creates comprehensive travel itineraries",
                "capabilities": ["itinerary_creation", "schedule_optimization", "activity_coordination"]
            },
            {
                "name": "trains_agent",
                "description": "Finds and recommends train travel options using IRCTC",
                "capabilities": ["train_search", "route_analysis", "booking_recommendations", "india_railways"]
            },
            {
                "name": "calendar_agent",
                "description": "Syncs travel itinerary to Google Calendar",
                "capabilities": ["calendar_integration", "event_creation", "reminder_setup", "calendar_sharing"]
            }
        ],
        "orchestrator": {
            "name": "TravelOrchestrator",
            "description": "Coordinates all agents in a structured workflow",
            "workflow_steps": ["weather_analysis", "route_planning", "event_discovery", "budget_optimization", "itinerary_creation", "train_search", "calendar_sync", "trip_summary"]
        }
    }

@app.get("/api/v1/system/stats")
async def get_system_stats():
    """Get system statistics and performance metrics"""
    active_trips = len([t for t in trip_store.values() if t["status"] == "processing"])
    completed_trips = len([t for t in trip_store.values() if t["status"] == "completed"])
    failed_trips = len([t for t in trip_store.values() if t["status"] == "failed"])
    
    return {
        "total_trips": len(trip_store),
        "active_trips": active_trips,
        "completed_trips": completed_trips,
        "failed_trips": failed_trips,
        "active_tasks": len(active_tasks),
        "system_status": "operational",
        "uptime": datetime.now().isoformat()
    }

# Calendar Integration Endpoints

class CalendarSyncRequest(BaseModel):
    """Request model for manual calendar sync"""
    trip_id: str
    force_resync: bool = False
    calendar_name: Optional[str] = None

@app.post("/api/v1/trips/{trip_id}/calendar/sync")
async def sync_trip_to_calendar(trip_id: str, request: CalendarSyncRequest):
    """Manually sync a completed trip to Google Calendar"""
    try:
        if trip_id not in trip_store:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        trip_data = trip_store[trip_id]
        
        if trip_data["status"] != "completed":
            raise HTTPException(
                status_code=400, 
                detail="Trip must be completed before calendar sync"
            )
        
        # Get the completed itinerary
        trip_result = trip_data.get("result", {})
        itinerary = trip_result.get("itinerary")
        
        if not itinerary:
            raise HTTPException(
                status_code=400,
                detail="No itinerary found for this trip"
            )
        
        # Import calendar tool and perform sync
        from tools import calendar_tool
        from models import TripRequest
        
        # Reconstruct trip request
        trip_request_data = trip_data["trip_request"]
        trip_request = TripRequest(**trip_request_data)
        
        # Perform calendar sync
        calendar_result = await calendar_tool.sync_itinerary_to_calendar(itinerary, trip_request)
        
        # Update trip store with calendar information
        trip_data["calendar_integration"] = calendar_result.dict()
        
        return {
            "success": calendar_result.success,
            "calendar_url": calendar_result.trip_calendar_url,
            "events_created": len(calendar_result.created_events),
            "calendar_id": calendar_result.calendar_id,
            "errors": calendar_result.errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calendar sync failed: {str(e)}")

@app.get("/api/v1/trips/{trip_id}/calendar")
async def get_calendar_info(trip_id: str):
    """Get calendar integration information for a trip"""
    try:
        if trip_id not in trip_store:
            raise HTTPException(status_code=404, detail="Trip not found")
        
        trip_data = trip_store[trip_id]
        calendar_integration = trip_data.get("calendar_integration")
        
        if not calendar_integration:
            return {
                "integrated": False,
                "message": "Trip has not been synced to calendar yet"
            }
        
        return {
            "integrated": True,
            "calendar_url": calendar_integration.get("trip_calendar_url"),
            "events_count": len(calendar_integration.get("created_events", [])),
            "calendar_id": calendar_integration.get("calendar_id"),
            "sync_errors": calendar_integration.get("errors", [])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get calendar info: {str(e)}")

# Train Search Endpoints
class TrainSearchRequest(BaseModel):
    """Request model for train search"""
    origin: str
    destination: str
    travel_date: Optional[datetime] = None
    preferences: Optional[Dict[str, Any]] = None

@app.post("/api/v1/trains/search")
async def search_trains(request: TrainSearchRequest):
    """Search for trains between two cities"""
    try:
        from tools import trains_tool
        
        train_recommendations = await trains_tool.get_train_recommendations(
            origin=request.origin,
            destination=request.destination,
            travel_date=request.travel_date,
            preferences=request.preferences
        )
        
        return {
            "success": True,
            "data": train_recommendations,
            "search_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/trains/stations/{city}")
async def get_station_code(city: str):
    """Get railway station code for a city"""
    try:
        from tools import trains_tool
        
        station_code = await trains_tool._get_station_code(city)
        
        return {
            "city": city,
            "station_code": station_code,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/trains/live/{station_code}")
async def get_live_trains(station_code: str, hours: int = 1, to_station: Optional[str] = None):
    """Get live train information for a station"""
    try:
        from tools import trains_tool
        
        live_data = await trains_tool.get_live_trains(
            from_station_code=station_code,
            to_station_code=to_station,
            hours=hours
        )
        
        return {
            "success": True,
            "station_code": station_code,
            "data": live_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/flights/search")
async def search_flights(
    origin: str = Query(..., description="Origin city name"),
    destination: str = Query(..., description="Destination city name"),
    departure_date: str = Query(..., description="Departure date in YYYY-MM-DD format"),
    return_date: Optional[str] = Query(None, description="Return date in YYYY-MM-DD format (optional)"),
    passengers: int = Query(1, description="Number of passengers", ge=1, le=9)
):
    """Search for flights between two cities"""
    try:
        from tools import flights_tool
        
        flight_recommendations = await flights_tool.get_flight_recommendations(
            origin_city=origin,
            destination_city=destination,
            departure_date=departure_date,
            return_date=return_date,
            preferences={"passengers": passengers}
        )
        
        return {
            "success": True,
            "data": flight_recommendations,
            "search_id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/flights/airports/{city}")
async def get_airport_codes(city: str):
    """Get airport codes for a city using Gemini AI"""
    try:
        from tools import flights_tool
        
        airport_info = await flights_tool.resolve_airport_code(city)
        
        return {
            "city": city,
            "airport_info": airport_info,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/flights/price-search")
async def search_flight_prices_web(
    origin: str = Query(..., description="Origin city name"),
    destination: str = Query(..., description="Destination city name"),
    date: str = Query(..., description="Travel date in YYYY-MM-DD format")
):
    """Search for flight prices using DuckDuckGo web search and Gemini analysis"""
    try:
        from tools import flights_tool
        
        price_data = await flights_tool._search_flight_prices_web(origin, destination, date)
        
        return {
            "success": True,
            "data": price_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/trains/price-search")
async def search_train_prices_web(
    origin: str = Query(..., description="Origin city name"),
    destination: str = Query(..., description="Destination city name"),
    date: str = Query(..., description="Travel date in YYYY-MM-DD format")
):
    """Search for train prices using DuckDuckGo web search and Gemini analysis"""
    try:
        from tools import trains_tool
        
        price_data = await trains_tool._search_train_prices_web(origin, destination, date)
        
        return {
            "success": True,
            "data": price_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/trains/stations/{city}")
async def get_station_info(city: str):
    """Get railway station information for a city using Gemini AI"""
    try:
        from tools import trains_tool
        
        station_info = await trains_tool._get_station_code_with_gemini(city)
        
        return {
            "city": city,
            "station_info": station_info,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/calendar/setup")
async def get_calendar_setup_info():
    """Get information about Google Calendar setup requirements"""
    return {
        "setup_required": True,
        "requirements": [
            "Google Cloud Console project with Calendar API enabled",
            "OAuth2 credentials file (credentials.json)",
            "User authentication (will open browser for first-time setup)"
        ],
        "steps": [
            "1. Go to Google Cloud Console",
            "2. Create a new project or select existing one",
            "3. Enable Google Calendar API",
            "4. Create OAuth2 credentials for Desktop Application",
            "5. Download credentials.json and place in project root",
            "6. Run the application - it will open browser for authentication"
        ],
        "credentials_file": settings.GOOGLE_CALENDAR_CREDENTIALS_PATH,
        "scopes": settings.GOOGLE_CALENDAR_SCOPES
    }

# 🤖 Setup Gemini-Powered Chat API Routes for Conversational Planning
try:
    from chat_api_gemini import setup_chat_routes
    setup_chat_routes(app)
    print("✅ Gemini Chat API routes successfully integrated")
except ImportError as e:
    print(f"⚠️ Gemini Chat API not available: {e}")
except Exception as e:
    print(f"❌ Error setting up Gemini chat API: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )