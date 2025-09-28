from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from datetime import datetime
import json

from models import AgentResponse, TripRequest, WeatherData, Event, BudgetBreakdown, Itinerary, ItineraryItem
from tools import weather_tool, maps_tool, events_tool, budget_tool, accommodation_tool, trains_tool, flights_tool
from config import settings

class BaseAgent:
    """Base class for all agents"""
    
    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=settings.TEMPERATURE,
            max_tokens=settings.MAX_TOKENS
        )
    
    async def process(self, state: Dict[str, Any]) -> AgentResponse:
        """Process the state and return agent response"""
        raise NotImplementedError("Subclasses must implement process method")

class WeatherAgent(BaseAgent):
    """Agent responsible for weather forecasting and analysis"""
    
    def __init__(self):
        super().__init__("weather_agent", "Provides weather forecasts and travel recommendations")
    
    async def process(self, state: Dict[str, Any]) -> AgentResponse:
        try:
            trip_request = state.get("trip_request")
            if not trip_request:
                raise ValueError("Trip request not found in state")
            
            # Get weather data
            weather_data = await weather_tool.get_weather_forecast(
                trip_request.destination,
                trip_request.start_date,
                trip_request.end_date
            )
            
            # Generate weather-based recommendations
            prompt = f"""
            Based on the weather forecast for {trip_request.destination} from {trip_request.start_date} to {trip_request.end_date}:
            Weather conditions: {weather_data.conditions}
            Temperature range: {weather_data.temperature_range}
            Precipitation chance: {weather_data.precipitation_chance}
            
            Provide travel recommendations and what to pack.
            """
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            recommendations = response.content
            
            return AgentResponse(
                agent_name=self.name,
                status="completed",
                data={
                    "weather_data": weather_data.dict(),
                    "recommendations": recommendations
                },
                timestamp=datetime.now(),
                next_actions=["route_planning"]
            )
            
        except Exception as e:
            return AgentResponse(
                agent_name=self.name,
                status="error",
                data={"error": str(e)},
                timestamp=datetime.now()
            )

class MapsAgent(BaseAgent):
    """Agent responsible for route planning and navigation"""
    
    def __init__(self):
        super().__init__("maps_agent", "Handles route planning and location services")
    
    async def process(self, state: Dict[str, Any]) -> AgentResponse:
        try:
            trip_request = state.get("trip_request")
            weather_data = state.get("weather_data")
            
            # Determine origin (could be user's location or previous destination)
            origin = "Current Location"  # This should be determined from user context
            
            route_details = await maps_tool.get_route(
                origin=origin,
                destination=trip_request.destination,
                transport_mode="driving"  # Could be determined from preferences
            )
            
            # Create interactive map
            try:
                map_path = await maps_tool.create_route_map(
                    origin=origin,
                    destination=trip_request.destination,
                    transport_mode="driving"
                )
                route_details.map_html_path = map_path
            except Exception as e:
                print(f"Map creation warning: {e}")
            
            # Generate route recommendations based on weather
            prompt = f"""
            Plan the best route to {trip_request.destination}.
            Weather conditions: {weather_data.get('conditions') if weather_data else 'unknown'}
            Route distance: {route_details.distance} km
            Estimated travel time: {route_details.travel_time}
            
            Provide route recommendations and alternative transport options.
            Consider the weather conditions when suggesting the best times to travel.
            """
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            recommendations = response.content
            
            return AgentResponse(
                agent_name=self.name,
                status="completed",
                data={
                    "route_details": route_details.dict(),
                    "recommendations": recommendations
                },
                timestamp=datetime.now(),
                next_actions=["event_planning"]
            )
            
        except Exception as e:
            return AgentResponse(
                agent_name=self.name,
                status="error",
                data={"error": str(e)},
                timestamp=datetime.now()
            )

class EventsAgent(BaseAgent):
    """Agent responsible for finding events and activities"""
    
    def __init__(self):
        super().__init__("events_agent", "Finds and recommends events and activities")
    
    async def process(self, state: Dict[str, Any]) -> AgentResponse:
        try:
            trip_request = state.get("trip_request")
            weather_data = state.get("weather_data")
            
            # Get activity preferences from user preferences
            preferences = trip_request.preferences or {}
            activity_types = preferences.get("activity_types", ["entertainment", "sightseeing"])
            
            events = await events_tool.find_events(
                location=trip_request.destination,
                start_date=trip_request.start_date,
                end_date=trip_request.end_date,
                categories=activity_types
            )
            
            # Filter events based on weather and preferences
            prompt = f"""
            Recommend the best events and activities from this list for {trip_request.destination}:
            {[{"name": e.name, "category": e.category, "price": e.price} for e in events]}
            
            Consider:
            - Weather conditions: {weather_data.get('conditions') if weather_data else 'unknown'}
            - Budget: {trip_request.budget}
            - User preferences: {activity_types}
            
            Prioritize events that are suitable for the weather and within budget.
            """
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            recommendations = response.content
            
            return AgentResponse(
                agent_name=self.name,
                status="completed",
                data={
                    "events": [event.dict() for event in events],
                    "recommendations": recommendations
                },
                timestamp=datetime.now(),
                next_actions=["budget_optimization"]
            )
            
        except Exception as e:
            return AgentResponse(
                agent_name=self.name,
                status="error",
                data={"error": str(e)},
                timestamp=datetime.now()
            )

class BudgetAgent(BaseAgent):
    """Agent responsible for budget optimization and cost management"""
    
    def __init__(self):
        super().__init__("budget_agent", "Optimizes budget allocation and finds cost-effective options")
    
    async def process(self, state: Dict[str, Any]) -> AgentResponse:
        try:
            trip_request = state.get("trip_request")
            events = state.get("events", [])
            route_details = state.get("route_details")
            
            # Calculate trip duration
            duration = (trip_request.end_date - trip_request.start_date).days
            
            # Get budget optimization
            budget_options = await budget_tool.optimize_budget(
                total_budget=float(trip_request.budget),
                destination=trip_request.destination,
                days=duration,
                preferences=trip_request.preferences or {}
            )
            
            # Calculate estimated costs
            event_costs = sum(event.get("price", 0) for event in events if isinstance(event, dict))
            transport_cost = budget_options.transport_options[0]["cost"] if budget_options.transport_options else 0
            
            prompt = f"""
            Optimize budget allocation for a {duration}-day trip to {trip_request.destination}:
            
            Total budget: ${trip_request.budget}
            Estimated event costs: ${event_costs}
            Transport options: {budget_options.transport_options}
            Accommodation options: {budget_options.accommodation_options}
            
            Provide a detailed budget breakdown and money-saving recommendations.
            """
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            recommendations = response.content
            
            # Create budget breakdown
            budget_breakdown = BudgetBreakdown(
                total_budget=trip_request.budget,
                accommodation=trip_request.budget * 0.4,
                transportation=trip_request.budget * 0.3,
                food=trip_request.budget * 0.2,
                activities=trip_request.budget * 0.1,
                miscellaneous=trip_request.budget * 0.05
            )
            
            return AgentResponse(
                agent_name=self.name,
                status="completed",
                data={
                    "budget_breakdown": budget_breakdown.dict(),
                    "budget_options": budget_options.dict(),
                    "recommendations": recommendations
                },
                timestamp=datetime.now(),
                next_actions=["itinerary_creation"]
            )
            
        except Exception as e:
            return AgentResponse(
                agent_name=self.name,
                status="error",
                data={"error": str(e)},
                timestamp=datetime.now()
            )

class ItineraryAgent(BaseAgent):
    """Agent responsible for creating detailed itineraries"""
    
    def __init__(self):
        super().__init__("itinerary_agent", "Creates comprehensive travel itineraries")
    
    async def process(self, state: Dict[str, Any]) -> AgentResponse:
        try:
            trip_request = state.get("trip_request")
            events = state.get("events", [])
            weather_data = state.get("weather_data")
            budget_breakdown = state.get("budget_breakdown")
            
            duration = (trip_request.end_date - trip_request.start_date).days
            
            prompt = f"""
            Create a detailed {duration}-day itinerary for {trip_request.destination}:
            
            Available events: {[e.get("name") if isinstance(e, dict) else e.name for e in events]}
            Weather forecast: {weather_data.get('conditions') if weather_data else 'unknown'}
            Budget per day: ${float(trip_request.budget) / duration:.2f}
            
            Create a day-by-day schedule with:
            - Morning, afternoon, and evening activities
            - Travel time between locations
            - Meal recommendations
            - Free time for exploration
            """
            
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            itinerary_text = response.content
            
            # Create structured itinerary (simplified for demo)
            itinerary_items = []
            for day in range(1, duration + 1):
                day_items = [
                    ItineraryItem(
                        id=f"day_{day}_morning",
                        day=day,
                        time="09:00",
                        activity=f"Morning activity for day {day}",
                        location=trip_request.destination,
                        duration="3 hours",
                        cost_estimate=50.0
                    ),
                    ItineraryItem(
                        id=f"day_{day}_afternoon",
                        day=day,
                        time="14:00",
                        activity=f"Afternoon activity for day {day}",
                        location=trip_request.destination,
                        duration="4 hours",
                        cost_estimate=75.0
                    )
                ]
                itinerary_items.append(day_items)
            
            itinerary = Itinerary(
                id=f"itinerary_{trip_request.user_id}",
                trip_id=f"trip_{trip_request.user_id}",
                days=itinerary_items,
                total_estimated_cost=trip_request.budget,
                last_updated=datetime.now()
            )
            
            return AgentResponse(
                agent_name=self.name,
                status="completed",
                data={
                    "itinerary": itinerary.dict(),
                    "itinerary_text": itinerary_text
                },
                timestamp=datetime.now(),
                next_actions=["trip_summary"]
            )
            
        except Exception as e:
            return AgentResponse(
                agent_name=self.name,
                status="error",
                data={"error": str(e)},
                timestamp=datetime.now()
            )

class FlightsAgent(BaseAgent):
    """Agent responsible for finding and recommending flight travel options"""
    
    def __init__(self):
        super().__init__("flights_agent", "Finds and recommends flight travel options using Amadeus API")
    
    async def process(self, state: Dict[str, Any]) -> AgentResponse:
        try:
            trip_request = state.get("trip_request")
            
            if not trip_request:
                raise ValueError("Trip request not found in state")
            
            # Determine if this trip would benefit from flight recommendations
            user_preferences = trip_request.preferences or {}
            origin = user_preferences.get("origin", "Delhi")  # Default origin
            
            # Check if distance/international travel suggests flights are needed
            destination = trip_request.destination.lower()
            is_international = any(country in destination for country in [
                "usa", "uk", "france", "germany", "japan", "singapore", "thailand", "australia", "canada"
            ])
            
            is_long_distance = any(city in destination for city in [
                "mumbai", "bangalore", "chennai", "kolkata", "hyderabad", "pune", "delhi", "goa"
            ])
            
            if not (is_international or is_long_distance):
                return AgentResponse(
                    agent_name=self.name,
                    status="skipped",
                    data={
                        "message": "Flight search skipped - short distance travel or local trip",
                        "flights": []
                    },
                    timestamp=datetime.now(),
                    next_actions=["train_search"]
                )
            
            # Get enhanced flight recommendations with web price search
            flight_recommendations = await flights_tool.get_flight_recommendations(
                origin_city=origin,
                destination_city=trip_request.destination,
                departure_date=trip_request.start_date.strftime("%Y-%m-%d"),
                return_date=trip_request.end_date.strftime("%Y-%m-%d") if trip_request.end_date else None,
                preferences=user_preferences
            )
            
            # Generate AI analysis
            prompt = f"""
            You are a flight travel expert analyzing flight options for a trip from {origin} to {trip_request.destination}.
            
            Trip Details:
            - Origin: {origin}
            - Destination: {trip_request.destination}
            - Travel Date: {trip_request.start_date}
            - Return Date: {trip_request.end_date}
            - Budget: ${trip_request.budget}
            - Duration: {trip_request.end_date - trip_request.start_date}
            
            Flight Search Results:
            {flight_recommendations.get('recommendations', 'No specific recommendations available')}
            
            Available Flights: {len(flight_recommendations.get('flights', []))}
            
            Web Price Analysis:
            {flight_recommendations.get('web_price_analysis', {}).get('price_analysis', 'No web pricing data available')}
            
            Airport Information:
            - Origin: {flight_recommendations.get('origin_airport_info', {}).get('airport_name', 'Unknown')} ({flight_recommendations.get('origin_airport_info', {}).get('airport_code', 'Unknown')})
            - Destination: {flight_recommendations.get('destination_airport_info', {}).get('airport_name', 'Unknown')} ({flight_recommendations.get('destination_airport_info', {}).get('airport_code', 'Unknown')})
            
            Provide comprehensive flight travel analysis including:
            1. Best flight options for this trip
            2. Timing recommendations (departure/arrival times)
            3. Airport information and transfer tips
            4. Booking strategies and best practices
            5. Cost considerations and budget impact
            6. Integration with overall itinerary planning
            7. Travel document requirements if international
            
            Be practical and helpful for trip planning.
            """
            
            messages = [HumanMessage(content=prompt)]
            response = await self.llm.ainvoke(messages)
            
            return AgentResponse(
                agent_name=self.name,
                status="completed",
                data={
                    "flight_recommendations": flight_recommendations,
                    "analysis": response.content,
                    "flights_found": len(flight_recommendations.get('flights', [])),
                    "route": f"{origin} → {trip_request.destination}",
                    "is_flight_suitable": len(flight_recommendations.get('flights', [])) > 0,
                    "origin_airport": flight_recommendations.get('origin_airport'),
                    "destination_airport": flight_recommendations.get('destination_airport')
                },
                timestamp=datetime.now(),
                next_actions=["train_search"]
            )
            
        except Exception as e:
            return AgentResponse(
                agent_name=self.name,
                status="error",
                data={"error": str(e)},
                timestamp=datetime.now()
            )

class TrainsAgent(BaseAgent):
    """Agent responsible for finding and recommending train travel options"""
    
    def __init__(self):
        super().__init__("trains_agent", "Finds and recommends train travel options using IRCTC")
    
    async def process(self, state: Dict[str, Any]) -> AgentResponse:
        try:
            trip_request = state.get("trip_request")
            route_details = state.get("route_details")
            
            if not trip_request:
                raise ValueError("Trip request not found in state")
            
            # Check if this is a domestic India trip that could benefit from train travel
            destination = trip_request.destination.lower()
            india_keywords = ["india", "delhi", "mumbai", "bangalore", "chennai", "kolkata", "hyderabad", "pune"]
            
            is_india_trip = any(keyword in destination for keyword in india_keywords)
            
            if not is_india_trip:
                return AgentResponse(
                    agent_name=self.name,
                    status="skipped",
                    data={
                        "message": "Train search skipped - not an India domestic trip",
                        "trains": []
                    },
                    timestamp=datetime.now(),
                    next_actions=["calendar_sync"]
                )
            
            # Determine origin (assume user preference or major city)
            user_preferences = trip_request.preferences or {}
            origin = user_preferences.get("origin", "Delhi")  # Default to Delhi if not specified
            
            # Get train recommendations
            train_recommendations = await trains_tool.get_train_recommendations(
                origin=origin,
                destination=trip_request.destination,
                travel_date=trip_request.start_date,
                preferences=user_preferences
            )
            
            # Generate AI analysis
            prompt = f"""
            You are a train travel expert analyzing train options for a trip from {origin} to {trip_request.destination}.
            
            Trip Details:
            - Origin: {origin}
            - Destination: {trip_request.destination}
            - Travel Date: {trip_request.start_date}
            - Budget: ${trip_request.budget}
            - Duration: {trip_request.end_date - trip_request.start_date}
            
            Train Search Results:
            {train_recommendations.get('recommendations', 'No specific recommendations available')}
            
            Available Trains: {len(train_recommendations.get('trains', []))}
            
            Web Price Analysis:
            {train_recommendations.get('web_price_analysis', {}).get('price_analysis', 'No web pricing data available')}
            
            Station Information:
            - Origin: {train_recommendations.get('origin_station_info', {}).get('station_name', 'Unknown')} ({train_recommendations.get('origin_station_info', {}).get('main_station_code', 'Unknown')})
            - Destination: {train_recommendations.get('destination_station_info', {}).get('station_name', 'Unknown')} ({train_recommendations.get('destination_station_info', {}).get('main_station_code', 'Unknown')})
            
            Provide comprehensive train travel analysis including:
            1. Best train options for this trip
            2. Cost comparison with other transport modes
            3. Travel time considerations
            4. Booking recommendations and tips
            5. Integration with overall itinerary
            6. Advantages of train travel for this route
            
            Be practical and helpful for trip planning.
            """
            
            messages = [HumanMessage(content=prompt)]
            response = await self.llm.ainvoke(messages)
            
            return AgentResponse(
                agent_name=self.name,
                status="completed",
                data={
                    "train_recommendations": train_recommendations,
                    "analysis": response.content,
                    "trains_found": len(train_recommendations.get('trains', [])),
                    "route": f"{origin} → {trip_request.destination}",
                    "is_train_suitable": len(train_recommendations.get('trains', [])) > 0
                },
                timestamp=datetime.now(),
                next_actions=["calendar_sync"]
            )
            
        except Exception as e:
            return AgentResponse(
                agent_name=self.name,
                status="error",
                data={"error": str(e)},
                timestamp=datetime.now()
            )

class CalendarAgent(BaseAgent):
    """Agent responsible for syncing travel itinerary to Google Calendar"""
    
    def __init__(self):
        super().__init__("calendar_agent", "Syncs travel itinerary to Google Calendar")
    
    async def process(self, state: Dict[str, Any]) -> AgentResponse:
        try:
            trip_request = state.get("trip_request")
            itinerary = state.get("itinerary")
            
            if not trip_request:
                raise ValueError("Trip request not found in state")
            if not itinerary:
                raise ValueError("Itinerary not found in state")
            
            # Import calendar tool
            from tools import calendar_tool
            
            # Generate calendar sync prompt
            prompt = f"""
            You are syncing a travel itinerary to Google Calendar.
            
            Trip Details:
            - Destination: {trip_request.destination}
            - Dates: {trip_request.start_date} to {trip_request.end_date}
            - User: {trip_request.user_id}
            
            The itinerary has {len(itinerary.days)} days planned with various activities.
            
            Provide insights about the calendar integration including:
            1. Benefits of having the itinerary in Google Calendar
            2. Reminders and notifications setup
            3. Sharing capabilities with travel companions
            4. Integration with other travel apps
            5. Offline access considerations
            
            Make it informative and helpful for the traveler.
            """
            
            # Get AI insights about calendar integration
            messages = [HumanMessage(content=prompt)]
            response = await self.llm.ainvoke(messages)
            calendar_insights = response.content
            
            # Sync itinerary to Google Calendar
            try:
                calendar_result = await calendar_tool.sync_itinerary_to_calendar(itinerary, trip_request)
                
                sync_status = "completed" if calendar_result.success else "partial"
                
                return AgentResponse(
                    agent_name=self.name,
                    status=sync_status,
                    data={
                        "calendar_integration": calendar_result.dict(),
                        "insights": calendar_insights,
                        "events_created": len(calendar_result.created_events),
                        "calendar_url": calendar_result.trip_calendar_url,
                        "calendar_id": calendar_result.calendar_id,
                        "errors": calendar_result.errors
                    },
                    timestamp=datetime.now(),
                    next_actions=["trip_finalization"] if calendar_result.success else ["calendar_retry"]
                )
                
            except Exception as calendar_error:
                # If calendar integration fails, still provide insights
                return AgentResponse(
                    agent_name=self.name,
                    status="warning",
                    data={
                        "calendar_integration": None,
                        "insights": calendar_insights,
                        "error": str(calendar_error),
                        "fallback_message": "Calendar integration failed, but your itinerary is complete. You can manually add events to your calendar using the provided details."
                    },
                    timestamp=datetime.now(),
                    next_actions=["trip_summary"]
                )
            
        except Exception as e:
            return AgentResponse(
                agent_name=self.name,
                status="error",
                data={"error": str(e)},
                timestamp=datetime.now()
            )

# Initialize agents
weather_agent = WeatherAgent()
maps_agent = MapsAgent()
events_agent = EventsAgent()
budget_agent = BudgetAgent()
itinerary_agent = ItineraryAgent()
flights_agent = FlightsAgent()
trains_agent = TrainsAgent()
calendar_agent = CalendarAgent()