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
from ai_query_api import router as ai_router

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

# Include routers
app.include_router(calendar_router)
app.include_router(ai_router)

# In-memory storage for demo purposes (use proper database in production)
trip_store: Dict[str, Dict[str, Any]] = {}
comparison_store: Dict[str, Dict[str, Any]] = {}
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

class CityComparisonRequest(BaseModel):
    """Request model for city comparison"""
    origin: str
    destinationCity1: str
    destinationCity2: str
    travelDate: str
    returnDate: str
    passengers: int
    budgetLevel: str  # 'low', 'medium', 'high'
    
from typing import Optional, Dict, Any, List

class CityComparisonResponse(BaseModel):
    """Response model for city comparison"""
    comparison_id: str
    status: str
    city1_data: Optional[Dict[str, Any]] = None
    city2_data: Optional[Dict[str, Any]] = None
    analysis: Optional[Dict[str, Any]] = None
    processing_time: Optional[float] = None
    errors: List[str] = []

@app.post("/api/v1/cities/compare")
async def compare_cities(request: CityComparisonRequest, background_tasks: BackgroundTasks):
    """
    Compare two cities with weather, flights, trains, and budget data
    This provides a more efficient endpoint than running full trip planning for both cities
    """
    try:
        # Validate required API keys
        missing_keys = []
        if not settings.GEMINI_API_KEY:
            missing_keys.append("GEMINI_API_KEY")
        if not settings.WEATHER_API_KEY:
            missing_keys.append("WEATHER_API_KEY")
        
        if missing_keys:
            raise HTTPException(
                status_code=500, 
                detail=f"Missing required API keys: {', '.join(missing_keys)}. Please configure these in your environment variables."
            )
        
        # Generate unique comparison ID
        comparison_id = str(uuid.uuid4())
        
        # Store comparison in store
        comparison_store[comparison_id] = {
            "comparison_id": comparison_id,
            "status": "started",
            "request": request.dict(),
            "start_time": datetime.now(),
            "city1_data": None,
            "city2_data": None,
            "analysis": None,
            "errors": [],
            "processing_time": None
        }
        
        # Start background task for comparison
        task = asyncio.create_task(process_city_comparison(comparison_id, request))
        active_tasks[comparison_id] = task
        
        return {
            "comparison_id": comparison_id,
            "status": "started",
            "message": "City comparison initiated. Use the status endpoint to check progress.",
            "status_url": f"/api/v1/cities/compare/{comparison_id}/status"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start city comparison: {str(e)}")

@app.get("/api/v1/cities/compare/{comparison_id}/status")
async def get_comparison_status(comparison_id: str):
    """Get the current status of a city comparison process"""
    if comparison_id not in comparison_store:
        raise HTTPException(status_code=404, detail="Comparison not found")
    
    comparison_data = comparison_store[comparison_id]
    
    return {
        "comparison_id": comparison_id,
        "status": comparison_data["status"],
        "city1_data": comparison_data.get("city1_data") is not None,
        "city2_data": comparison_data.get("city2_data") is not None,
        "errors": comparison_data.get("errors", []),
        "processing_time": comparison_data.get("processing_time")
    }

@app.get("/api/v1/cities/compare/{comparison_id}/result")
async def get_comparison_result(comparison_id: str):
    """Get the complete result of a city comparison process"""
    if comparison_id not in comparison_store:
        raise HTTPException(status_code=404, detail="Comparison not found")
    
    comparison_data = comparison_store[comparison_id]
    
    if comparison_data["status"] == "processing":
        raise HTTPException(status_code=202, detail="City comparison still in progress")
    
    if comparison_data["status"] == "failed":
        errors = comparison_data.get("errors", [])
        error_msg = "; ".join(errors) if errors else "Unknown error"
        raise HTTPException(status_code=500, detail=f"City comparison failed: {error_msg}")
    
    return {
        "comparison_id": comparison_id,
        "status": comparison_data["status"],
        "city1_data": comparison_data.get("city1_data"),
        "city2_data": comparison_data.get("city2_data"),
        "analysis": comparison_data.get("analysis"),
        "processing_time": comparison_data.get("processing_time"),
        "errors": comparison_data.get("errors", [])
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

async def process_city_comparison(comparison_id: str, request: CityComparisonRequest):
    """Background task to process city comparison"""
    start_time = datetime.now()
    
    try:
        # Update status
        comparison_store[comparison_id]["status"] = "processing"
        
        from tools import weather_tool, flights_tool, trains_tool
        import json
        from langchain_google_genai import ChatGoogleGenerativeAI
        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3
        )
        
        # Parse dates
        travel_date = datetime.strptime(request.travelDate, "%Y-%m-%d")
        return_date = datetime.strptime(request.returnDate, "%Y-%m-%d")
        
        # Get budget amount based on level
        budget_amounts = {"low": 1000, "medium": 2500, "high": 5000}
        budget_amount = budget_amounts.get(request.budgetLevel, 2500)
        
        # Process both cities in parallel
        tasks = [
            get_city_data(request.destinationCity1, request.origin, travel_date, return_date, 
                         request.passengers, budget_amount, request.budgetLevel, 
                         weather_tool, flights_tool, trains_tool, llm),
            get_city_data(request.destinationCity2, request.origin, travel_date, return_date, 
                         request.passengers, budget_amount, request.budgetLevel, 
                         weather_tool, flights_tool, trains_tool, llm)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        city1_data = results[0] if not isinstance(results[0], Exception) else None
        city2_data = results[1] if not isinstance(results[1], Exception) else None
        
        errors = []
        if isinstance(results[0], Exception):
            errors.append(f"Error for {request.destinationCity1}: {str(results[0])}")
        if isinstance(results[1], Exception):
            errors.append(f"Error for {request.destinationCity2}: {str(results[1])}")
        
        # Generate comparison analysis
        analysis = None
        if city1_data and city2_data:
            analysis = await generate_comparison_analysis(city1_data, city2_data, llm)
        
        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Update with results
        comparison_store[comparison_id]["status"] = "completed"
        comparison_store[comparison_id]["city1_data"] = city1_data
        comparison_store[comparison_id]["city2_data"] = city2_data
        comparison_store[comparison_id]["analysis"] = analysis
        comparison_store[comparison_id]["processing_time"] = processing_time
        comparison_store[comparison_id]["errors"] = errors
        
    except Exception as e:
        processing_time = (datetime.now() - start_time).total_seconds()
        comparison_store[comparison_id]["status"] = "failed"
        comparison_store[comparison_id]["processing_time"] = processing_time
        comparison_store[comparison_id]["errors"] = [str(e)]
    
    finally:
        # Clean up task reference
        if comparison_id in active_tasks:
            del active_tasks[comparison_id]

async def get_city_data(city: str, origin: str, travel_date: datetime, return_date: datetime, 
                       passengers: int, budget: float, budget_level: str, 
                       weather_tool, flights_tool, trains_tool, llm):
    """Get comprehensive data for a single city"""
    try:
        # Get weather data
        weather_data = None
        try:
            weather_forecast = await weather_tool.get_weather_forecast(city, travel_date, return_date)
            weather_data = {
                "location": weather_forecast.location,
                "temperature": {
                    "current": weather_forecast.temperature_range.get("current", 20),
                    "min": weather_forecast.temperature_range.get("min", 15), 
                    "max": weather_forecast.temperature_range.get("max", 25),
                    "feelsLike": weather_forecast.temperature_range.get("feels_like", 20)
                },
                "condition": weather_forecast.conditions,
                "humidity": 60,
                "windSpeed": 15,
                "pressure": 1013,
                "visibility": 10,
                "uvIndex": 5,
                "precipitation": int(weather_forecast.precipitation_chance * 100),
                "description": f"Weather in {city}",
                "icon": weather_forecast.conditions.lower().replace(" ", "_")
            }
        except Exception as e:
            print(f"Weather error for {city}: {e}")
            weather_data = get_fallback_weather(city)
        
        # Get real flight data only - no fallbacks
        flights_data = []
        try:
            print(f"Attempting to fetch real flight data from {origin} to {city}...")
            flights_result = await flights_tool.search_flights(
                origin_city=origin,
                destination_city=city, 
                departure_date=travel_date.strftime("%Y-%m-%d")
            )
            
            if flights_result and hasattr(flights_result, 'flights') and flights_result.flights:
                print(f"✅ Found {len(flights_result.flights)} real flights")
                for i, flight in enumerate(flights_result.flights[:3]):
                    # Only use real flight data - no defaults or estimates
                    if flight.carrier_name and flight.flight_number:
                        flights_data.append({
                            "id": f"flight-{i+1}",
                            "airline": flight.carrier_name,
                            "flightNumber": flight.flight_number,
                            "departure": {
                                "time": flight.departure_time,
                                "airport": f"{origin} Airport",
                                "airportCode": flight.departure_airport or origin[:3].upper()
                            },
                            "arrival": {
                                "time": flight.arrival_time,
                                "airport": f"{city} Airport", 
                                "airportCode": flight.arrival_airport or city[:3].upper()
                            },
                            "duration": flight.duration,
                            "stops": getattr(flight, 'stops', 0),
                            "price": {
                                "economy": getattr(flight, 'price', None) or "Price not available",
                                "business": "Price not available",
                                "first": "Price not available"
                            },
                            "aircraft": flight.aircraft_type or "Aircraft info not available",
                            "amenities": getattr(flight, 'amenities', ["Information not available"])
                        })
            else:
                print(f"❌ No real flight data available from API")
                # No fallback - just empty list
                flights_data = []
        except Exception as e:
            print(f"❌ Flight API error for {city}: {e}")
            # No fallback - just empty list 
            flights_data = []
        
        # Get real train data only - no fallbacks
        trains_data = []
        try:
            print(f"Attempting to fetch real train data from {origin} to {city}...")
            trains_result = await trains_tool.search_trains_between_cities(
                origin=origin,
                destination=city,
                travel_date=travel_date
            )
            
            if trains_result and isinstance(trains_result, list) and len(trains_result) > 0:
                # Filter out error/suggestion entries and only process real train data
                real_trains = []
                for train in trains_result:
                    train_num = train.get('train_number', '')
                    # Skip error entries, system suggestions, and entries without proper train numbers
                    if (train_num.upper() not in ['STATION_ERROR', 'SEARCH_REQUIRED', 'ERROR'] and 
                        train_num != 'N/A' and 
                        train.get('departure_time') != 'N/A' and
                        train.get('data_source') not in ['station_resolution_error', 'system_suggestion', 'error_handler']):
                        real_trains.append(train)
                
                if real_trains:
                    print(f"✅ Found {len(real_trains)} real trains")
                    for i, train in enumerate(real_trains[:2]):
                        trains_data.append({
                            "id": f"train-{i+1}",
                            "trainNumber": train.get('train_number'),
                            "operator": train.get('operator', 'Railway operator'),
                            "departure": {
                                "time": train.get('departure_time'),
                                "station": train.get('from_station'),
                                "stationCode": train.get('from_station_code')
                            },
                            "arrival": {
                                "time": train.get('arrival_time'),
                                "station": train.get('to_station'), 
                                "stationCode": train.get('to_station_code')
                            },
                            "duration": train.get('duration'),
                            "price": {
                                "economy": "Price on booking",
                                "business": "Price on booking",
                                "first": "Price on booking"
                            },
                            "class": "Multiple classes available",
                            "amenities": train.get('classes_available', ['Standard amenities'])
                        })
                else:
                    print(f"❌ No real trains found - API unavailable or no direct trains")
                    trains_data = []
            else:
                print(f"❌ No real train data available from API")
                # No fallback - just empty list
                trains_data = []
        except Exception as e:
            print(f"❌ Train API error for {city}: {e}")
            # No fallback - just empty list
            trains_data = []
        
        # Generate budget estimate with city-specific variations
        budget_multipliers = {"low": 0.7, "medium": 1.0, "high": 1.5}
        multiplier = budget_multipliers.get(budget_level, 1.0)
        
        # City-specific base costs (different for each city)
        city_cost_variations = {
            'paris': {'accommodation': 95, 'food': 55, 'localTransport': 30, 'activities': 50},
            'london': {'accommodation': 100, 'food': 50, 'localTransport': 35, 'activities': 45}, 
            'tokyo': {'accommodation': 85, 'food': 40, 'localTransport': 20, 'activities': 35},
            'rome': {'accommodation': 70, 'food': 40, 'localTransport': 25, 'activities': 35},
            'berlin': {'accommodation': 65, 'food': 35, 'localTransport': 20, 'activities': 30},
            'new york': {'accommodation': 120, 'food': 60, 'localTransport': 40, 'activities': 55},
            'madrid': {'accommodation': 75, 'food': 45, 'localTransport': 25, 'activities': 35},
            'barcelona': {'accommodation': 80, 'food': 45, 'localTransport': 25, 'activities': 40},
            'amsterdam': {'accommodation': 90, 'food': 50, 'localTransport': 30, 'activities': 40}
        }
        
        # Get city-specific costs or use default
        base_costs = city_cost_variations.get(city.lower(), {
            'accommodation': 80, 'food': 45, 'localTransport': 25, 'activities': 40
        })
        
        # Apply budget level multiplier and add some randomness for variation
        import random
        daily_costs = {}
        for k, v in base_costs.items():
            # Add ±10% random variation to make cities different
            variation = random.uniform(0.9, 1.1)
            daily_costs[k] = int(v * multiplier * variation)
        
        daily_total = sum(daily_costs.values())
        
        trip_days = (return_date - travel_date).days or 1
        trip_costs = {k: v * trip_days for k, v in daily_costs.items()}
        trip_total = sum(trip_costs.values())
        
        budget_data = {
            "location": city,
            "budgetLevel": budget_level,
            "daily": {**daily_costs, "total": daily_total},
            "trip": {**trip_costs, "total": trip_total},
            "currency": "USD",
            "recommendations": {
                "accommodationType": "Hotel" if budget_level == "medium" else "Luxury Hotel" if budget_level == "high" else "Hostel",
                "foodTips": ["Try local cuisine", "Visit markets", "Look for lunch specials"],
                "transportTips": ["Use public transport", "Walk when possible", "Consider day passes"],
                "activityTips": ["Check for free museums", "Walking tours", "Local events"]
            }
        }
        
        return {
            "city": city,
            "country": get_city_country(city),
            "weather": weather_data,
            "flights": flights_data,
            "trains": trains_data,
            "budget": budget_data,
            "attractions": get_city_attractions(city),
            "bestTimeToVisit": get_best_time_to_visit(city),
            "timezone": get_city_timezone(city),
            "currency": get_city_currency(city),
            "language": get_city_language(city)
        }
        
    except Exception as e:
        raise Exception(f"Failed to get data for {city}: {str(e)}")

async def generate_comparison_analysis(city1_data, city2_data, llm):
    """Generate AI-powered comparison analysis between two cities"""
    try:
        city1 = city1_data["city"]
        city2 = city2_data["city"]
        
        prompt = f"""
        Compare these two travel destinations and provide insights:
        
        {city1}:
        - Weather: {city1_data['weather']['condition']} ({city1_data['weather']['temperature']['current']}°C)
        - Budget (trip total): ${city1_data['budget']['trip']['total']}
        - Flights available: {len(city1_data['flights'])}
        - Trains available: {len(city1_data['trains'])}
        - Attractions: {', '.join(city1_data['attractions'][:3])}
        
        {city2}:
        - Weather: {city2_data['weather']['condition']} ({city2_data['weather']['temperature']['current']}°C) 
        - Budget (trip total): ${city2_data['budget']['trip']['total']}
        - Flights available: {len(city2_data['flights'])}
        - Trains available: {len(city2_data['trains'])}
        - Attractions: {', '.join(city2_data['attractions'][:3])}
        
        Provide:
        1. Which city is more budget-friendly
        2. Which has better weather
        3. Transportation comparison
        4. 3-4 key recommendations
        
        Keep it concise and practical.
        """
        
        response = await llm.ainvoke(prompt)
        analysis_text = response.content
        
        # Determine winners in different categories
        city1_budget = city1_data['budget']['trip']['total']
        city2_budget = city2_data['budget']['trip']['total']
        cheaper_city = 'city1' if city1_budget < city2_budget else 'city2' if city2_budget < city1_budget else 'similar'
        
        city1_temp = city1_data['weather']['temperature']['current']
        city2_temp = city2_data['weather']['temperature']['current']
        # Ideal temperature range 18-25°C
        city1_temp_score = abs(city1_temp - 21.5)  # Distance from ideal
        city2_temp_score = abs(city2_temp - 21.5)
        better_weather = 'city1' if city1_temp_score < city2_temp_score else 'city2' if city2_temp_score < city1_temp_score else 'similar'
        
        better_flights = 'city1' if len(city1_data['flights']) > len(city2_data['flights']) else 'city2' if len(city2_data['flights']) > len(city1_data['flights']) else 'similar'
        better_trains = 'city1' if len(city1_data['trains']) > len(city2_data['trains']) else 'city2' if len(city2_data['trains']) > len(city1_data['trains']) else 'similar'
        
        return {
            "cheaperCity": cheaper_city,
            "betterWeather": better_weather,
            "betterFlights": better_flights,
            "betterTrains": better_trains,
            "recommendations": analysis_text.split('\n')[-4:] if '\n' in analysis_text else [analysis_text]
        }
        
    except Exception as e:
        print(f"Error generating analysis: {e}")
        return {
            "cheaperCity": "similar",
            "betterWeather": "similar", 
            "betterFlights": "similar",
            "betterTrains": "similar",
            "recommendations": ["Both cities offer unique travel experiences"]
        }

def get_fallback_weather(city):
    """Get fallback weather data for a city"""
    weather_data = {
        'paris': {'condition': 'Partly Cloudy', 'temp': 18, 'humidity': 65},
        'london': {'condition': 'Light Rain', 'temp': 15, 'humidity': 78},
        'tokyo': {'condition': 'Clear', 'temp': 24, 'humidity': 55},
        'rome': {'condition': 'Sunny', 'temp': 26, 'humidity': 45},
        'new york': {'condition': 'Partly Cloudy', 'temp': 20, 'humidity': 60},
        'berlin': {'condition': 'Cloudy', 'temp': 16, 'humidity': 70}
    }
    
    base = weather_data.get(city.lower(), weather_data['paris'])
    
    return {
        "location": city,
        "temperature": {
            "current": base['temp'],
            "min": base['temp'] - 5,
            "max": base['temp'] + 5,
            "feelsLike": base['temp']
        },
        "condition": base['condition'],
        "humidity": base['humidity'],
        "windSpeed": 15,
        "pressure": 1013,
        "visibility": 10,
        "uvIndex": 5,
        "precipitation": 20,
        "description": f"Weather in {city}",
        "icon": base['condition'].lower().replace(' ', '_')
    }

def get_fallback_flights(origin, destination):
    """Get fallback flight data"""
    airlines = ['Air France', 'British Airways', 'Lufthansa', 'KLM']
    flights = []
    
    for i in range(3):
        airline = airlines[i % len(airlines)]
        base_price = 400 + i * 100
        
        flights.append({
            "id": f"flight-{i+1}",
            "airline": airline,
            "flightNumber": f"{airline[:2].upper()}{1000+i}",
            "departure": {
                "time": f"{8 + i*2}:00",
                "airport": f"{origin} Airport",
                "airportCode": origin[:3].upper()
            },
            "arrival": {
                "time": f"{12 + i*2}:00", 
                "airport": f"{destination} Airport",
                "airportCode": destination[:3].upper()
            },
            "duration": f"{4 + i}h 30m",
            "stops": i % 2,
            "price": {
                "economy": base_price,
                "business": int(base_price * 2.5),
                "first": int(base_price * 4)
            },
            "aircraft": "Boeing 737-800",
            "amenities": ["WiFi", "Entertainment", "Meals"]
        })
    
    return flights

def get_city_country(city):
    """Get country for a city"""
    countries = {
        'paris': 'France', 'london': 'United Kingdom', 'tokyo': 'Japan',
        'rome': 'Italy', 'berlin': 'Germany', 'amsterdam': 'Netherlands',
        'madrid': 'Spain', 'barcelona': 'Spain', 'new york': 'United States',
        'los angeles': 'United States', 'chicago': 'United States'
    }
    return countries.get(city.lower(), 'Unknown')

def get_city_attractions(city):
    """Get attractions for a city"""
    attractions = {
        'paris': ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame', 'Arc de Triomphe'],
        'london': ['Big Ben', 'London Eye', 'Tower Bridge', 'British Museum'],
        'tokyo': ['Tokyo Tower', 'Senso-ji Temple', 'Shibuya Crossing', 'Mount Fuji'],
        'rome': ['Colosseum', 'Vatican City', 'Trevi Fountain', 'Pantheon'],
        'berlin': ['Brandenburg Gate', 'Berlin Wall', 'Museum Island', 'Reichstag'],
        'new york': ['Statue of Liberty', 'Central Park', 'Times Square', 'Brooklyn Bridge']
    }
    return attractions.get(city.lower(), ['City Center', 'Local Museum', 'Historic District'])

def get_best_time_to_visit(city):
    """Get best time to visit a city"""
    times = {
        'paris': 'April to October', 'london': 'May to September',
        'tokyo': 'March to May, September to November',
        'rome': 'April to June, September to October',
        'berlin': 'May to September', 'new york': 'April to June, September to November'
    }
    return times.get(city.lower(), 'Year-round')

def get_city_timezone(city):
    """Get timezone for a city"""
    timezones = {
        'paris': 'CET (UTC+1)', 'london': 'GMT (UTC+0)', 'tokyo': 'JST (UTC+9)',
        'rome': 'CET (UTC+1)', 'berlin': 'CET (UTC+1)', 'new york': 'EST (UTC-5)'
    }
    return timezones.get(city.lower(), 'UTC+0')

def get_city_currency(city):
    """Get currency for a city"""
    currencies = {
        'paris': 'EUR', 'london': 'GBP', 'tokyo': 'JPY', 'rome': 'EUR',
        'berlin': 'EUR', 'new york': 'USD'
    }
    return currencies.get(city.lower(), 'USD')

def get_city_language(city):
    """Get language for a city"""
    languages = {
        'paris': 'French', 'london': 'English', 'tokyo': 'Japanese',
        'rome': 'Italian', 'berlin': 'German', 'new york': 'English'
    }
    return languages.get(city.lower(), 'English')

def get_estimated_flight_price(origin, destination):
    """Get estimated flight price based on route popularity and distance"""
    # Route-based pricing (in USD)
    route_prices = {
        ('new york', 'paris'): 650,
        ('new york', 'london'): 580,
        ('new york', 'rome'): 720,
        ('new york', 'berlin'): 680,
        ('new york', 'tokyo'): 980,
        ('london', 'paris'): 180,
        ('london', 'rome'): 220,
        ('london', 'berlin'): 160,
        ('london', 'tokyo'): 850,
        ('paris', 'rome'): 190,
        ('paris', 'berlin'): 150,
        ('paris', 'tokyo'): 780,
        ('rome', 'berlin'): 180,
        ('rome', 'tokyo'): 820,
        ('berlin', 'tokyo'): 750
    }
    
    # Check both directions
    route_key = (origin.lower(), destination.lower())
    reverse_key = (destination.lower(), origin.lower())
    
    if route_key in route_prices:
        return route_prices[route_key]
    elif reverse_key in route_prices:
        return route_prices[reverse_key]
    else:
        # Default pricing based on rough distance categories
        if 'tokyo' in [origin.lower(), destination.lower()]:
            return 850  # Long haul to/from Asia
        elif origin.lower() == 'new york' or destination.lower() == 'new york':
            return 650  # Transatlantic
        else:
            return 200  # European routes

def get_enhanced_fallback_flights(origin, destination):
    """Get enhanced fallback flight data with realistic pricing"""
    import random
    
    airlines = {
        'european': ['Air France', 'British Airways', 'Lufthansa', 'KLM', 'Alitalia'],
        'us': ['American Airlines', 'Delta', 'United Airlines'],
        'asian': ['Japan Airlines', 'ANA', 'Cathay Pacific'],
        'international': ['Emirates', 'Qatar Airways', 'Turkish Airlines']
    }
    
    # Determine route type
    origin_lower = origin.lower()
    dest_lower = destination.lower()
    
    if origin_lower == 'new york':
        if dest_lower in ['tokyo']:
            available_airlines = airlines['us'] + airlines['asian'] + airlines['international']
        else:
            available_airlines = airlines['us'] + airlines['european'] + airlines['international']
    elif 'tokyo' in [origin_lower, dest_lower]:
        available_airlines = airlines['asian'] + airlines['international']
    else:
        available_airlines = airlines['european']
    
    base_price = get_estimated_flight_price(origin, destination)
    flights = []
    
    for i in range(3):
        airline = random.choice(available_airlines)
        # Add some price variation
        price_variation = random.uniform(0.85, 1.25)
        flight_price = int(base_price * price_variation)
        
        # Generate realistic times
        departure_hour = random.choice([6, 8, 10, 14, 16, 18, 20])
        departure_min = random.choice([0, 15, 30, 45])
        
        # Duration varies by route
        if 'tokyo' in [origin_lower, dest_lower] and origin_lower == 'new york':
            duration_hours = random.randint(13, 16)
        elif origin_lower == 'new york':
            duration_hours = random.randint(6, 9)
        else:
            duration_hours = random.randint(1, 4)
        
        duration_mins = random.randint(0, 59)
        
        flights.append({
            "id": f"flight-{i+1}",
            "airline": airline,
            "flightNumber": f"{airline[:2].upper()}{random.randint(1000, 9999)}",
            "departure": {
                "time": f"{departure_hour:02d}:{departure_min:02d}",
                "airport": f"{origin} Airport",
                "airportCode": origin[:3].upper()
            },
            "arrival": {
                "time": f"{(departure_hour + duration_hours) % 24:02d}:{(departure_min + duration_mins) % 60:02d}",
                "airport": f"{destination} Airport",
                "airportCode": destination[:3].upper()
            },
            "duration": f"{duration_hours}h {duration_mins}m",
            "stops": random.choice([0, 0, 1]) if duration_hours > 6 else 0,  # Longer flights more likely to have stops
            "price": {
                "economy": flight_price,
                "business": int(flight_price * 2.8),
                "first": int(flight_price * 4.5)
            },
            "aircraft": random.choice(["Boeing 737-800", "Airbus A320", "Boeing 777", "Airbus A350"]),
            "amenities": ["WiFi", "Entertainment", "Meals"] if duration_hours > 3 else ["WiFi", "Snacks"]
        })
    
    return flights

# Train helper functions removed - no fallback data used anymore

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