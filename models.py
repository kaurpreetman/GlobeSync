from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal

# Base Models
class TripRequest(BaseModel):
    user_id: str
    destination: str
    start_date: datetime
    end_date: datetime
    budget: Decimal
    preferences: Optional[Dict[str, Any]] = None

class UserPreferences(BaseModel):
    accommodation_type: Optional[str] = None
    transport_options: List[str] = []
    activity_types: List[str] = []
    dietary_restrictions: List[str] = []
    accessibility_needs: List[str] = []

class Location(BaseModel):
    lat: float
    lng: float
    address: str
    city: str
    country: str

# Weather Models
class WeatherData(BaseModel):
    location: str
    forecast_data: Dict[str, Any]
    temperature_range: Dict[str, float]
    conditions: str
    precipitation_chance: float

# Maps Models
class RouteDetails(BaseModel):
    origin: Location
    destination: Location
    route_options: List[Any]
    distance: float
    travel_time: str
    transportation_mode: str
    route_geometry: Optional[List[List[float]]] = None  # Path to generated Folium map

# Events Models
class Event(BaseModel):
    id: str
    name: str
    description: str
    location: Location
    start_time: datetime
    end_time: datetime
    category: str
    price: Optional[Decimal] = None
    booking_url: Optional[str] = None

# Budget Models
class BudgetBreakdown(BaseModel):
    total_budget: Decimal
    accommodation: Decimal
    transportation: Decimal
    food: Decimal
    activities: Decimal
    miscellaneous: Decimal

class BudgetOptions(BaseModel):
    transport_options: List[Dict[str, Any]]
    accommodation_options: List[Dict[str, Any]]
    total_cost: Decimal

# Itinerary Models
class ItineraryItem(BaseModel):
    id: str
    day: int
    time: str
    activity: str
    location: Location
    duration: str
    cost_estimate: Optional[Decimal] = None
    booking_required: bool = False

class Itinerary(BaseModel):
    id: str
    trip_id: str
    days: List[List[ItineraryItem]]
    total_estimated_cost: Decimal
    last_updated: datetime

# Agent Response Models
class AgentResponse(BaseModel):
    agent_name: str
    status: str
    data: Dict[str, Any]
    timestamp: datetime
    next_actions: Optional[List[str]] = None

class TripSummary(BaseModel):
    trip_id: str
    user_id: str
    destination: str
    dates: Dict[str, datetime]
    budget: BudgetBreakdown
    itinerary: Itinerary
    weather_forecast: WeatherData
    recommendations: List[str]
    status: str
    created_at: datetime
    updated_at: datetime

# Calendar Models
class CalendarEvent(BaseModel):
    id: Optional[str] = None
    summary: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: datetime
    attendees: Optional[List[str]] = None
    reminders: Optional[Dict[str, Any]] = None

class CalendarIntegrationResult(BaseModel):
    success: bool
    created_events: List[CalendarEvent] = []
    calendar_id: Optional[str] = None
    errors: List[str] = []
    trip_calendar_url: Optional[str] = None

# Train Models
class TrainDetails(BaseModel):
    train_number: str
    train_name: str
    from_station: str
    to_station: str
    departure_time: str
    arrival_time: str
    duration: str
    classes_available: List[str] = []
    price_range: Optional[Dict[str, float]] = None
    availability_status: str
    distance: Optional[str] = None

class TrainSearchResult(BaseModel):
    from_station: str
    to_station: str
    search_date: str
    trains: List[TrainDetails] = []
    search_timestamp: datetime
    total_trains_found: int

# Flight Models
class FlightDetails(BaseModel):
    flight_number: str
    carrier_code: str
    carrier_name: str
    departure_airport: str
    arrival_airport: str
    departure_time: str
    arrival_time: str
    duration: str
    aircraft_type: Optional[str] = None
    flight_date: str
    status: str = "Scheduled"
    terminal_info: Optional[Dict[str, str]] = None

class FlightSearchResult(BaseModel):
    origin_airport: str
    destination_airport: str
    search_date: str
    flights: List[FlightDetails] = []
    search_timestamp: datetime
    total_flights_found: int

class AirportInfo(BaseModel):
    iata_code: str
    icao_code: Optional[str] = None
    name: str
    city: str
    country: str
    coordinates: Optional[Dict[str, float]] = None

# Orchestrator Models
class OrchestrationState(BaseModel):
    trip_request: TripRequest
    weather_data: Optional[WeatherData] = None
    route_details: Optional[RouteDetails] = None
    events: List[Event] = []
    budget_breakdown: Optional[BudgetBreakdown] = None
    itinerary: Optional[Itinerary] = None
    agent_responses: Dict[str, AgentResponse] = {}
    orchestration_rules: Dict[str, Any] = {}
    current_step: str = "initial"
    completed_agents: List[str] = []
    errors: List[str] = []