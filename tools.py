from typing import Dict, List, Any, Optional
import httpx
import json
import re, logging
from datetime import datetime, timedelta
from duckduckgo_search import DDGS

from langchain_google_genai import ChatGoogleGenerativeAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from langchain_core.messages import HumanMessage
from models import WeatherData, Event, Location, RouteDetails, BudgetOptions, CalendarIntegrationResult, CalendarEvent
from config import settings

class TravelAssistantTool:
    """Generic travel assistant tool powered by Gemini AI for non-specific queries"""
    
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3
        )
    
    async def get_travel_advice(self, query: str, context: Dict[str, Any], conversation_history: List[Dict[str, Any]]) -> str:
        """Generate contextual travel advice using Gemini AI"""
        try:
            if not query.strip():
                logger.warning("Empty query received in get_travel_advice")
                raise ValueError("Please provide a valid question or request.")

            prompt = f"""
            You are a highly knowledgeable travel assistant. Respond to the user's query while following these strict rules:
            
            1. NEVER make up or hallucinate information
            2. Only use well-researched, factual information
            3. If unsure, ask for clarification
            4. Keep responses focused and concise
            5. Consider user's previous context when relevant
            
            Available tools for detailed info:
            - Weather forecasts (current and predictions)
            - Flight searches and booking assistance
            - Train schedules (especially for India)
            - Local events and activities
            - Accommodation searches
            - Maps and directions
            
            Current user context:
            {json.dumps(context, indent=2)}
            
            Recent conversation history:
            {json.dumps(conversation_history[-3:], indent=2)}
            
            User's question: {query}
            
            Respond conversationally but accurately. If the user needs specific data (weather, flights, etc.), suggest using the appropriate tool.
            """
            
            response = await self.llm.ainvoke(prompt)
            if not response or not response.content:
                logger.error("Empty response received from LLM")
                raise RuntimeError("No response generated from the AI model.")
                
            return response.content.strip()
            
        except ValueError as e:
            logger.warning(f"Invalid input in get_travel_advice: {e}")
            raise
        except Exception as e:
            logger.error(f"Error generating travel advice: {e}", exc_info=True)
            raise RuntimeError(f"Failed to generate travel advice: {str(e)}")

class WeatherTool:
    """Tool for fetching weather data using OpenWeatherMap One Call API 3.0"""
    
    def __init__(self):
        try:
            if not settings.GEMINI_API_KEY:
                logger.error("Missing Gemini API key")
                raise ValueError("Gemini API key is required for WeatherTool initialization")
            if not settings.WEATHER_API_KEY:
                logger.error("Missing OpenWeatherMap API key")
                raise ValueError("OpenWeatherMap API key is required for WeatherTool initialization")
                
            self.llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.1  # Low temperature for more accurate name resolution
            )
        except Exception as e:
            logger.error(f"Failed to initialize WeatherTool: {e}", exc_info=True)
            raise
    
    async def _resolve_city_name(self, city: str) -> str:
        """Resolve city name using Gemini AI to match OpenWeatherMap recognized names"""
        try:
            # Example pairs to help Gemini understand the task
            examples = [
                {"modern": "Prayagraj", "weather_api": "Allahabad"},
                {"modern": "Bengaluru", "weather_api": "Bangalore"},
                {"modern": "Mumbai", "weather_api": "Mumbai"},
                {"modern": "Chennai", "weather_api": "Chennai"},
                {"modern": "Kolkata", "weather_api": "Calcutta"},
                {"modern": "Thiruvananthapuram", "weather_api": "Trivandrum"}
            ]
            
            prompt = f"""
            You are a city name resolver for weather APIs. Given a city name, return the most appropriate name that weather APIs would recognize.
            Follow these rules:
            1. If the city has a commonly used historical name in weather APIs, use that
            2. For Indian cities that might have old British-era names, consider both versions
            3. If unclear, add country code (e.g., "Delhi, IN")
            4. If the name is already standard, keep it as is
            5. Return ONLY the resolved name, nothing else

            Examples:
            {json.dumps(examples, indent=2)}

            Resolve this city name: {city}
            """

            response = await self.llm.ainvoke(prompt)
            resolved_name = response.content.strip()
            
            if resolved_name and resolved_name != city:
                logger.info(f"Gemini resolved city name: {city} → {resolved_name}")
            else:
                logger.info(f"City name kept as is: {city}")
            
            return resolved_name or city
            
        except Exception as e:
            logger.error(f"Error in city name resolution: {e}")
            logger.info(f"Falling back to original city name: {city}")
            if hasattr(e, '__await__'):
                try:
                    await e
                except Exception as e_await:
                    logger.error(f"Error awaiting coroutine: {e_await}")
            return city
    
    async def _get_coordinates(self, location: str) -> Dict[str, float]:
        """Get latitude and longitude for a location using OpenWeatherMap Geocoding API"""
        async with httpx.AsyncClient() as client:
            logger.info(f"Fetching coordinates for location: {location}")
            geocoding_url = "http://api.openweathermap.org/geo/1.0/direct"
            params = {
                "q": location,
                "limit": 1,
                "appid": settings.WEATHER_API_KEY
            }
            try:
                response = await client.get(geocoding_url, params=params)
                response.raise_for_status()
                
                data = response.json()
                logger.debug(f"Geocoding API response: {json.dumps(data, indent=2)}")
                
                if not data:
                    logger.error(f"Location not found: {location}")
                    raise ValueError(f"Location '{location}' not found in OpenWeatherMap database")
                    
                coords = {
                    "lat": data[0]["lat"],
                    "lon": data[0]["lon"]
                }
                logger.info(f"Successfully got coordinates for {location}: {coords}")
                return coords
                
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error during geocoding: {e.response.status_code} - {e.response.text}")
                if e.response.status_code == 401:
                    raise ValueError("Invalid OpenWeatherMap API key")
                elif e.response.status_code == 429:
                    raise ValueError("OpenWeatherMap API rate limit exceeded")
                raise ValueError(f"OpenWeatherMap Geocoding API error: {e}")
                
            except httpx.RequestError as e:
                logger.error(f"Request error during geocoding: {e}")
                raise ValueError(f"Network error while connecting to OpenWeatherMap: {e}")
    
    async def get_weather_forecast(self, location: str, start_date: datetime, end_date: datetime) -> WeatherData:
        """Get weather forecast for a location and date range using OpenWeatherMap Current Weather API 2.5"""
        try:
            # Resolve city name first
            resolved_location = await self._resolve_city_name(location)
            logger.info(f"Using resolved location name: {resolved_location}")
            
            if not settings.WEATHER_API_KEY:
                logger.error("Missing OpenWeatherMap API key")
                raise ValueError("OpenWeatherMap API key is required. Please set WEATHER_API_KEY in your environment.")
            
            logger.info(f"Fetching weather forecast for {location} from {start_date} to {end_date}")
            
            async with httpx.AsyncClient() as client:
                # Use OpenWeatherMap Current Weather API 2.5 format
                weather_url = "https://api.openweathermap.org/data/2.5/weather"
                params = {
                    "q": resolved_location,
                    "appid": settings.WEATHER_API_KEY,
                    "units": "metric"
                }
                
                try:
                    response = await client.get(weather_url, params=params)
                    response.raise_for_status()
                    weather_data = response.json()
                    logger.debug(f"Weather API response: {json.dumps(weather_data, indent=2)}")
                    
                    # Process the response data from Current Weather API 2.5
                    main = weather_data.get("main", {})
                    weather_info = weather_data.get("weather", [{}])[0]
                    wind = weather_data.get("wind", {})
                    
                    if not main or not weather_info:
                        logger.error(f"Invalid weather data received for {location}")
                        raise ValueError(f"Unable to get weather data for {location}")
                    
                    logger.info(f"Successfully fetched weather data for {location}")
                    
                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP error fetching weather: {e.response.status_code} - {e.response.text}")
                    if e.response.status_code == 401:
                        raise ValueError("Invalid OpenWeatherMap API key")
                    elif e.response.status_code == 429:
                        raise ValueError("OpenWeatherMap API rate limit exceeded")
                    raise ValueError(f"OpenWeatherMap API error: {e}")
                    
                except httpx.RequestError as e:
                    logger.error(f"Request error fetching weather: {e}")
                    raise ValueError(f"Network error while connecting to OpenWeatherMap: {e}")
                clouds = weather_data.get("clouds", {})
                
                # Extract current conditions
                current_temp = main.get("temp", 20)
                feels_like = main.get("feels_like", current_temp)
                humidity = main.get("humidity", 50)
                temp_min = main.get("temp_min", current_temp - 5)
                temp_max = main.get("temp_max", current_temp + 5)
                
                weather_condition = weather_info.get("main", "clear").lower()
                weather_description = weather_info.get("description", "clear sky")
                
                wind_speed = wind.get("speed", 5)
                cloudiness = clouds.get("all", 20)  # Cloud coverage percentage
                
                # Estimate precipitation chance from cloudiness
                precipitation_chance = min(cloudiness / 100, 0.8)  # Convert cloudiness to precipitation probability
                
                # Create a simple forecast (since 2.5 API only gives current weather)
                current_date = datetime.now()
                forecast_days = []
                
                # Generate a 3-day simple forecast based on current conditions
                for i in range(3):
                    forecast_date = current_date + timedelta(days=i)
                    # Add some variation for future days
                    temp_variation = (i * 2) - 2  # -2, 0, +2 degrees variation
                    
                    forecast_days.append({
                        "date": forecast_date.strftime("%Y-%m-%d"),
                        "temp_high": temp_max + temp_variation,
                        "temp_low": temp_min + temp_variation,
                        "condition": weather_condition,
                        "description": weather_description,
                        "humidity": humidity,
                        "wind_speed": wind_speed,
                        "pop": precipitation_chance
                    })
                
                processed_data = {
                    "location": location,
                    "forecast_data": {
                        "current": {
                            "temp": current_temp,
                            "feels_like": feels_like,
                            "humidity": humidity,
                            "description": weather_description
                        },
                        "daily": forecast_days
                    },
                    "temperature_range": {"min": temp_min, "max": temp_max},
                    "conditions": weather_condition,
                    "precipitation_chance": precipitation_chance
                }
                
                return WeatherData(**processed_data)
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise Exception("Invalid OpenWeatherMap API key")
            elif e.response.status_code == 429:
                raise Exception("OpenWeatherMap API rate limit exceeded")
            else:
                raise Exception(f"Weather API HTTP error: {e.response.status_code}")
        except Exception as e:
            raise Exception(f"Weather API error: {str(e)}")

class MapsTool:
    """Tool for route planning and location services using Folium/Leaflet and OpenStreetMap"""
    
    def __init__(self):
        from geopy.geocoders import Nominatim
        from geopy.distance import geodesic
        self.geocoder = Nominatim(user_agent="lgforglobe-travel-planner/1.0")
        self.geodesic = geodesic
    
    async def _geocode_location(self, location: str) -> Location:
        """Get coordinates and details for a location using Nominatim/OpenStreetMap geocoding"""
        try:
            import asyncio
            
            # Run geocoding in thread pool since geopy is synchronous
            def geocode_sync():
                return self.geocoder.geocode(location, exactly_one=True, timeout=10)
            
            result = await asyncio.get_event_loop().run_in_executor(None, geocode_sync)
            
            if not result:
                raise Exception(f"Location '{location}' not found")
            
            # Extract city and country from the address
            address_parts = result.address.split(", ") if result.address else [location]
            
            # Try to identify city and country from address components
            city = ""
            country = ""
            
            # Common country identification
            if len(address_parts) >= 2:
                country = address_parts[-1]  # Usually the last part
                
            # Try to find city in address parts
            for part in address_parts:
                if any(word in part.lower() for word in ["city", "town", "village"]):
                    city = part
                    break
            
            # If no city found, use first part as fallback
            if not city and address_parts:
                city = address_parts[0]
            
            # Use location input as fallback
            if not city:
                city = location.split(",")[0].strip()
            if not country and "," in location:
                country = location.split(",")[-1].strip()
            
            return Location(
                lat=result.latitude,
                lng=result.longitude,
                address=result.address or location,
                city=city,
                country=country or "Unknown"
            )
            
        except Exception as e:
            raise Exception(f"Geocoding error for '{location}': {str(e)}")
    
    async def _get_route_osrm(self, origin_coords: tuple, destination_coords: tuple, 
                             transport_mode: str = "driving") -> Dict[str, Any]:
        """Get route using OSRM (Open Source Routing Machine) API"""
        try:
            # Map transport modes to OSRM profiles
            profile_mapping = {
                "driving": "driving",
                "walking": "foot",
                "cycling": "bike",
                "transit": "driving"  # Fallback to driving for transit
            }
            
            profile = profile_mapping.get(transport_mode, "driving")
            
            # OSRM public API endpoint
            osrm_url = f"http://router.project-osrm.org/route/v1/{profile}/{origin_coords[1]},{origin_coords[0]};{destination_coords[1]},{destination_coords[0]}"
            
            params = {
                "overview": "full",
                "alternatives": "true",
                "steps": "true",
                "geometries": "geojson"
            }
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(osrm_url, params=params)
                response.raise_for_status()
                
                data = response.json()
                if data.get("code") != "Ok" or not data.get("routes"):
                    raise Exception("No routes found")
                
                return data
                
        except Exception as e:
            # Fallback to simple distance calculation if OSRM fails
            distance_km = self.geodesic(origin_coords, destination_coords).kilometers
            
            # Estimate travel time based on transport mode
            speed_mapping = {
                "driving": 50,  # km/h average
                "walking": 5,   # km/h
                "cycling": 15,  # km/h
                "transit": 30   # km/h average
            }
            
            speed = speed_mapping.get(transport_mode, 50)
            travel_time_hours = distance_km / speed
            travel_time_minutes = travel_time_hours * 60
            
            # Format travel time
            if travel_time_minutes < 60:
                time_text = f"{int(travel_time_minutes)} mins"
            else:
                hours = int(travel_time_minutes // 60)
                minutes = int(travel_time_minutes % 60)
                time_text = f"{hours}h {minutes}m"
            
            return {
                "routes": [{
                    "distance": distance_km * 1000,  # Convert to meters
                    "duration": travel_time_minutes * 60,  # Convert to seconds
                    "legs": [{
                        "distance": distance_km * 1000,
                        "duration": travel_time_minutes * 60,
                        "steps": []
                    }]
                }],
                "fallback": True,
                "error": str(e)
            }
    
    async def get_route(self, origin: str, destination: str, transport_mode: str = "driving") -> RouteDetails:
        """Get route details between two locations using OpenStreetMap data"""
        try:
            # Get location details
            origin_location = await self._geocode_location(origin)
            destination_location = await self._geocode_location(destination)

            # Get route data from OSRM
            route_data = await self._get_route_osrm(
                (origin_location.lat, origin_location.lng),
                (destination_location.lat, destination_location.lng),
                transport_mode
            )

            routes = route_data.get("routes", [])
            route_options = []

            for i, route in enumerate(routes):
                route_options.append({
                    "route_name": f"Route {i + 1}",
                    "distance": route["distance"] / 1000,  # km
                    "duration": self._format_duration(route["duration"]),
                    "distance_text": f"{route['distance'] / 1000:.1f} km",
                    "duration_value": route["duration"],
                    "steps": len(route.get("legs", [{}])[0].get("steps", []))
                })

            # Use first route for main details
            main_route = routes[0] if routes else {"distance": 0, "duration": 0, "geometry": {"coordinates": []}}

            # ✅ Include the full polyline (geojson coordinates)
            route_geometry = main_route.get("geometry", {}).get("coordinates", [])

            return RouteDetails(
                origin=origin_location,
                destination=destination_location,
                route_options=route_options,
                distance=main_route["distance"] / 1000,  # Convert to km
                travel_time=self._format_duration(main_route["duration"]),
                transportation_mode=transport_mode,
                route_geometry=route_geometry  # 🟢 ADD THIS
            )

        except Exception as e:
            logger.error(f"Error in get_route: {e}", exc_info=True)
            raise RuntimeError(f"Maps routing error: {str(e)}")

    
    def _format_duration(self, duration_seconds: float) -> str:
        """Format duration from seconds to human readable format"""
        minutes = int(duration_seconds // 60)
        hours = minutes // 60
        remaining_minutes = minutes % 60
        
        if hours > 0:
            return f"{hours}h {remaining_minutes}m"
        else:
            return f"{minutes} mins"
    
    async def create_route_map(self, origin: str, destination: str, transport_mode: str = "driving") -> str:
        """Create a Folium/Leaflet map showing the route"""
        try:
            import folium
            import os
            from datetime import datetime
            
            # Get route details
            route_details = await self.get_route(origin, destination, transport_mode)
            
            # Calculate map center
            center_lat = (route_details.origin.lat + route_details.destination.lat) / 2
            center_lng = (route_details.origin.lng + route_details.destination.lng) / 2
            
            # Create map
            m = folium.Map(
                location=[center_lat, center_lng],
                zoom_start=10,
                tiles='OpenStreetMap'
            )
            
            # Add markers for origin and destination
            folium.Marker(
                [route_details.origin.lat, route_details.origin.lng],
                popup=f"<b>Origin:</b><br>{route_details.origin.address}",
                tooltip="Origin",
                icon=folium.Icon(color='green', icon='play')
            ).add_to(m)
            
            folium.Marker(
                [route_details.destination.lat, route_details.destination.lng],
                popup=f"<b>Destination:</b><br>{route_details.destination.address}",
                tooltip="Destination",
                icon=folium.Icon(color='red', icon='stop')
            ).add_to(m)
            
            # Add a simple line between origin and destination
            folium.PolyLine(
                locations=[
                    [route_details.origin.lat, route_details.origin.lng],
                    [route_details.destination.lat, route_details.destination.lng]
                ],
                color='blue',
                weight=5,
                opacity=0.7,
                popup=f"Distance: {route_details.distance:.1f} km<br>Time: {route_details.travel_time}"
            ).add_to(m)
            
            # Add route information to map
            route_info = f"""
            <div style="position: fixed; 
                        top: 10px; left: 50px; width: 300px; height: 90px; 
                        background-color: white; border:2px solid grey; z-index:9999; 
                        font-size:14px; padding: 10px;">
                <p><b>Route Information</b></p>
                <p>Distance: {route_details.distance:.1f} km</p>
                <p>Travel Time: {route_details.travel_time}</p>
                <p>Mode: {transport_mode.title()}</p>
            </div>
            """
            m.get_root().html.add_child(folium.Element(route_info))
            
            # Save map to file
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            map_filename = f"route_map_{timestamp}.html"
            map_path = os.path.join(os.getcwd(), map_filename)
            m.save(map_path)
            
            return map_path
            
        except Exception as e:
            raise Exception(f"Map creation error: {str(e)}")

class EventsTool:
    """Tool for finding events and activities using DuckDuckGo search and Gemini AI"""
    
    def __init__(self):
        from langchain_google_genai import ChatGoogleGenerativeAI
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3
        )
    

    
    async def _search_events_web(self, location: str, start_date: datetime, end_date: datetime, 
                                categories: List[str] = None) -> List[Dict[str, Any]]:
        """Search for events using DuckDuckGo"""
        try:
            import re
            
            # Create search queries for different types of events
            base_queries = [
                f"events in {location} {start_date.strftime('%B %Y')}",
                f"concerts shows {location} {start_date.strftime('%B %Y')}",
                f"festivals {location} {start_date.strftime('%B %Y')}",
                f"activities things to do {location} {start_date.strftime('%B %Y')}"
            ]
            
            # Add category-specific searches
            if categories:
                category_queries = {
                    "entertainment": f"concerts shows entertainment {location} {start_date.strftime('%B %Y')}",
                    "sightseeing": f"tours attractions sightseeing {location} {start_date.strftime('%B %Y')}",
                    "cultural": f"museums galleries cultural events {location} {start_date.strftime('%B %Y')}",
                    "sports": f"sports games matches {location} {start_date.strftime('%B %Y')}",
                    "food": f"food festivals restaurants events {location} {start_date.strftime('%B %Y')}"
                }
                
                for category in categories:
                    if category.lower() in category_queries:
                        base_queries.append(category_queries[category.lower()])
            
            all_results = []
            
            # DDGS doesn't support async context manager, use synchronous approach
            def search_sync(query):
                try:
                    with DDGS() as ddgs:
                        return list(ddgs.text(query, max_results=10))
                except Exception as e:
                    logger.error(f"Search error for query '{query}': {e}", exc_info=True)
                    return []  # Continue with empty results for this query
            
            for query in base_queries[:3]:  # Limit to 3 queries to avoid overwhelming
                try:
                    # Run synchronous search in executor
                    import asyncio
                    results = await asyncio.get_event_loop().run_in_executor(None, search_sync, query)
                    
                    for result in results:
                        # Extract and clean content
                        cleaned_result = {
                            "title": result.get("title", ""),
                            "body": result.get("body", ""),
                            "url": result.get("href", ""),
                            "source_query": query
                        }
                        
                        # Filter out irrelevant results
                        if any(keyword in cleaned_result["title"].lower() or keyword in cleaned_result["body"].lower() 
                              for keyword in ["event", "concert", "show", "festival", "tour", "exhibition", "performance", "activity"]):
                            all_results.append(cleaned_result)
                    
                except Exception as search_error:
                    print(f"Search error for query '{query}': {search_error}")
                    continue
            
            return all_results[:20]  # Limit total results
            
        except Exception as e:
            raise Exception(f"Web search error: {str(e)}")
    
    async def _extract_events_with_gemini(self, search_results: List[Dict[str, Any]], 
                                        location: str, start_date: datetime, end_date: datetime,
                                        categories: List[str] = None) -> List[Event]:
        """Use Gemini to extract structured event data from search results"""
        try:
            if not settings.GEMINI_API_KEY:
                raise Exception("Gemini API key is required. Please set GEMINI_API_KEY in your environment.")
            
            # Prepare the search results text for Gemini
            search_text = ""
            for i, result in enumerate(search_results):
                search_text += f"\n--- Search Result {i+1} ---\n"
                search_text += f"Title: {result['title']}\n"
                search_text += f"Content: {result['body']}\n"
                search_text += f"URL: {result['url']}\n"
            
            # Create the prompt for Gemini
            categories_text = ", ".join(categories) if categories else "any type"
            prompt = f"""
            Analyze the following search results and extract structured event information for {location} between {start_date.strftime('%Y-%m-%d')} and {end_date.strftime('%Y-%m-%d')}.

            Focus on events in these categories: {categories_text}

            Search Results:
            {search_text}

            Extract events and return them in this exact JSON format (return only valid JSON, no additional text):
            {{
                "events": [
                    {{
                        "id": "unique_id_for_event",
                        "name": "Event Name",
                        "description": "Brief description of the event",
                        "start_time": "YYYY-MM-DDTHH:MM:SS",
                        "end_time": "YYYY-MM-DDTHH:MM:SS",
                        "category": "entertainment|sightseeing|cultural|sports|food|general",
                        "price": 25.00,
                        "booking_url": "the URL from search results where users can find more info or book tickets",
                        "venue_name": "Venue Name or Location",
                        "venue_address": "Full venue address or general area in {location}"
                    }}
                ]
            }}

            Guidelines:
            - Only include events that are clearly happening in {location}
            - Only include events within the date range {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}
            - If exact dates aren't clear, make reasonable estimates within the date range
            - If price isn't mentioned, use null
            - **IMPORTANT: For booking_url, use the actual URL from the search result where the event information was found. This should be a clickable link users can visit.**
            - If venue details are unclear, use "{location}" as the venue_name and venue_address
            - If end time isn't clear, estimate based on event type (concerts: 3-4 hours, tours: 2-3 hours, etc.)
            - Generate unique IDs using event name and date
            - Focus on actual events, not general listings or advertisements
            - Categorize events appropriately
            - Extract at least 3-5 events if the search results contain relevant information
            """
            
            # Call Gemini
            response = await self.llm.ainvoke(prompt)
            
            # Parse the JSON response
            import json
            try:
                # Clean the response to extract JSON
                response_text = response.content.strip()
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].strip()
                
                event_data = json.loads(response_text)
                
                events = []
                for event_info in event_data.get("events", []):
                    try:
                        # Parse dates
                        start_time = datetime.fromisoformat(event_info["start_time"])
                        end_time = datetime.fromisoformat(event_info["end_time"])
                        
                        # Get venue address, ensure it's a string (not None)
                        venue_address = event_info.get("venue_address") or event_info.get("venue_name") or location
                        if not venue_address:
                            venue_address = f"{location} (Venue TBD)"
                        
                        # Create location object (simplified without coordinates)
                        event_location = Location(
                            lat=0.0,  # Default coordinates since we're not using them
                            lng=0.0,
                            address=venue_address,
                            city=location.split(",")[0].strip(),
                            country=location.split(",")[-1].strip() if "," in location else "Unknown"
                        )
                        
                        # Create event object
                        event = Event(
                            id=event_info["id"],
                            name=event_info["name"],
                            description=event_info["description"],
                            location=event_location,
                            start_time=start_time,
                            end_time=end_time,
                            category=event_info["category"],
                            price=event_info.get("price"),
                            booking_url=event_info.get("booking_url")
                        )
                        
                        events.append(event)
                        
                    except (ValueError, KeyError) as e:
                        logger.error(f"Error parsing event: {e}", exc_info=True)
                        logger.error(f"Event info: {event_info}")
                        continue
                
                return events
                
            except json.JSONDecodeError as e:
                print(f"JSON parsing error: {e}")
                print(f"Response text: {response_text}")
                raise Exception("Failed to parse Gemini response as JSON")
                
        except Exception as e:
            raise Exception(f"Gemini event extraction error: {str(e)}")
    
    async def find_events(self, location: str, start_date: datetime, end_date: datetime, 
                         categories: List[str] = None) -> List[Event]:
        """Find events in a location for a date range using DuckDuckGo search and Gemini AI"""
        try:
            if not settings.GEMINI_API_KEY:
                raise Exception("Gemini API key is required. Please set GEMINI_API_KEY in your environment.")
            
            logger.info(f"Finding events in {location} from {start_date} to {end_date}")
            
            # Search the web for events
            search_results = await self._search_events_web(location, start_date, end_date, categories)
            
            logger.info(f"Found {len(search_results)} search results")
            
            if not search_results:
                logger.warning("No search results found for events")
                return []  # No search results found
            
            # Extract structured event data using Gemini
            events = await self._extract_events_with_gemini(search_results, location, start_date, end_date, categories)
            
            logger.info(f"Extracted {len(events)} events from search results")
            
            return events
                
        except Exception as e:
            logger.error(f"Events search error: {str(e)}", exc_info=True)
            raise Exception(f"Events search error: {str(e)}")

class BudgetTool:
    """Tool for budget optimization and cost estimation using real market data"""
    
    async def _get_flight_prices(self, origin: str, destination: str, dates: Dict[str, datetime]) -> List[Dict[str, Any]]:
        """Get flight prices using a flight API (Amadeus, Skyscanner, etc.)"""
        # This would typically use Amadeus API or similar
        # For now, we'll use a simplified cost estimation based on distance and market data
        
        # Calculate rough distance-based pricing
        maps_tool_instance = MapsTool()
        try:
            route = await maps_tool_instance.get_route(origin, destination, "driving")
            distance_km = route.distance
            
            # Rough flight pricing based on distance
            base_cost_per_km = 0.15  # USD per km
            flight_cost = max(distance_km * base_cost_per_km, 100)  # Minimum $100
            
            return [
                {
                    "type": "economy_flight",
                    "cost": flight_cost,
                    "duration": f"{max(int(distance_km / 800), 1)}h",  # Rough flight time
                    "comfort": "economy",
                    "provider": "Various Airlines"
                },
                {
                    "type": "business_flight", 
                    "cost": flight_cost * 2.5,
                    "duration": f"{max(int(distance_km / 800), 1)}h",
                    "comfort": "business",
                    "provider": "Various Airlines"
                }
            ]
        except:
            # Fallback pricing if maps API fails
            return [
                {
                    "type": "economy_flight",
                    "cost": 300,
                    "duration": "3h",
                    "comfort": "economy",
                    "provider": "Various Airlines"
                }
            ]
    
    async def _get_accommodation_prices(self, destination: str, days: int) -> List[Dict[str, Any]]:
        """Get accommodation prices for the destination"""
        # This would typically use Booking.com API, Hotels.com API, etc.
        # For now, we'll use market-based estimates
        
        # Rough pricing based on destination type
        destination_lower = destination.lower()
        
        # Base pricing by region/city type
        if any(city in destination_lower for city in ["tokyo", "paris", "london", "new york", "singapore"]):
            base_price = 150  # High-cost cities
        elif any(city in destination_lower for city in ["bangkok", "prague", "budapest", "lisbon"]):
            base_price = 60   # Medium-cost cities
        else:
            base_price = 80   # Default pricing
        
        return [
            {
                "type": "luxury_hotel",
                "cost_per_night": base_price * 2.5,
                "rating": 5,
                "amenities": ["pool", "spa", "gym", "wifi", "breakfast", "concierge"],
                "total_cost": base_price * 2.5 * days
            },
            {
                "type": "mid_range_hotel",
                "cost_per_night": base_price * 1.2,
                "rating": 4,
                "amenities": ["gym", "wifi", "breakfast"],
                "total_cost": base_price * 1.2 * days
            },
            {
                "type": "budget_hotel",
                "cost_per_night": base_price * 0.7,
                "rating": 3,
                "amenities": ["wifi"],
                "total_cost": base_price * 0.7 * days
            },
            {
                "type": "hostel",
                "cost_per_night": base_price * 0.3,
                "rating": 2,
                "amenities": ["wifi", "shared_kitchen", "common_area"],
                "total_cost": base_price * 0.3 * days
            }
        ]
    
    async def optimize_budget(self, total_budget: float, destination: str, 
                            days: int, preferences: Dict[str, Any]) -> BudgetOptions:
        """Optimize budget allocation and find cost-effective options using real market data"""
        try:
            # Get transport options (simplified origin for demo)
            origin = preferences.get("origin", "Current Location")
            dates = {
                "departure": datetime.now() + timedelta(days=30),
                "return": datetime.now() + timedelta(days=30 + days)
            }
            
            transport_options = await self._get_flight_prices(origin, destination, dates)
            accommodation_options = await self._get_accommodation_prices(destination, days)
            
            # Calculate total costs for different combinations
            budget_combinations = []
            
            for transport in transport_options:
                for accommodation in accommodation_options:
                    transport_cost = transport["cost"] * 2  # Round trip
                    accommodation_cost = accommodation["total_cost"]
                    
                    # Reserve budget for food and activities
                    remaining_budget = total_budget - transport_cost - accommodation_cost
                    food_budget = remaining_budget * 0.6  # 60% for food
                    activity_budget = remaining_budget * 0.4  # 40% for activities
                    
                    if remaining_budget > 0:  # Only include viable combinations
                        budget_combinations.append({
                            "transport": transport,
                            "accommodation": accommodation,
                            "food_budget": food_budget,
                            "activity_budget": activity_budget,
                            "total_estimated_cost": transport_cost + accommodation_cost,
                            "remaining_budget": remaining_budget,
                            "budget_utilization": (transport_cost + accommodation_cost) / total_budget
                        })
            
            # Sort by budget utilization (prefer combinations that use budget efficiently)
            budget_combinations.sort(key=lambda x: abs(x["budget_utilization"] - 0.8))  # Target 80% utilization
            
            # Select best options
            selected_transport = budget_combinations[0]["transport"] if budget_combinations else transport_options[0]
            selected_accommodation = budget_combinations[0]["accommodation"] if budget_combinations else accommodation_options[0]
            
            return BudgetOptions(
                transport_options=transport_options,
                accommodation_options=accommodation_options,
                total_cost=total_budget
            )
            
        except Exception as e:
            raise Exception(f"Budget optimization error: {str(e)}")

class AccommodationTool:
    """Tool for finding accommodations using web search and AI extraction"""
    
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3
        )
    
    async def _search_accommodations_web(self, location: str, check_in: datetime, 
                                        check_out: datetime, budget_level: str = "Mid") -> List[Dict[str, Any]]:
        """Search for accommodations using DuckDuckGo"""
        try:
            import re
            
            # Create search queries for different types of accommodations
            base_queries = [
                f"hotels in {location} booking.com",
                f"best hotels {location} {check_in.strftime('%B %Y')}",
                f"accommodation {location} hotels.com airbnb",
                f"where to stay in {location}"
            ]
            
            all_results = []
            
            # DDGS search function
            def search_sync(query):
                try:
                    with DDGS() as ddgs:
                        return list(ddgs.text(query, max_results=8))
                except Exception as e:
                    logger.error(f"Search error for query '{query}': {e}", exc_info=True)
                    return []
            
            for query in base_queries[:2]:  # Limit to 2 queries
                try:
                    import asyncio
                    results = await asyncio.get_event_loop().run_in_executor(None, search_sync, query)
                    
                    for result in results:
                        cleaned_result = {
                            "title": result.get("title", ""),
                            "body": result.get("body", ""),
                            "url": result.get("href", ""),
                            "source_query": query
                        }
                        
                        # Filter for accommodation-related results
                        if any(keyword in cleaned_result["title"].lower() or keyword in cleaned_result["body"].lower() 
                              for keyword in ["hotel", "accommodation", "stay", "booking", "airbnb", "hostel", "resort", "inn"]):
                            all_results.append(cleaned_result)
                    
                except Exception as search_error:
                    logger.error(f"Search error for query '{query}': {search_error}")
                    continue
            
            logger.info(f"Found {len(all_results)} accommodation search results")
            return all_results[:15]
            
        except Exception as e:
            logger.error(f"Web search error: {str(e)}", exc_info=True)
            raise Exception(f"Web search error: {str(e)}")
    
    async def _extract_accommodations_with_gemini(self, search_results: List[Dict[str, Any]], 
                                                  location: str, check_in: datetime, 
                                                  check_out: datetime, budget_per_night: float) -> List[Dict[str, Any]]:
        """Use Gemini to extract structured accommodation data from search results"""
        try:
            if not settings.GEMINI_API_KEY:
                raise Exception("Gemini API key is required")
            
            # Prepare search results for Gemini
            search_text = ""
            for i, result in enumerate(search_results):
                search_text += f"\n--- Search Result {i+1} ---\n"
                search_text += f"Title: {result['title']}\n"
                search_text += f"Content: {result['body']}\n"
                search_text += f"URL: {result['url']}\n"
            
            nights = (check_out - check_in).days
            
            prompt = f"""
            Analyze the following search results and extract structured accommodation information for {location}.
            
            Check-in: {check_in.strftime('%Y-%m-%d')}
            Check-out: {check_out.strftime('%Y-%m-%d')}
            Nights: {nights}
            Budget per night: ${budget_per_night}

            Search Results:
            {search_text}

            Extract accommodations and return them in this exact JSON format (return only valid JSON, no additional text):
            {{
                "accommodations": [
                    {{
                        "id": "unique_id",
                        "name": "Hotel/Accommodation Name",
                        "type": "hotel|hostel|apartment|resort|guesthouse",
                        "price_per_night": 100.00,
                        "rating": 4.5,
                        "amenities": ["wifi", "pool", "breakfast", "gym"],
                        "location": "{location}",
                        "booking_url": "URL from search results",
                        "description": "Brief description"
                    }}
                ]
            }}

            Guidelines:
            - Extract actual hotel/accommodation names from the search results
            - Use the actual URLs from search results as booking_url
            - If price isn't mentioned, estimate based on accommodation type and location
            - Include both options within budget and slightly above (up to 30% more)
            - Rating should be realistic (3.0-5.0 range)
            - Common amenities: wifi, pool, spa, gym, breakfast, parking, restaurant, room_service
            - Extract at least 5-8 options if search results have enough information
            - Prioritize results from booking.com, hotels.com, airbnb.com, or official hotel sites
            """
            
            response = await self.llm.ainvoke(prompt)
            
            # Parse JSON response
            import json
            try:
                response_text = response.content.strip()
                if "```json" in response_text:
                    response_text = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    response_text = response_text.split("```")[1].strip()
                
                data = json.loads(response_text)
                
                accommodations = []
                for acc in data.get("accommodations", []):
                    try:
                        # Ensure required fields exist
                        accommodation = {
                            "id": acc.get("id", f"acc_{len(accommodations)}"),
                            "name": acc.get("name", f"Accommodation in {location}"),
                            "type": acc.get("type", "hotel"),
                            "price_per_night": float(acc.get("price_per_night", budget_per_night)),
                            "total_cost": float(acc.get("price_per_night", budget_per_night)) * nights,
                            "rating": float(acc.get("rating", 4.0)),
                            "amenities": acc.get("amenities", ["wifi"]),
                            "location": location,
                            "booking_url": acc.get("booking_url", ""),
                            "description": acc.get("description", ""),
                            "check_in": check_in.isoformat(),
                            "check_out": check_out.isoformat(),
                            "nights": nights,
                            "within_budget": float(acc.get("price_per_night", budget_per_night)) <= budget_per_night
                        }
                        accommodations.append(accommodation)
                    except (ValueError, KeyError) as e:
                        logger.error(f"Error parsing accommodation: {e}")
                        continue
                
                return accommodations
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error: {e}")
                logger.error(f"Response text: {response_text}")
                return []
                
        except Exception as e:
            logger.error(f"Gemini extraction error: {str(e)}", exc_info=True)
            raise Exception(f"Gemini extraction error: {str(e)}")
    
    async def _get_location_details(self, location: str) -> Dict[str, Any]:
        """Get location details for accommodation search (simplified without coordinates)"""
        return {
            "latitude": 0.0,
            "longitude": 0.0,
            "city": location.split(",")[0].strip()
        }
    
    async def find_accommodations(self, location: str, check_in: datetime, 
                                check_out: datetime, budget_per_night: float) -> List[Dict[str, Any]]:
        """Find accommodation options using web search and AI extraction"""
        try:
            if not settings.GEMINI_API_KEY:
                raise Exception("Gemini API key is required")
            
            nights = (check_out - check_in).days
            
            if nights <= 0:
                raise Exception("Check-out date must be after check-in date")
            
            logger.info(f"Searching accommodations in {location}, budget: ${budget_per_night}/night")
            
            # Search the web for accommodations
            search_results = await self._search_accommodations_web(location, check_in, check_out)
            
            if not search_results:
                logger.warning("No search results found for accommodations")
                return []
            
            # Extract structured accommodation data using Gemini
            accommodations = await self._extract_accommodations_with_gemini(
                search_results, location, check_in, check_out, budget_per_night
            )
            
            logger.info(f"Extracted {len(accommodations)} accommodations")
            
            # Sort by price and rating
            accommodations.sort(key=lambda x: (x["price_per_night"], -x["rating"]))
            
            return accommodations
            
        except Exception as e:
            raise Exception(f"Accommodation search error: {str(e)}")

class GoogleCalendarTool:
    """Tool for integrating travel itineraries with Google Calendar using MCP"""
    
    def __init__(self):
        self.credentials = None
        self.service = None
    
    async def _get_credentials(self):
        """Get Google Calendar API credentials"""
        try:
            import os
            from google.oauth2.credentials import Credentials
            from google_auth_oauthlib.flow import InstalledAppFlow
            from google.auth.transport.requests import Request
            import pickle
            
            creds = None
            token_path = settings.GOOGLE_CALENDAR_TOKEN_PATH
            
            # Load existing token
            if os.path.exists(token_path):
                try:
                    with open(token_path, 'rb') as token:
                        creds = pickle.load(token)
                except Exception as e:
                    print(f"Error loading token: {e}")
            
            # If there are no (valid) credentials available, let the user log in
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    try:
                        creds.refresh(Request())
                    except Exception as e:
                        print(f"Error refreshing token: {e}")
                        creds = None
                
                if not creds:
                    if not os.path.exists(settings.GOOGLE_CALENDAR_CREDENTIALS_PATH):
                        raise Exception(
                            f"Google Calendar credentials file not found at {settings.GOOGLE_CALENDAR_CREDENTIALS_PATH}. "
                            "Please download credentials.json from Google Cloud Console and place it in the project root."
                        )
                    
                    flow = InstalledAppFlow.from_client_secrets_file(
                        settings.GOOGLE_CALENDAR_CREDENTIALS_PATH, 
                        settings.GOOGLE_CALENDAR_SCOPES
                    )
                    creds = flow.run_local_server(port=0)
                
                # Save the credentials for the next run
                with open(token_path, 'wb') as token:
                    pickle.dump(creds, token)
            
            self.credentials = creds
            return creds
            
        except Exception as e:
            raise Exception(f"Google Calendar authentication error: {str(e)}")
    
    async def _get_service(self):
        """Get Google Calendar API service"""
        try:
            from googleapiclient.discovery import build
            
            if not self.credentials:
                await self._get_credentials()
            
            if not self.service:
                self.service = build('calendar', 'v3', credentials=self.credentials)
            
            return self.service
            
        except Exception as e:
            raise Exception(f"Google Calendar service error: {str(e)}")
    
    async def create_trip_calendar(self, trip_name: str, destination: str) -> str:
        """Create a new calendar for the trip"""
        try:
            service = await self._get_service()
            
            calendar = {
                'summary': f"Trip to {destination}",
                'description': f"Travel itinerary for {trip_name}",
                'timeZone': 'UTC'
            }
            
            created_calendar = service.calendars().insert(body=calendar).execute()
            return created_calendar['id']
            
        except Exception as e:
            raise Exception(f"Calendar creation error: {str(e)}")
    
    async def add_event_to_calendar(self, calendar_id: str, event_data: Dict[str, Any]) -> str:
        """Add a single event to the calendar"""
        try:
            service = await self._get_service()
            
            # Format the event for Google Calendar API
            event = {
                'summary': event_data['summary'],
                'location': event_data.get('location', ''),
                'description': event_data.get('description', ''),
                'start': {
                    'dateTime': event_data['start_time'].isoformat(),
                    'timeZone': 'UTC',
                },
                'end': {
                    'dateTime': event_data['end_time'].isoformat(),
                    'timeZone': 'UTC',
                },
                'reminders': {
                    'useDefault': False,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},  # 1 day before
                        {'method': 'popup', 'minutes': 60},       # 1 hour before
                    ],
                },
            }
            
            # Add attendees if provided
            if event_data.get('attendees'):
                event['attendees'] = [{'email': email} for email in event_data['attendees']]
            
            created_event = service.events().insert(calendarId=calendar_id, body=event).execute()
            return created_event['id']
            
        except Exception as e:
            raise Exception(f"Event creation error: {str(e)}")
    
    async def sync_itinerary_to_calendar(self, itinerary, trip_request) -> Dict[str, Any]:
        """Sync the complete itinerary to Google Calendar"""
        try:
            from models import CalendarIntegrationResult, CalendarEvent
            
            # Create a new calendar for this trip
            trip_name = f"{trip_request.destination} - {trip_request.start_date.strftime('%B %Y')}"
            calendar_id = await self.create_trip_calendar(trip_name, trip_request.destination)
            
            created_events = []
            errors = []
            
            # Convert itinerary items to calendar events
            for day_index, day_items in enumerate(itinerary.days):
                current_date = trip_request.start_date + timedelta(days=day_index)
                
                for item in day_items:
                    try:
                        # Parse time (assuming format like "09:00" or "9:00 AM")
                        time_str = item.time.replace(' AM', '').replace(' PM', '')
                        if ':' in time_str:
                            hour, minute = map(int, time_str.split(':'))
                            if 'PM' in item.time and hour != 12:
                                hour += 12
                            elif 'AM' in item.time and hour == 12:
                                hour = 0
                        else:
                            hour = int(time_str)
                            minute = 0
                        
                        # Calculate start and end times
                        start_time = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
                        
                        # Parse duration (assuming format like "2 hours" or "90 minutes")
                        duration_parts = item.duration.lower().split()
                        if 'hour' in duration_parts[1]:
                            duration_minutes = int(float(duration_parts[0]) * 60)
                        elif 'minute' in duration_parts[1]:
                            duration_minutes = int(duration_parts[0])
                        else:
                            duration_minutes = 60  # Default 1 hour
                        
                        end_time = start_time + timedelta(minutes=duration_minutes)
                        
                        # Create event data
                        event_data = {
                            'summary': item.activity,
                            'description': f"Location: {item.location.address}\nDuration: {item.duration}",
                            'location': item.location.address,
                            'start_time': start_time,
                            'end_time': end_time
                        }
                        
                        # Add event to calendar
                        event_id = await self.add_event_to_calendar(calendar_id, event_data)
                        
                        # Create calendar event model
                        calendar_event = CalendarEvent(
                            id=event_id,
                            summary=event_data['summary'],
                            description=event_data['description'],
                            location=event_data['location'],
                            start_time=start_time,
                            end_time=end_time
                        )
                        
                        created_events.append(calendar_event)
                        
                    except Exception as e:
                        error_msg = f"Failed to create event for {item.activity}: {str(e)}"
                        errors.append(error_msg)
                        print(f"Calendar sync error: {error_msg}")
            
            # Get calendar URL
            calendar_url = f"https://calendar.google.com/calendar/embed?src={calendar_id}"
            
            result = CalendarIntegrationResult(
                success=len(created_events) > 0,
                created_events=created_events,
                calendar_id=calendar_id,
                errors=errors,
                trip_calendar_url=calendar_url
            )
            
            return result
            
        except Exception as e:
            raise Exception(f"Itinerary sync error: {str(e)}")
    
    async def update_calendar_event(self, calendar_id: str, event_id: str, updated_data: Dict[str, Any]) -> bool:
        """Update an existing calendar event"""
        try:
            service = await self._get_service()
            
            # Get the existing event
            event = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
            
            # Update fields
            if 'summary' in updated_data:
                event['summary'] = updated_data['summary']
            if 'description' in updated_data:
                event['description'] = updated_data['description']
            if 'location' in updated_data:
                event['location'] = updated_data['location']
            if 'start_time' in updated_data:
                event['start'] = {
                    'dateTime': updated_data['start_time'].isoformat(),
                    'timeZone': 'UTC',
                }
            if 'end_time' in updated_data:
                event['end'] = {
                    'dateTime': updated_data['end_time'].isoformat(),
                    'timeZone': 'UTC',
                }
            
            # Update the event
            service.events().update(calendarId=calendar_id, eventId=event_id, body=event).execute()
            return True
            
        except Exception as e:
            raise Exception(f"Event update error: {str(e)}")
    
    async def delete_trip_calendar(self, calendar_id: str) -> bool:
        """Delete the trip calendar"""
        try:
            service = await self._get_service()
            service.calendars().delete(calendarId=calendar_id).execute()
            return True
            
        except Exception as e:
            raise Exception(f"Calendar deletion error: {str(e)}")

class IRCTCTrainsTool:
    """Tool for checking available trains using IRCTC RapidAPI"""
    
    def __init__(self):
        self.api_host = settings.IRCTC_API_HOST
        self.api_key = settings.RAPIDAPI_KEY
    
    async def _get_station_code_with_gemini(self, city_name: str) -> Dict[str, Any]:
        """Get railway station code for a city using Gemini AI"""
        try:
            llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.3
            )
            
            prompt = f"""
            You are a railway expert for Indian Railways. For the city "{city_name}", provide:
            1. The main railway station code (usually 3-4 letters)
            2. Alternative station codes if the city has multiple major stations
            3. The full station name
            4. Any important notes about the station
            
            City: {city_name}
            
            Respond in JSON format:
            {{
                "main_station_code": "CODE",
                "station_name": "Full Station Name",
                "alternative_codes": ["CODE1", "CODE2"],
                "city": "{city_name}",
                "notes": "Any important information"
            }}
            
            Examples:
            - Delhi → {{"main_station_code": "NDLS", "station_name": "New Delhi", "alternative_codes": ["DLI", "DSB"], "city": "Delhi", "notes": "NDLS is the main station"}}
            - Mumbai → {{"main_station_code": "CSTM", "station_name": "Chhatrapati Shivaji Terminus", "alternative_codes": ["LTT", "BYC"], "city": "Mumbai", "notes": "CSTM is the main terminus"}}
            """
            
            messages = [HumanMessage(content=prompt)]
            response = await llm.ainvoke(messages)
            
            # Parse JSON response
            try:
                # Extract JSON from response
                json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
                if json_match:
                    station_info = json.loads(json_match.group())
                    
                    # Validate that we got a proper station code
                    if not station_info.get("main_station_code") or station_info.get("main_station_code") == "XXX":
                        raise ValueError(f"Gemini could not resolve station code for {city_name}")
                    
                    return station_info
                else:
                    raise ValueError(f"No valid JSON response from Gemini for city: {city_name}")
                    
            except (json.JSONDecodeError, ValueError) as parse_error:
                raise ValueError(f"Failed to parse Gemini response for {city_name}: {str(parse_error)}")
                
        except Exception as e:
            raise Exception(f"Gemini AI failed to find station code for '{city_name}': {str(e)}")

    
    async def _get_station_code(self, location: str) -> str:
        """Get railway station code for a location (backward compatibility)"""
        info = await self._get_station_code_with_gemini(location)
        return info["main_station_code"]
    
    async def _search_train_prices_web(self, origin: str, destination: str, date: str) -> Dict[str, Any]:
        """Search for train prices using DuckDuckGo web search with enhanced error handling"""
        try:
            # DDGS doesn't support async context manager, use synchronous approach
            def search_train_sync(query):
                try:
                    with DDGS() as ddgs:
                        return list(ddgs.text(query, max_results=5))
                except Exception as e:
                    logger.warning(f"DuckDuckGo search error: {e}")
                    return []
            
            # Multiple search queries for better coverage
            search_queries = [
                f"train booking {origin} to {destination} price fare IRCTC {date}",
                f"IRCTC {origin} {destination} train ticket booking {date}",
                f"railway reservation {origin} to {destination} fare {date}"
            ]
            
            all_results = []
            
            # Try multiple search queries
            for query in search_queries[:2]:  # Limit to 2 queries to avoid rate limits
                try:
                    import asyncio
                    search_results = await asyncio.get_event_loop().run_in_executor(None, search_train_sync, query)
                    
                    for result in search_results:
                        all_results.append({
                            "title": result.get("title", ""),
                            "url": result.get("href", ""),
                            "snippet": result.get("body", ""),
                            "query": query
                        })
                        
                except Exception as search_error:
                    logger.warning(f"Search query failed: {search_error}")
                    continue
            
            # Use Gemini to analyze the search results if available
            analysis_text = "No web search results available due to rate limiting or network issues."
            
            if all_results and settings.GEMINI_API_KEY:
                try:
                    llm = ChatGoogleGenerativeAI(
                        model=settings.GEMINI_MODEL,
                        google_api_key=settings.GEMINI_API_KEY,
                        temperature=0.3
                    )
                    
                    analysis_prompt = f"""
                    Analyze these web search results for train travel from {origin} to {destination} on {date}.
                    Extract useful information about:
                    1. Typical price ranges for different classes (SL, 3A, 2A, 1A)
                    2. Popular trains on this route
                    3. Booking tips and recommendations
                    4. Travel time estimates
                    5. Alternative booking platforms
                    
                    Search Results:
                    {json.dumps(all_results[:10], indent=2)}
                    
                    Provide a concise summary with practical information for travelers.
                    If search results are limited, provide general train travel advice for India.
                    """
                    
                    messages = [HumanMessage(content=analysis_prompt)]
                    analysis = await llm.ainvoke(messages)
                    analysis_text = analysis.content
                    
                except Exception as gemini_error:
                    logger.warning(f"Gemini analysis failed: {gemini_error}")
                    analysis_text = f"""
                    Train booking information for {origin} to {destination}:
                    
                    General Guidelines:
                    - Book through official IRCTC website or mobile app
                    - Sleeper Class (SL): Most economical option
                    - 3rd AC (3A): Good balance of comfort and price  
                    - 2nd AC (2A): More comfortable with better amenities
                    - 1st AC (1A): Premium experience with individual cabins
                    
                    Booking Tips:
                    - Book 60-120 days in advance for better availability
                    - Check Tatkal quota for last-minute bookings
                    - Consider alternative dates for better fare options
                    - Use IRCTC Connect app for mobile bookings
                    
                    Note: Live pricing and availability may vary. Please check IRCTC directly for accurate information.
                    """
            
            return {
                "search_results": all_results,
                "price_analysis": analysis_text,
                "search_queries": search_queries[:2],
                "route": f"{origin} → {destination}",
                "date": date,
                "total_results": len(all_results),
                "data_source": "web_search"
            }
                
        except Exception as e:
            logger.error(f"Web search fallback error: {str(e)}")
            return {
                "search_results": [],
                "price_analysis": f"""
                Unable to fetch current web pricing data due to: {str(e)}
                
                General train booking guidance for {origin} to {destination}:
                
                1. Use official IRCTC website (irctc.co.in) or mobile app
                2. Book tickets 60-120 days in advance for better availability
                3. Check multiple train options and timings
                4. Consider Tatkal quota for urgent bookings (opens 1 day prior)
                5. Keep alternative travel dates for better fare options
                
                Common fare ranges (approximate):
                - Sleeper Class: ₹200-800 depending on distance
                - 3rd AC: ₹500-1500 depending on distance  
                - 2nd AC: ₹800-2500 depending on distance
                - 1st AC: ₹1500-4000 depending on distance
                
                Please visit IRCTC directly for current pricing and availability.
                """,
                "search_queries": [],
                "route": f"{origin} → {destination}",
                "date": date,
                "total_results": 0,
                "data_source": "fallback_guidance",
                "error": str(e)
            }

        # Extract city name and convert to lowercase
        city = location.lower().split(",")[0].strip()
        
        # Remove common words
        for word in ["city", "junction", "central", "station"]:
            city = city.replace(word, "").strip()
        
        return station_mapping.get(city, city.upper()[:4])
    
    async def get_live_trains(self, from_station_code: str, to_station_code: str = None, hours: int = 1) -> Dict[str, Any]:
        """Get live train information using IRCTC API with rate limiting and fallback handling"""
        try:
            if not self.api_key:
                logger.warning("RAPIDAPI key not configured, using fallback train search")
                return await self._get_train_fallback_data(from_station_code, to_station_code)
            
            import http.client
            import json
            
            conn = http.client.HTTPSConnection(self.api_host)
            
            headers = {
                'x-rapidapi-key': self.api_key,
                'x-rapidapi-host': self.api_host
            }
            
            # Build query parameters
            query_params = f"?hours={hours}"
            if from_station_code:
                query_params += f"&fromStationCode={from_station_code}"
            if to_station_code:
                query_params += f"&toStationCode={to_station_code}"
            
            conn.request("GET", f"/api/v3/getLiveStation{query_params}", headers=headers)
            
            res = conn.getresponse()
            data = res.read()
            
            # Handle different HTTP status codes
            if res.status == 429:
                logger.warning(f"IRCTC API rate limit exceeded (429). Using fallback train search.")
                conn.close()
                return await self._get_train_fallback_data(from_station_code, to_station_code)
            elif res.status == 401:
                logger.error("IRCTC API authentication failed (401). Check RAPIDAPI_KEY.")
                conn.close()
                return await self._get_train_fallback_data(from_station_code, to_station_code)
            elif res.status != 200:
                logger.warning(f"IRCTC API error: HTTP {res.status}. Using fallback train search.")
                conn.close()
                return await self._get_train_fallback_data(from_station_code, to_station_code)
            
            response_data = json.loads(data.decode("utf-8"))
            conn.close()
            
            logger.info(f"Successfully fetched train data from IRCTC API for {from_station_code} → {to_station_code}")
            return response_data
            
        except Exception as e:
            logger.error(f"IRCTC API error: {str(e)}. Using fallback train search.")
            return await self._get_train_fallback_data(from_station_code, to_station_code)
    
    async def _get_train_fallback_data(self, from_station_code: str, to_station_code: str) -> Dict[str, Any]:
        """Return API unavailable error when IRCTC API fails"""
        logger.error(f"IRCTC API unavailable for {from_station_code} → {to_station_code}")
        return {
            "status": False,
            "data": [],
            "message": "IRCTC API is currently unavailable. Please try again later or use the official IRCTC website/app.",
            "error": "api_unavailable",
            "fallback": True,
            "suggestions": [
                "Try again in a few minutes",
                "Use official IRCTC website: irctc.co.in",
                "Use IRCTC Connect mobile app",
                "Check train schedules on railway inquiry websites"
            ]
        }
    
    async def search_trains_between_cities(self, origin: str, destination: str, travel_date: datetime = None) -> List[Dict[str, Any]]:
        """Search for trains between two cities with enhanced error handling and fallbacks"""
        try:
            from models import TrainDetails, TrainSearchResult
            
            # Debug logging to check input parameters
            logger.info(f"Train search called with: origin='{origin}', destination='{destination}', travel_date={travel_date}")
            
            # Get station codes using Gemini AI only - no hardcoded fallbacks
            try:
                logger.info(f"Resolving station code for origin: '{origin}'")
                from_station_info = await self._get_station_code_with_gemini(origin)
                logger.info(f"Origin station info: {from_station_info}")
                
                logger.info(f"Resolving station code for destination: '{destination}'")
                to_station_info = await self._get_station_code_with_gemini(destination)
                logger.info(f"Destination station info: {to_station_info}")
                
                from_code = from_station_info.get("main_station_code")
                to_code = to_station_info.get("main_station_code")
                
                logger.info(f"Extracted codes: from_code='{from_code}', to_code='{to_code}'")
                
                # Validate that Gemini provided actual station codes
                if not from_code or not to_code or from_code == "XXX" or to_code == "XXX":
                    raise ValueError(f"Unable to resolve station codes for {origin} or {destination}")
                
                logger.info(f"Resolved station codes: {origin} → {from_code}, {destination} → {to_code}")
                
            except Exception as station_error:
                logger.error(f"Station code resolution failed: {station_error}")
                # Return error instead of using fallback codes
                return [{
                    "train_number": "STATION_ERROR",
                    "train_name": "Station Code Resolution Failed",
                    "from_station": origin,
                    "to_station": destination,
                    "message": f"Unable to resolve railway station codes for {origin} and/or {destination}",
                    "error": str(station_error),
                    "suggestions": [
                        "Check if city names are spelled correctly",
                        "Try using full city names (e.g., 'New Delhi' instead of 'Delhi')",
                        "Ensure the cities have railway stations",
                        "Try alternative city names or nearby cities"
                    ],
                    "data_source": "station_resolution_error",
                    "route": f"{origin} → {destination}"
                }]
            
            # Get live train data with built-in fallback handling
            train_data = await self.get_live_trains(from_code, to_code, hours=24)
            
            trains = []
            data_source = "irctc_api"
            
            # Check if this is fallback data
            if train_data.get("fallback"):
                data_source = "fallback_data"
                logger.info("Using fallback train data due to API issues")
            
            # Process the API/fallback response
            if train_data.get("status") and train_data.get("data"):
                train_list = train_data["data"]
                
                for train_info in train_list:
                    try:
                        # Create standardized train object
                        train_details = {
                            "train_number": train_info.get("trainNumber", "N/A"),
                            "train_name": train_info.get("trainName", "N/A"),
                            "from_station": train_info.get("fromStation", origin),
                            "to_station": train_info.get("toStation", destination),
                            "from_station_code": from_code,
                            "to_station_code": to_code,
                            "departure_time": train_info.get("departureTime", "N/A"),
                            "arrival_time": train_info.get("arrivalTime", "N/A"),
                            "duration": train_info.get("duration", "N/A"),
                            "classes_available": train_info.get("classes", ["SL", "3A", "2A"]),
                            "availability_status": train_info.get("availability", "Available"),
                            "distance": train_info.get("distance", "N/A"),
                            "data_source": data_source,
                            "route": f"{origin} → {destination}",
                            "travel_date": travel_date.strftime("%Y-%m-%d") if travel_date else "Not specified"
                        }
                        
                        trains.append(train_details)
                        
                    except Exception as train_error:
                        logger.warning(f"Error processing train data: {train_error}")
                        continue
            
            # If no trains found, add web search suggestion
            if not trains:
                logger.warning(f"No trains found for {origin} → {destination}")
                # Add a helpful suggestion instead of empty results
                trains.append({
                    "train_number": "SEARCH_REQUIRED",
                    "train_name": "No Direct Trains Found",
                    "from_station": origin,
                    "to_station": destination,
                    "message": f"No direct trains found between {origin} and {destination}. Consider checking alternative routes or nearby stations.",
                    "suggestions": [
                        "Check for connecting trains via major railway junctions",
                        "Try searching for trains from nearby cities",
                        "Consider alternative transport modes (flights, buses)",
                        "Visit IRCTC website directly for latest information"
                    ],
                    "data_source": "system_suggestion",
                    "route": f"{origin} → {destination}"
                })
            
            logger.info(f"Found {len(trains)} train options for {origin} → {destination}")
            return trains
            
        except Exception as e:
            logger.error(f"Train search error: {str(e)}")
            # Return helpful error information instead of raising exception
            return [{
                "train_number": "ERROR",
                "train_name": "Search Error",
                "from_station": origin,
                "to_station": destination,
                "message": f"Unable to search for trains: {str(e)}",
                "suggestions": [
                    "Check internet connection",
                    "Verify city names are correct",
                    "Try again in a few minutes",
                    "Use IRCTC website or app directly"
                ],
                "data_source": "error_handler",
                "route": f"{origin} → {destination}",
                "error": str(e)
            }]
    
    async def get_train_recommendations(self, origin: str, destination: str, 
                                     travel_date: datetime = None, 
                                     preferences: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get train recommendations with AI analysis"""
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            
            # Search for trains
            trains = await self.search_trains_between_cities(origin, destination, travel_date)
            
            if not trains:
                return {
                    "trains": [],
                    "recommendations": "No trains found for this route. Please check station names or try alternative routes.",
                    "route_analysis": f"No direct trains available between {origin} and {destination}."
                }
            
            # Use Gemini to analyze and recommend trains
            llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.3
            )
            
            prompt = f"""
            Analyze the following train options from {origin} to {destination} and provide recommendations:

            Available Trains:
            {json.dumps(trains, indent=2)}

            Travel Preferences: {preferences or 'None specified'}

            Please provide:
            1. Top 3 recommended trains with reasons
            2. Best train for speed, comfort, and budget
            3. Travel tips and considerations
            4. Alternative options if available
            5. Booking recommendations

            Format your response as helpful travel advice.
            """
            
            response = await llm.ainvoke(prompt)
            
            # Get station information using Gemini
            origin_station_info = await self._get_station_code_with_gemini(origin)
            dest_station_info = await self._get_station_code_with_gemini(destination)
            
            # Get web price analysis
            date_str = travel_date.strftime("%Y-%m-%d") if travel_date else datetime.now().strftime("%Y-%m-%d")
            web_price_data = await self._search_train_prices_web(origin, destination, date_str)
            
            return {
                "trains": trains,
                "total_trains": len(trains),
                "recommendations": response.content,
                "route_analysis": f"Found {len(trains)} trains from {origin} to {destination}",
                "search_timestamp": datetime.now().isoformat(),
                "origin_station_info": origin_station_info,
                "destination_station_info": dest_station_info,
                "web_price_analysis": web_price_data,
                "enhanced_search": True
            }
            
        except Exception as e:
            raise Exception(f"Train recommendations error: {str(e)}")

class AmadeusFlightsTool:
    """Tool for flight information using Amadeus API"""
    
    def __init__(self):
        self.api_key = settings.AMADEUS_API_KEY
        self.api_secret = settings.AMADEUS_API_SECRET
        self.base_url = settings.AMADEUS_BASE_URL
        self.access_token = None
        self.token_expires_at = None
    
    async def _get_access_token(self) -> str:
        """Get OAuth access token from Amadeus API"""
        try:
            if not self.api_key or not self.api_secret:
                raise Exception("Amadeus API key and secret are required. Please set AMADEUS_API_KEY and AMADEUS_API_SECRET in your environment.")
            
            # Check if token is still valid
            if self.access_token and self.token_expires_at:
                from datetime import datetime
                if datetime.now() < self.token_expires_at:
                    return self.access_token
            
            # Get new token
            async with httpx.AsyncClient() as client:
                token_url = f"{self.base_url}/v1/security/oauth2/token"
                
                headers = {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
                
                data = {
                    "grant_type": "client_credentials",
                    "client_id": self.api_key,
                    "client_secret": self.api_secret
                }
                
                response = await client.post(token_url, headers=headers, data=data)
                response.raise_for_status()
                
                token_data = response.json()
                self.access_token = token_data["access_token"]
                
                # Set expiration time (usually 1799 seconds)
                expires_in = token_data.get("expires_in", 1799)
                from datetime import datetime, timedelta
                self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - 60)  # 60 sec buffer
                
                return self.access_token
                
        except Exception as e:
            raise Exception(f"Amadeus authentication error: {str(e)}")
    
    
    async def resolve_airport_code(self, city_name: str) -> Dict[str, Any]:
        """Resolve city name to comprehensive airport information using Gemini AI"""
        try:
            llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.3
            )
            
            prompt = f"""
            You are an aviation expert with comprehensive knowledge of airports worldwide. 
            For the city "{city_name}", provide detailed airport information.
            
            Include:
            1. Primary IATA airport code (3 letters) - the main international airport
            2. Full airport name
            3. City and country
            4. Alternative airports serving the same city/region
            5. Distance from city center if known
            6. Airport type (International/Domestic)
            
            Respond in JSON format:
            {{
                "airport_code": "XXX",
                "airport_name": "Full Airport Name",
                "city": "{city_name}",
                "country": "Country Name",
                "alternatives": [
                    {{"code": "YYY", "name": "Alternative Airport Name", "type": "International/Domestic"}}
                ],
                "distance_from_city": "XX km",
                "airport_type": "International/Domestic",
                "notes": "Additional information"
            }}
            
            Examples:
            - New York → {{"airport_code": "JFK", "airport_name": "John F. Kennedy International Airport", "alternatives": [{{"code": "LGA", "name": "LaGuardia Airport"}}, {{"code": "EWR", "name": "Newark Liberty International Airport"}}]}}
            - London → {{"airport_code": "LHR", "airport_name": "Heathrow Airport", "alternatives": [{{"code": "LGW", "name": "Gatwick Airport"}}, {{"code": "STN", "name": "Stansted Airport"}}]}}
            - Delhi → {{"airport_code": "DEL", "airport_name": "Indira Gandhi International Airport", "alternatives": []}}
            
            City: {city_name}
            """
            
            messages = [HumanMessage(content=prompt)]
            response = await llm.ainvoke(messages)
            
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in response")
                
            airport_info = json.loads(json_match.group())
            # Validate required fields
            if "airport_code" not in airport_info:
                airport_info["airport_code"] = "XXX"
            if "airport_name" not in airport_info:
                airport_info["airport_name"] = f"{city_name} Airport"
            return airport_info
                
        except Exception as e:
            logger.error(f"Airport resolution error for {city_name}: {str(e)}")
            return {
                "airport_code": "XXX",
                "airport_name": f"{city_name} Airport",
                "city": city_name,
                "country": "Unknown",
                "alternatives": [],
                "error": str(e),
                "notes": "Airport resolution failed"
            }
    
    async def _search_flight_prices_web(self, origin: str, destination: str, date: str) -> Dict[str, Any]:
        """Search for flight prices using DuckDuckGo web search"""
        results = []
        airline_results = []
        search_query = ""
        try:
            # DDGS doesn't support async context manager, use synchronous approach
            def search_flights_sync(query):
                try:
                    with DDGS() as ddgs:
                        return list(ddgs.text(query, max_results=8))
                except Exception as e:
                    print(f"Flight search error: {e}")
                    return []
            
            def search_airlines_sync(query):
                try:
                    with DDGS() as ddgs:
                        return list(ddgs.text(query, max_results=5))
                except Exception as e:
                    print(f"Airline search error: {e}")
                    return []
            
            # Search for flight prices and booking information
            search_query = f"flights {origin} to {destination} price cheap tickets {date}"
            airline_query = f"airline tickets {origin} {destination} booking {date}"
            
            # Run synchronous searches in executor
            import asyncio
            results_task = asyncio.get_event_loop().run_in_executor(None, search_flights_sync, search_query)
            airline_task = asyncio.get_event_loop().run_in_executor(None, search_airlines_sync, airline_query)
            
            search_results, airline_search_results = await asyncio.gather(results_task, airline_task)
            
            results = []
            for result in search_results:
                results.append({
                    "title": result.get("title", ""),
                    "url": result.get("href", ""),
                    "snippet": result.get("body", "")
                })
            
            airline_results = []
            for result in airline_search_results:
                airline_results.append({
                    "title": result.get("title", ""),
                    "url": result.get("href", ""),
                    "snippet": result.get("body", "")
                })
            
            # Use Gemini to analyze the search results
            llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.3
            )
            
            analysis_prompt = f"""
            Analyze these web search results for flights from {origin} to {destination} on {date}.
            Extract useful information about:
            1. Typical price ranges (economy, business, first class)
            2. Popular airlines on this route
            3. Best booking websites and deals
            4. Flight duration and direct vs connecting flights
            5. Best time to book for this route
            6. Alternative dates with better prices
            
            General Flight Results:
            {json.dumps(results[:5], indent=2)}
            
            Airline-Specific Results:
            {json.dumps(airline_results[:3], indent=2)}
            
            Provide a comprehensive summary with practical booking advice and price insights.
            """
            
            messages = [HumanMessage(content=analysis_prompt)]
            analysis = await llm.ainvoke(messages)
            
            return {
                "search_results": results,
                "airline_results": airline_results,
                "price_analysis": analysis.content,
                "search_queries": [search_query, airline_query],
                "route": f"{origin} → {destination}",
                "date": date,
                "total_results": len(results) + len(airline_results)
            }
            
        except Exception as e:
            logger.error(f"Flight price search error: {str(e)}")
            return {
                "search_results": results,  # Return any partial results we might have
                "airline_results": airline_results,
                "price_analysis": f"Unable to fetch complete pricing data: {str(e)}",
                "search_queries": [search_query] if search_query else [],
                "route": f"{origin} → {destination}",
                "date": date,
                "total_results": len(results) + len(airline_results)
            }
    
    async def get_flight_schedules(self, carrier_code: str, flight_number: str, 
                                 departure_date: str) -> Dict[str, Any]:
        """Get flight schedules using Amadeus API"""
        try:
            access_token = await self._get_access_token()
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/v2/schedule/flights"
                
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                
                params = {
                    "carrierCode": carrier_code,
                    "flightNumber": flight_number,
                    "scheduledDepartureDate": departure_date
                }
                
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                
                return response.json()
                
        except Exception as e:
            raise Exception(f"Amadeus flight schedule error: {str(e)}")
    
    async def search_flights_between_cities(self, origin_city: str, destination_city: str, 
                                          departure_date: datetime = None) -> List[Dict[str, Any]]:
        """Search for flights between cities using Amadeus API with intelligent fallbacks"""
        try:
            from models import FlightDetails, FlightSearchResult
            
            # Get airport information using Gemini
            origin_info = await self.resolve_airport_code(origin_city)
            dest_info = await self.resolve_airport_code(destination_city)
            origin_code = origin_info['airport_code']
            dest_code = dest_info['airport_code']
            
            if origin_code == "XXX" or dest_code == "XXX" or not origin_code or not dest_code:
                # Fallback to web search if airport codes not found
                print(f"⚠️ Airport codes not found for {origin_city} → {destination_city}, using web search fallback")
                return await self._search_flights_web_fallback(origin_city, destination_city, departure_date)
            
            departure_date_str = departure_date.strftime("%Y-%m-%d") if departure_date else (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
            
            # Step 1: Check if direct flights are available using Amadeus Direct Destinations API
            direct_flights = await self._get_direct_destinations(origin_code)
            has_direct_flight = any(dest['iataCode'] == dest_code for dest in direct_flights.get('data', []))
            
            if has_direct_flight:
                print(f"✈️ Direct flights available: {origin_city} ({origin_code}) → {destination_city} ({dest_code})")
                # Step 2: Get actual flight offers using Amadeus Flight Offers Search API
                flight_offers = await self._search_flight_offers(origin_code, dest_code, departure_date_str)
                
                if flight_offers:
                    return self._format_flight_offers(flight_offers, origin_city, destination_city)
                else:
                    print(f"⚠️ No flight offers found via Amadeus API, using web search fallback")
                    return await self._search_flights_web_fallback(origin_city, destination_city, departure_date)
            else:
                print(f"⚠️ No direct flights found: {origin_city} ({origin_code}) → {destination_city} ({dest_code})")
                # Step 3: Find alternative routes and suggest connecting flights
                return await self._find_alternative_routes(origin_city, origin_code, destination_city, dest_code, departure_date_str)
            
        except Exception as e:
            print(f"❌ Flight search error: {str(e)}")
            # Ultimate fallback to web search
            return await self._search_flights_web_fallback(origin_city, destination_city, departure_date)
    
    async def _get_direct_destinations(self, departure_airport_code: str) -> Dict[str, Any]:
        """Get direct destinations from an airport using Amadeus API"""
        try:
            access_token = await self._get_access_token()
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/v1/airport/direct-destinations"
                
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                
                params = {
                    "departureAirportCode": departure_airport_code
                    # We skip max and arrivalCountryCode as suggested
                }
                
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                
                return response.json()
                
        except Exception as e:
            print(f"❌ Amadeus Direct Destinations API error: {str(e)}")
            return {"data": []}
    
    async def _search_flight_offers(self, origin_code: str, dest_code: str, departure_date: str, 
                                  adults: int = 1) -> List[Dict[str, Any]]:
        """Search for flight offers using Amadeus Flight Offers Search API"""
        try:
            access_token = await self._get_access_token()
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/v2/shopping/flight-offers"
                
                headers = {
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                }
                
                params = {
                    "originLocationCode": origin_code,
                    "destinationLocationCode": dest_code,
                    "departureDate": departure_date,
                    "adults": adults,
                    "max": 10  # Limit results
                }
                
                response = await client.get(url, headers=headers, params=params)
                response.raise_for_status()
                
                flight_data = response.json()
                return flight_data.get("data", [])
                
        except Exception as e:
            print(f"❌ Amadeus Flight Offers Search API error: {str(e)}")
            return []
    
    def _format_flight_offers(self, flight_offers: List[Dict[str, Any]], 
                            origin_city: str, destination_city: str) -> List[Dict[str, Any]]:
        """Format Amadeus flight offers into standardized format"""
        formatted_flights = []
        
        for offer in flight_offers:
            try:
                # Extract flight details from Amadeus response
                itineraries = offer.get("itineraries", [])
                price = offer.get("price", {})
                
                for itinerary in itineraries:
                    segments = itinerary.get("segments", [])
                    duration = itinerary.get("duration", "N/A")
                    
                    if segments:
                        first_segment = segments[0]
                        last_segment = segments[-1]
                        
                        flight = {
                            "flight_id": offer.get("id", "N/A"),
                            "airline": first_segment.get("carrierCode", "N/A"),
                            "flight_number": f"{first_segment.get('carrierCode', '')}{first_segment.get('number', '')}",
                            "origin": origin_city,
                            "destination": destination_city,
                            "origin_airport": first_segment.get("departure", {}).get("iataCode", "N/A"),
                            "destination_airport": last_segment.get("arrival", {}).get("iataCode", "N/A"),
                            "departure_time": first_segment.get("departure", {}).get("at", "N/A"),
                            "arrival_time": last_segment.get("arrival", {}).get("at", "N/A"),
                            "duration": duration,
                            "stops": len(segments) - 1,
                            "price": {
                                "total": price.get("total", "N/A"),
                                "currency": price.get("currency", "USD"),
                                "base": price.get("base", "N/A")
                            },
                            "aircraft": first_segment.get("aircraft", {}).get("code", "N/A"),
                            "class": "Economy",  # Default, could be enhanced
                            "source": "amadeus_api"
                        }
                        formatted_flights.append(flight)
                        
            except Exception as e:
                print(f"⚠️ Error formatting flight offer: {str(e)}")
                continue
        
        return formatted_flights
    
    async def _find_alternative_routes(self, origin_city: str, origin_code: str, 
                                     destination_city: str, dest_code: str, 
                                     departure_date: str) -> List[Dict[str, Any]]:
        """Find alternative routes when no direct flights are available"""
        try:
            print(f"🔍 Finding alternative routes for {origin_city} → {destination_city}")
            
            # Get possible connecting airports from origin
            direct_destinations = await self._get_direct_destinations(origin_code)
            connecting_airports = direct_destinations.get("data", [])
            
            alternative_suggestions = []
            
            # Check if any of the connecting airports have flights to destination
            for connecting_airport in connecting_airports[:5]:  # Check top 5 connections
                connecting_code = connecting_airport.get("iataCode")
                connecting_city = connecting_airport.get("name", connecting_code)
                
                if connecting_code:
                    # Check if connecting airport has flights to destination
                    connecting_destinations = await self._get_direct_destinations(connecting_code)
                    
                    has_connection_to_dest = any(
                        dest['iataCode'] == dest_code 
                        for dest in connecting_destinations.get('data', [])
                    )
                    
                    if has_connection_to_dest:
                        alternative_suggestions.append({
                            "type": "connecting_flight",
                            "route": f"{origin_city} → {connecting_city} → {destination_city}",
                            "connecting_airport": connecting_code,
                            "connecting_city": connecting_city,
                            "origin_to_connecting": f"{origin_code} → {connecting_code}",
                            "connecting_to_destination": f"{connecting_code} → {dest_code}",
                            "message": f"Consider flying {origin_city} to {destination_city} via {connecting_city}",
                            "source": "amadeus_route_analysis"
                        })
            
            # Add web search fallback suggestion
            web_results = await self._search_flights_web_fallback(origin_city, destination_city, departure_date)
            
            # Combine alternative suggestions with web search results
            combined_results = alternative_suggestions + web_results
            
            if not combined_results:
                # Final fallback: suggest train/other transport options
                combined_results.append({
                    "type": "alternative_transport",
                    "message": f"No direct flights found between {origin_city} and {destination_city}. Consider alternative transport options like trains or nearby airports.",
                    "suggestions": [
                        f"Check train options from {origin_city} to {destination_city}",
                        f"Look for flights from nearby airports",
                        f"Consider multi-city trip with stops"
                    ],
                    "source": "system_suggestion"
                })
            
            return combined_results
            
        except Exception as e:
            print(f"❌ Error finding alternative routes: {str(e)}")
            return await self._search_flights_web_fallback(origin_city, destination_city, departure_date)
    
    async def _search_flights_web_fallback(self, origin_city: str, destination_city: str, 
                                         departure_date: datetime) -> List[Dict[str, Any]]:
        """Fallback flight search using web search and AI analysis"""
        try:
            date_str = departure_date.strftime("%Y-%m-%d") if departure_date else (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
            
            # Use existing web search method
            web_data = await self._search_flight_prices_web(origin_city, destination_city, date_str)
            
            # Format web search results as flight suggestions
            web_flights = []
            
            if web_data.get("search_results"):
                web_flights.append({
                    "type": "web_search_results",
                    "origin": origin_city,
                    "destination": destination_city,
                    "departure_date": date_str,
                    "price_analysis": web_data.get("price_analysis", "No pricing information available"),
                    "booking_suggestions": [
                        "Check major booking sites like Expedia, Kayak, or airline websites",
                        "Consider flexible dates for better prices",
                        "Book in advance for better deals"
                    ],
                    "search_results_count": len(web_data.get("search_results", [])),
                    "source": "web_search_fallback"
                })
            
            return web_flights
            
        except Exception as e:
            print(f"❌ Web search fallback error: {str(e)}")
            return [{
                "type": "error_fallback",
                "message": f"Unable to find flights between {origin_city} and {destination_city}. Please try different cities or contact a travel agent.",
                "source": "error_handler"
            }]
    
    async def search_flights(self, origin_city: str, destination_city: str, departure_date: str, return_date: str = None):
        """Wrapper so orchestrator can call a consistent method"""
        try:
            # Convert string date into datetime
            from datetime import datetime
            dep_date_obj = datetime.strptime(departure_date, "%Y-%m-%d")
            return_date_obj = None
            if return_date:
                return_date_obj = datetime.strptime(return_date, "%Y-%m-%d")

            # Use your existing function
            results = await self.search_flights_between_cities(origin_city, destination_city, dep_date_obj)

            return {
                "flights": results,
                "origin": origin_city,
                "destination": destination_city,
                "departure_date": departure_date,
                "return_date": return_date
            }
        except Exception as e:
            print(f"❌ search_flights wrapper error: {e}")
            raise

    async def get_flight_recommendations_basic(self, origin_city: str, destination_city: str,
                                       departure_date: datetime = None,
                                       preferences: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get flight recommendations with AI analysis"""
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            
            # Search for flights
            flights = await self.search_flights_between_cities(origin_city, destination_city, departure_date)
            
            if not flights:
                return {
                    "flights": [],
                    "recommendations": f"No flights found between {origin_city} and {destination_city}. Please check city names or try alternative airports.",
                    "route_analysis": f"No direct flights available between {origin_city} and {destination_city}."
                }
            
            # Use Gemini to analyze and recommend flights
            llm = ChatGoogleGenerativeAI(
                model=settings.GEMINI_MODEL,
                google_api_key=settings.GEMINI_API_KEY,
                temperature=0.3
            )
            
            prompt = f"""
            Analyze the following flight options from {origin_city} to {destination_city} and provide recommendations:

            Available Flights:
            {json.dumps(flights, indent=2)}

            Travel Preferences: {preferences or 'None specified'}

            Please provide:
            1. Best flight options based on timing, duration, and airline
            2. Recommendations for business vs leisure travel
            3. Airport and check-in tips
            4. Best booking strategies and timing
            5. Alternative options and considerations
            6. Travel time recommendations (arrive early, connections, etc.)

            Format your response as helpful travel advice for air travel.
            """
            
            response = await llm.ainvoke(prompt)
            
            return {
                "flights": flights,
                "total_flights": len(flights),
                "recommendations": response.content,
                "route_analysis": f"Found {len(flights)} flights from {origin_city} to {destination_city}",
                "search_timestamp": datetime.now().isoformat(),
                "origin_airport": (await self.resolve_airport_code(origin_city))['airport_code'],
                "destination_airport": (await self.resolve_airport_code(destination_city))['airport_code']
            }
            
        except Exception as e:
            raise Exception(f"Flight recommendations error: {str(e)}")
    
    async def get_flight_recommendations_enhanced(self, origin_city: str, destination_city: str, 
                                       departure_date: str, return_date: str = None,
                                       preferences: Dict[str, Any] = None) -> Dict[str, Any]:
        """Get flight recommendations with enhanced web price search"""
        try:
            # Get basic flight data
            basic_recommendations = await self.get_flight_recommendations_basic(
                origin_city, destination_city, departure_date, preferences
            )
            
            # Get web price search data
            web_price_data = await self._search_flight_prices_web(
                origin_city, destination_city, departure_date
            )
            
            # Get airport information
            origin_airport_info = await self.resolve_airport_code(origin_city)
            dest_airport_info = await self.resolve_airport_code(destination_city)
            
            # Combine all information
            enhanced_recommendations = {
                **basic_recommendations,
                "web_price_analysis": web_price_data,
                "origin_airport_info": origin_airport_info,
                "destination_airport_info": dest_airport_info,
                "enhanced_search": True
            }
            
            return enhanced_recommendations
            
        except Exception as e:
            # Fallback to basic recommendations
            try:
                return await self.get_flight_recommendations_basic(
                    origin_city, destination_city, departure_date, preferences
                )
            except:
                raise Exception(f"Enhanced flight recommendations error: {str(e)}")
    
    async def get_flight_recommendations(self, origin_city: str, destination_city: str, 
                                             departure_date: str, return_date: str = None, preferences: Dict[str, Any] = None) -> Dict[str, Any]:
        """Basic flight recommendations (original method renamed)"""
        # This is the original get_flight_recommendations method content
        flights = await self.search_flights_between_cities(origin_city, destination_city, departure_date)
        
        if not flights:
            return {
                "flights": [],
                "recommendations": f"No flights found between {origin_city} and {destination_city}. Please check city names or try alternative airports.",
                "route_analysis": f"No direct flights available between {origin_city} and {destination_city}."
            }
        
        # Use Gemini to analyze and recommend flights
        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3
        )
        
        prompt = f"""
        Analyze the following flight options from {origin_city} to {destination_city} and provide recommendations:

        Available Flights:
        {json.dumps(flights, indent=2)}

        Travel Preferences: {preferences or 'None specified'}

        Please provide:
        1. Best flight options based on timing, duration, and airline
        2. Recommendations for business vs leisure travel
        3. Airport and check-in tips
        4. Best booking strategies and timing
        5. Alternative options and considerations
        6. Travel time recommendations (arrive early, connections, etc.)

        Format your response as helpful travel advice for air travel.
        """
        
        response = await llm.ainvoke(prompt)
        
        return {
            "flights": flights,
            "total_flights": len(flights),
            "recommendations": response.content,
            "route_analysis": f"Found {len(flights)} flights from {origin_city} to {destination_city}",
            "search_timestamp": datetime.now().isoformat(),
            "origin_airport": (await self.resolve_airport_code(origin_city))['airport_code'],
            "destination_airport": (await self.resolve_airport_code(destination_city))['airport_code']
        }

# Initialize tools
weather_tool = WeatherTool()
maps_tool = MapsTool()
events_tool = EventsTool()
budget_tool = BudgetTool()
accommodation_tool = AccommodationTool()
calendar_tool = GoogleCalendarTool()
trains_tool = IRCTCTrainsTool()
flights_tool = AmadeusFlightsTool()