from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, List, Any
import json
import asyncio
import logging
from datetime import datetime, timedelta
from langchain_google_genai import ChatGoogleGenerativeAI
import dateparser

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from tools import WeatherTool, AmadeusFlightsTool, IRCTCTrainsTool, EventsTool, AccommodationTool, MapsTool, TravelAssistantTool
async def interpret_tool_data(self, user_id: str, tool_type: str, tool_data: Any, original_message: str) -> Dict[str, Any]:
        context = self.get_user_context(user_id)
        
        # Special handling for events and accommodations to emphasize booking URLs
        additional_instructions = ""
        if tool_type == "events":
            additional_instructions = """
IMPORTANT: For each event, if a booking_url is provided, clearly mention that users can click the link to get more information or book tickets. 
Format it like: "🔗 More info: [URL]" or "Click here for details: [URL]"
Make the URLs clickable and visible in your response.
"""
        elif tool_type == "accommodation":
            additional_instructions = """
IMPORTANT: For each accommodation option:
1. Include the ACTUAL hotel/accommodation name (not generic names)
2. If a booking_url is provided, clearly display it for users to book
Format it like: "🏨 [Hotel Name] - 🔗 Book here: [URL]"
Make the URLs clickable and visible in your response.
Prioritize showing real hotel names and booking links from the data.
"""
        elif tool_type == "flights":
            additional_instructions = """
IMPORTANT: For flight search results:
1. Display the search_results and airline_results with their booking URLs
2. Format each result like: "✈️ [Airline/Source] - 🔗 Book here: [URL]"
3. Show the actual URLs from search_results so users can click to book
4. Include price information if available in the snippets
5. Make the booking URLs prominent and clickable
Example format:
"✈️ Kayak - Flights from NYC to London - 🔗 https://www.kayak.com/flights/..."
"✈️ Expedia - Best deals on this route - 🔗 https://www.expedia.com/..."
"""
        
        interpretation_prompt = f"""
I retrieved {tool_type} data. Present this clearly and conversationally. 
Do NOT make up info, only summarize what's there.
{additional_instructions}

User Request: "{original_message}"

{tool_type.title()} Data:
{json.dumps(safe_json(tool_data), indent=2)}

User Context:
{json.dumps(context.get('basic_info', {}), indent=2)}
"""
        try:
            response = await self.llm.ainvoke(interpretation_prompt)
            interpreted_response = response.content.strip()
            self.add_to_conversation_history(user_id, "assistant", interpreted_response)
            return {
                "type": "message",
                "message": interpreted_response,
                "tool_data_type": tool_type,
                "suggested_responses": self.generate_tool_based_suggestions(tool_type, context),
                "has_tool_data": True
            }
        except Exception as e:
            return {"type":"message","message":f"I retrieved {tool_type} info but had trouble summarizing it.","error_details":str(e)}
from config import settings

# --- Utility for safe serialization ---
def safe_json(obj: Any) -> Any:
    try:
        return json.loads(json.dumps(obj, default=str))
    except Exception:
        try:
            return obj.dict()
        except Exception:
            return str(obj)

class ConnectionManager:
    """Manages WebSocket connections for real-time chat"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"User {user_id} connected to chat")
    
    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"User {user_id} disconnected from chat")
    
    async def send_message(self, user_id: str, message: dict):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_json(message)
            except WebSocketDisconnect:
                print(f"WebSocket disconnected for {user_id}")
                self.disconnect(user_id)
            except Exception as e:
                print(f"Error sending message to {user_id}: {e}")
                self.disconnect(user_id)

class GeminiChatOrchestrator:
    """Gemini-powered intelligent chat orchestrator that decides everything"""
    
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3
        )
        self.user_sessions = {}  # Store user conversation context
        self.tools = {
            "weather": WeatherTool(),
            "flights": AmadeusFlightsTool(),
            "trains": IRCTCTrainsTool(),
            "events": EventsTool(),
            "accommodation": AccommodationTool(),
            "maps": MapsTool(),
            "assistant": TravelAssistantTool()
        }
    
    def get_user_context(self, user_id: str) -> Dict[str, Any]:
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = {
                "basic_info": {},
                "conversation_history": [],
                "tool_data": {},
                "preferences": {},
                "last_tool_call": None
            }
        return self.user_sessions[user_id]
    
    def add_to_conversation_history(self, user_id: str, role: str, content: str):
        context = self.get_user_context(user_id)
        context["conversation_history"].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        if len(context["conversation_history"]) > 10:
            context["conversation_history"] = context["conversation_history"][-10:]
    
    async def process_user_message(self, user_id: str, message: str) -> Dict[str, Any]:
        context = self.get_user_context(user_id)
        self.add_to_conversation_history(user_id, "user", message)
        
        system_prompt = f"""
You are an expert travel planning assistant. Your job is to help users plan their trips by:

Rules:
- DO NOT hallucinate.
- Use only tool data or user-provided info.
- Ask if missing information.
- Never invent prices or details.
-

Tools available:
weather, flights, trains, events, accommodation, maps, budget.

User Context:
{json.dumps(context.get('basic_info', {}), indent=2)}

Conversation History (last 5):
{json.dumps(context['conversation_history'][-5:], indent=2)}

User Message: "{message}"

Respond with either:
- TOOL_CALL: [tool_name] with [parameters]
- OR a direct answer
- OR a clarifying question
"""
        try:
            response = await self.llm.ainvoke(system_prompt)
            gemini_response = response.content.strip()

            # Normalize tool call detection
            if gemini_response.lower().startswith("tool_call:") or "tool_call:" in gemini_response.lower():
                return await self.handle_tool_call(user_id, gemini_response, message)
            
            # Direct conversational reply
            self.add_to_conversation_history(user_id, "assistant", gemini_response)
            return {
                "type": "message",
                "message": gemini_response,
                "suggested_responses": self.generate_suggestions(gemini_response, context),
                "has_tool_data": bool(context.get("tool_data"))
            }
                
        except asyncio.TimeoutError:
            return {
                "type": "error",
                "message": "The request timed out. Please try again.",
                "error_details": "Operation timed out"
            }
        except ValueError as e:
            return {
                "type": "error",
                "message": "Invalid input provided. Please check your message.",
                "error_details": str(e)
            }
        except Exception as e:
            logger.error(f"Unexpected error processing message: {e}", exc_info=True)
            return {
                "type": "error",
                "message": "I'm having trouble processing your request. Please try again.",
                "error_details": str(e)
            }
    
    async def handle_tool_call(self, user_id: str, tool_instruction: str, original_message: str) -> Dict[str, Any]:
        context = self.get_user_context(user_id)
        tool_part = tool_instruction.replace("TOOL_CALL:", "").strip().lower()
        print(f"Tool call detected: {tool_part}")
        
        # Extract JSON parameters if present
        import re
        json_match = re.search(r'{.*}', tool_part)
        params = {}
        if json_match:
            try:
                # Get the matched JSON string and parse it
                matched_json = json_match.group()
                logger.debug(f"Extracted JSON string: {matched_json}")
                params = json.loads(matched_json)
                logger.info(f"Parsed parameters: {params}")
                
                # Update context with any provided parameters
                if params:
                    context_updates = {}
                    # Handle different parameter naming patterns
                    if 'city' in params:
                        context_updates['destination'] = params['city']
                    if 'departure_city' in params:
                        context_updates['origin'] = params['departure_city']
                    if 'arrival_city' in params:
                        context_updates['destination'] = params['arrival_city']
                    if 'date' in params:
                        context_updates['date'] = params['date']
                    
                    # Update the context
                    context.setdefault('basic_info', {}).update(context_updates)
                    logger.debug(f"Updated context with: {context_updates}")
            except json.JSONDecodeError:
                logger.debug("Could not parse JSON parameters from tool call")
        
        try:
            if "weather" in tool_part:
                # Extract city and date information
                location = context.get('tool_data', {}).get('city') or await self.extract_location_from_context(context, original_message)
                date_text = context.get('tool_data', {}).get('date') or original_message
                print(f"city: {location}")
                print(f"date: {date_text}") 
                print(f"tool: {json_match}.city") 
                if not location:
                    return {
                        "type": "message",
                        "message": "Which city should I check the weather for?",
                        "suggested_responses": ["Paris", "London", "Tokyo", "Mumbai"]
                    }

                # Parse requested date, excluding the city name from parsing
                date_text = date_text.lower().replace(location.lower(), '').strip()
                parsed_date = dateparser.parse(date_text, settings={'PREFER_DATES_FROM': 'future'}) if date_text else None
                
                if parsed_date is None:
                    # fallback: next 24 hours
                    start_date = datetime.now()
                    end_date = start_date + timedelta(days=1)
                else:
                    # forecast for the specified date
                    start_date = parsed_date
                    end_date = parsed_date + timedelta(days=1)

                weather_data = await self.tools["weather"].get_weather_forecast(location, start_date, end_date)
                context["tool_data"]["weather"] = safe_json(weather_data)
                return await self.interpret_tool_data(user_id, "weather", weather_data, original_message)


            elif "flight" in tool_part:
                basic_info = context.get("basic_info", {})
                
                # Process tool call parameters first
                origin = None
                destination = None
                dep_date = None
                print(f"params:{params}")
                # Check for direct parameters in tool call
                if params:
                    origin = params.get('departure_city') or params.get('origin')
                    destination = params.get('arrival_city') or params.get('destination') or params.get('destination_city')
                    dep_date = dateparser.parse(params.get('departure_date')) if params.get('departure_date')else None
                    if not dep_date:
                        dep_date=dateparser.parse(params.get('date')) if params.get('date') else None
                    if origin:
                        basic_info['origin'] = origin
                    if destination:
                        basic_info['destination'] = destination
                    context['basic_info'] = basic_info
                
                # If no origin in params, check context and user message
                # if not origin:
                #     origin = basic_info.get("origin")
                #     if not origin and "tool_data" not in context:
                #         # This is a direct response to origin question
                #         origin = original_message
                #         basic_info["origin"] = origin
                #         context["basic_info"] = basic_info
                
                # If still no origin, ask user
                
                # If no destination in params, try to extract from context/message
                # if not destination:
                #     destination = basic_info.get("destination") or await self.extract_location_from_context(context, original_message)
                
                # # If still no destination, ask user
                # if not destination:
                #     region = context.get("basic_info", {}).get("region", "global")
                #     suggestions = await self._get_city_suggestions(region, "destination", 
                #         reference_city=origin)
                #     return {
                #         "type":"message",
                #         "message":"And where would you like to go?",
                #         "suggested_responses": suggestions
                #     }
                
              

                # Parse dates from user message if available
                # dep_date = dateparser.parse(original_message, settings={'PREFER_DATES_FROM': 'future'})
                ret_date = None
                if "return" in context.get("basic_info", {}):
                    ret_date = dateparser.parse(context["basic_info"]["return"])
               
                # if not dep_date:
                #     # fallback: 30 days later
                #     dep_date = datetime.now() + timedelta(days=30)
                print(f"dddepppp: {dep_date}")
                flights_data = await self.tools["flights"].search_flights(
                    origin,
                    destination,
                    dep_date.strftime("%Y-%m-%d"),
                    return_date=ret_date.strftime("%Y-%m-%d") if ret_date else None
                )

                context["tool_data"]["flights"] = safe_json(flights_data)
                return await self.interpret_tool_data(user_id,"flights",flights_data,original_message)


            elif "train" in tool_part:
                basic_info = context.get("basic_info", {})
                # Process tool call parameters first
                origin = None
                destination = None
                dep_date = None
                print(f"params:{params}")
                # Check for direct parameters in tool call
                if params:
                    origin = params.get('departure_city') or params.get('origin')
                    destination = params.get('arrival_city') or params.get('destination')
                    dep_date = dateparser.parse(params.get('departure_date')) if params.get('departure_date')else None
                    if not dep_date:
                        dep_date=dateparser.parse(params.get('date')) if params.get('date') else None
                    if origin:
                        basic_info['origin'] = origin
                    if destination:
                        basic_info['destination'] = destination
                    context['basic_info'] = basic_info
                
                if not destination:
                    suggestions = self._get_city_suggestions("india", "train")
                    return {
                        "type": "message",
                        "message": "Which city would you like to travel to by train?",
                        "suggested_responses": suggestions
                    }
                trains_data = await self.tools["trains"].search_trains_between_cities(origin,destination,dep_date)
                context["tool_data"]["trains"] = safe_json(trains_data)
                return await self.interpret_tool_data(user_id,"trains",trains_data,original_message)

            elif "event" in tool_part:
                # Extract location from params or context
                location = params.get('city') if params else None
                if not location:
                    location = await self.extract_location_from_context(context, original_message)
                if not location:
                    return {"type":"message","message":"Which city should I look for events in?","suggested_responses":["Paris","London","Tokyo","New York"]}
                
                # Parse start and end dates from params
                start_date = None
                end_date = None
                
                if params:
                    # Try to parse start_date
                    if params.get('start_date'):
                        start_date = dateparser.parse(params.get('start_date'), settings={'PREFER_DATES_FROM': 'future'})
                    # Try to parse end_date
                    if params.get('end_date'):
                        end_date = dateparser.parse(params.get('end_date'), settings={'PREFER_DATES_FROM': 'future'})
                
                # Fallback: try to parse from original message
                if not start_date:
                    start_date = dateparser.parse(original_message, settings={'PREFER_DATES_FROM': 'future'})
                
                # Default to current date if still no date
                if not start_date:
                    start_date = datetime.now()
                
                # If no end date, default to 30 days from start
                if not end_date:
                    end_date = start_date + timedelta(days=30)
                
                logger.info(f"Searching events in {location} from {start_date} to {end_date}")
                
                events_data = await self.tools["events"].find_events(
                    location,
                    start_date,
                    end_date,
                    ["entertainment","cultural","sightseeing"]
                )
                
                logger.info(f"Events data retrieved: {len(events_data) if events_data else 0} events")
                
                if not events_data:
                    return {
                        "type": "message",
                        "message": f"I couldn't find any events in {location} for the specified dates. This might be because:\n- The dates are too far in the future\n- No major events are scheduled\n- The search didn't return specific event information\n\nWould you like me to search for something else?",
                        "suggested_responses": ["Find attractions", "Search restaurants", "Weather forecast", "Find hotels"]
                    }
                
                context["tool_data"]["events"] = safe_json(events_data)
                
                # Try to auto-add events to user's calendar if connected
                try:
                    await self.auto_add_events_to_calendar(user_id, events_data)
                except Exception as calendar_error:
                    logger.warning(f"Could not auto-add events to calendar: {calendar_error}")
                
                return await self.interpret_tool_data(user_id,"events",events_data,original_message)

            elif "accommodation" in tool_part or "hotel" in tool_part:
                # Extract location from params or context
                location = params.get('city') if params else None
                if not location:
                    location = await self.extract_location_from_context(context, original_message)
                if not location:
                    return {
                        "type": "message",
                        "message": "Which city should I look for accommodations in?",
                        "suggested_responses": ["Paris", "London", "Tokyo", "New York", "Delhi", "Mumbai"]
                    }
                
                # Parse check-in and check-out dates from params
                check_in_date = None
                check_out_date = None
                
                if params:
                    if params.get('check_in_date'):
                        check_in_date = dateparser.parse(params.get('check_in_date'), settings={'PREFER_DATES_FROM': 'future'})
                    if params.get('check_out_date'):
                        check_out_date = dateparser.parse(params.get('check_out_date'), settings={'PREFER_DATES_FROM': 'future'})
                    if params.get('start_date'):
                        check_in_date = dateparser.parse(params.get('start_date'), settings={'PREFER_DATES_FROM': 'future'})
                    if params.get('end_date'):
                        check_out_date = dateparser.parse(params.get('end_date'), settings={'PREFER_DATES_FROM': 'future'})
                
                # Fallback: try to parse from original message
                if not check_in_date:
                    check_in_date = dateparser.parse(original_message, settings={'PREFER_DATES_FROM': 'future'})
                
                # Default to near future if still no date
                if not check_in_date:
                    check_in_date = datetime.now() + timedelta(days=7)
                
                # Default check-out to 3 days after check-in
                if not check_out_date:
                    check_out_date = check_in_date + timedelta(days=3)
                
                # Get budget preference from params or use default
                budget_str = params.get('budget', 'Mid') if params else 'Mid'
                # Convert budget level to price per night
                budget_map = {
                    'Low': 50.0,
                    'low': 50.0,
                    'Mid': 100.0,
                    'mid': 100.0,
                    'Medium': 100.0,
                    'medium': 100.0,
                    'High': 200.0,
                    'high': 200.0,
                    'Luxury': 300.0,
                    'luxury': 300.0
                }
                budget_per_night = budget_map.get(budget_str, 100.0)
                
                logger.info(f"Searching accommodations in {location} from {check_in_date} to {check_out_date}, budget: ${budget_per_night}/night")
                
                try:
                    accommodation_data = await self.tools["accommodation"].find_accommodations(
                        location,
                        check_in_date,
                        check_out_date,
                        budget_per_night
                    )
                    
                    logger.info(f"Accommodation data retrieved: {len(accommodation_data) if accommodation_data else 0} options")
                    
                    if not accommodation_data:
                        return {
                            "type": "message",
                            "message": f"I couldn't find specific accommodation options in {location} for those dates. However, I recommend checking popular booking sites like Booking.com, Hotels.com, or Airbnb for the best deals.\n\nWould you like me to help with something else?",
                            "suggested_responses": ["Find events", "Weather forecast", "Find flights", "Explore attractions"]
                        }
                    
                    context["tool_data"]["accommodation"] = safe_json(accommodation_data)
                    return await self.interpret_tool_data(user_id, "accommodation", accommodation_data, original_message)
                    
                except Exception as e:
                    logger.error(f"Error searching accommodations: {e}", exc_info=True)
                    return {
                        "type": "message",
                        "message": f"I encountered an issue searching for accommodations. Please try popular booking sites like Booking.com or Hotels.com for {location}.",
                        "suggested_responses": ["Find events", "Weather forecast", "Find flights"]
                    }

            else:
                try:
                    # Use the travel assistant tool for generic queries
                    response_content = await self.tools["assistant"].get_travel_advice(
                        original_message,
                        context.get('basic_info', {}),
                        context['conversation_history']
                    )
                    
                    # Add to conversation history
                    self.add_to_conversation_history(user_id, "assistant", response_content)
                    
                    return {
                        "type": "message",
                        "message": response_content,
                        "suggested_responses": self.generate_contextual_suggestions(response_content, context),
                        "has_tool_data": False
                    }
                except Exception as e:
                    logger.error(f"Error generating generic response: {e}")
                    return {
                        "type": "message",
                        "message": "I understand you need travel assistance. Could you please specify what information you're looking for?",
                        "suggested_responses": ["Weather forecast", "Find flights", "Search for trains", "Discover local events", "Find accommodations"]
                    }
        except Exception as e:
            error_msg = "I encountered an issue while getting that information."
            logger.error(f"{error_msg}: {str(e)}", exc_info=True)
            if hasattr(e, '__await__'):
                # Handle any unawaited coroutines
                try:
                    await e
                except Exception as e_await:
                    logger.error(f"Error handling unawaited coroutine: {e_await}", exc_info=True)
                    return {"type":"error","message":error_msg,"error_details":str(e_await)}
            return {"type":"error","message":error_msg,"error_details":str(e)}

    async def interpret_tool_data(self, user_id: str, tool_type: str, tool_data: Any, original_message: str) -> Dict[str, Any]:
        context = self.get_user_context(user_id)
        interpretation_prompt = f"""
I retrieved {tool_type} data. Present this clearly and conversationally. 
Do NOT make up info, only summarize what’s there.

User Request: "{original_message}"

{tool_type.title()} Data:
{json.dumps(safe_json(tool_data), indent=2)}

User Context:
{json.dumps(context.get('basic_info', {}), indent=2)}
"""
        try:
            response = await self.llm.ainvoke(interpretation_prompt)
            interpreted_response = response.content.strip()
            self.add_to_conversation_history(user_id, "assistant", interpreted_response)
            return {
                "type": "message",
                "message": interpreted_response,
                "tool_data_type": tool_type,
                "suggested_responses": self.generate_tool_based_suggestions(tool_type, context),
                "has_tool_data": True
            }
        except Exception as e:
            return {"type":"message","message":f"I retrieved {tool_type} info but had trouble summarizing it.","error_details":str(e)}

    async def extract_location_from_context(self, context, original_message: str) -> str:
        """
        Try to extract a destination location from context or user message.
        Falls back to GeminiFlightsTool airport resolver if no common match found.
        """

        # Check if already stored in context
        if "destination" in context.get("basic_info", {}):
            return context["basic_info"]["destination"]

        # Very simple regex match
        import re
        match = re.search(r"(?:to|for|in|at)\s+([A-Za-z\s]+)", original_message, re.IGNORECASE)
        if match:
            possible_dest = match.group(1).strip()
            # Quick normalization for known cities
            common_cities = [
                "Paris","London","Tokyo","New York","Mumbai",
                "Delhi","Bangalore","Chennai","Kolkata","Dubai","Singapore","Hyderabad"
            ]
            for city in common_cities:
                if city.lower() in possible_dest.lower():
                    return city

        # 🚨 Fallback: Use Gemini airport resolver tool
        try:
            if "flights" in self.tools:
                dest_info = await self.tools["flights"].resolve_airport_code(original_message)
                if dest_info:
                    # Prefer city if available, else airport code
                    return dest_info.get("city") or dest_info.get("code")
        except Exception as e:
            print(f"⚠️ Destination resolution via Gemini failed: {e}")

        return None


    async def auto_add_events_to_calendar(self, user_id: str, events_data: list):
        """Automatically add found events to user's Google Calendar if connected"""
        try:
            import httpx
            
            # Check if user has calendar connected
            async with httpx.AsyncClient() as client:
                status_response = await client.get(
                    f"http://localhost:8000/api/calendar/status",
                    params={"user_id": user_id},
                    timeout=5.0
                )
                
                if status_response.status_code != 200:
                    logger.debug(f"Calendar status check failed for user {user_id}")
                    return
                
                status_data = status_response.json()
                if not status_data.get("connected"):
                    logger.debug(f"User {user_id} does not have calendar connected")
                    return
                
                # User has calendar connected, add events
                # Convert events to the format expected by calendar API
                calendar_events = []
                for event in events_data:
                    # Handle both Event objects and dicts
                    if hasattr(event, 'dict'):
                        event = event.dict()
                    
                    calendar_events.append({
                        "name": event.get("name"),
                        "location": event.get("location", {}).get("address", "") if isinstance(event.get("location"), dict) else str(event.get("location", "")),
                        "description": event.get("description", ""),
                        "start_time": event.get("start_time"),
                        "end_time": event.get("end_time")
                    })
                
                # Add events in batch
                add_response = await client.post(
                    f"http://localhost:8000/api/calendar/add-events-batch",
                    params={"user_id": user_id},
                    json=calendar_events,
                    timeout=10.0
                )
                
                if add_response.status_code == 200:
                    result = add_response.json()
                    logger.info(f"Added {result.get('events_added', 0)} events to calendar for user {user_id}")
                else:
                    logger.warning(f"Failed to add events to calendar: {add_response.status_code}")
                    
        except Exception as e:
            logger.warning(f"Error auto-adding events to calendar: {e}")
            # Don't raise the error - calendar integration is optional

    def generate_suggestions(self, response: str, context: Dict) -> List[str]:
        suggestions = ["That sounds good","Tell me more","What are my options?","Can you help with something else?"]
        if "weather" in response.lower(): suggestions.extend(["What should I pack?","Any outdoor activities?"])
        if "flight" in response.lower(): suggestions.extend(["Check train options","Find accommodation"])
        if "event" in response.lower(): suggestions.extend(["Find nearby restaurants","Check weather"])
        return suggestions[:6]

    def generate_contextual_suggestions(self, response: str, context: Dict) -> List[str]:
        """Generate context-aware suggestions based on the response and user context"""
        suggestions = []
        
        # Add suggestions based on mentioned topics in response
        if "weather" in response.lower():
            suggestions.extend(["What's the temperature like?", "Should I pack rain gear?"])
        if "flight" in response.lower() or "travel" in response.lower():
            suggestions.extend(["Show me flight options", "What about train alternatives?"])
        if "event" in response.lower() or "activity" in response.lower():
            suggestions.extend(["Show local events", "What's popular there?"])
        if "hotel" in response.lower() or "stay" in response.lower():
            suggestions.extend(["Find hotels nearby", "What areas are recommended?"])
            
        # Add general follow-up suggestions
        suggestions.extend([
            "Tell me more about that",
            "What else should I know?",
            "Can you help plan this?"
        ])
        
        # If we have destination in context, add specific suggestions
        if "destination" in context.get("basic_info", {}):
            dest = context["basic_info"]["destination"]
            suggestions.append(f"What's the weather like in {dest}?")
            suggestions.append(f"Find things to do in {dest}")
        
        # Return unique suggestions, limited to 6
        return list(dict.fromkeys(suggestions))[:6]

    async def _get_city_suggestions(self, region: str, context_type: str, reference_city: str = None) -> List[str]:
        """Get dynamic city suggestions using Gemini's understanding of geography and airports"""
        try:
            prompt = f"""
            Help suggest relevant cities for travel planning. Consider:
            - Region: {region}
            - Type: {context_type}
            - Reference city: {reference_city or 'Not specified'}
            
            Rules:
            1. If reference city given, suggest cities within reasonable travel distance
            2. For trains, only suggest cities with rail connectivity
            3. For flights, prefer cities with international airports
            4. Consider logical travel patterns (e.g., major business/tourist routes)
            5. Return only city names, no other text
            
            Format: Return exactly 6 relevant city names, one per line
            """
            
            response = await self.llm.ainvoke(prompt)
            suggested_cities = [city.strip() for city in response.content.strip().split('\n') if city.strip()][:6]
            
            # If we have flight tool available, validate and get airport codes
            if "flights" in self.tools and context_type != "train":
                validated_cities = []
                for city in suggested_cities:
                    try:
                        airport_info = await self.tools["flights"].resolve_airport_code(city)
                        if airport_info and airport_info.get("city"):
                            validated_cities.append(airport_info["city"])
                    except Exception as e:
                        logger.debug(f"Could not validate airport for {city}: {e}")
                        continue
                
                if validated_cities:
                    return validated_cities[:6]
            
            return suggested_cities
            
        except Exception as e:
            logger.error(f"Error generating city suggestions: {e}", exc_info=True)
            # Fallback to some safe defaults based on region
            if region.lower() == "india":
                return ["Delhi", "Mumbai", "Bangalore", "Chennai", "Kolkata", "Hyderabad"][:6]
            return ["London", "New York", "Dubai", "Singapore", "Paris", "Tokyo"][:6]

    def generate_tool_based_suggestions(self, tool_type: str, context: Dict) -> List[str]:
        suggestions_map = {
            "weather":["What should I pack?","Any weather-appropriate activities?","Find flights to this destination","Look for indoor activities"],
            "flights":["Check train options too","Find accommodation near airport","What's the weather like there?","Discover local events"],
            "trains":["Find accommodation near station","Check weather for destination","Discover local events","Compare with flight options"],
            "events":["Find nearby restaurants","Check weather forecast","Look for accommodation","Find more activities"]
        }
        return suggestions_map.get(tool_type,["That's helpful","What else can you help with?","Plan more of my trip","Find other options"])

# Global instances
connection_manager = ConnectionManager()
chat_orchestrator = GeminiChatOrchestrator()


def setup_chat_routes(app):
    """Setup chat routes in the FastAPI app"""
    
    @app.websocket("/chat/{user_id}")
    async def websocket_endpoint(websocket: WebSocket, user_id: str):
        await connection_manager.connect(websocket, user_id)
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_json()
                message = data.get("message", "")
                session_data = data.get("session_data", {})
                
                print(f"Received message from {user_id}: {message}")
                
                # Update user's basic info if provided
                if session_data:
                    context = chat_orchestrator.get_user_context(user_id)
                    context["basic_info"].update(session_data.get("basic_info", {}))
                
                # Only process message if it's not empty
                if message and message.strip():
                    # Show typing indicator
                    await connection_manager.send_message(user_id, {
                        "type": "typing",
                        "message": "🤖 Thinking..."
                    })
                    
                    # Process message through Gemini
                    response = await chat_orchestrator.process_user_message(user_id, message)
                    
                    # Send response back to client
                    await connection_manager.send_message(user_id, response)
                else:
                    # Just acknowledge the connection without generating a response
                    print(f"Session data updated for {user_id}, no message to process")
                
        except WebSocketDisconnect:
            connection_manager.disconnect(user_id)
        except Exception as e:
            print(f"WebSocket error for user {user_id}: {e}")
            await connection_manager.send_message(user_id, {
                "type": "error",
                "message": "Sorry, I encountered an issue. Please try again."
            })
    
    @app.post("/trip/initialize")
    async def initialize_trip_planning(request: Dict[str, Any]):
        """Initialize trip planning with basic information"""
        print("!")
        user_id = request.get("user_id")
        basic_info = request.get("basic_info", {})
        print(f"Initializing trip for user {user_id} with info: {basic_info}")
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        # Store basic info in context
        context = chat_orchestrator.get_user_context(user_id)
        context["basic_info"].update(basic_info)
        
        # Generate welcome message
        city = basic_info.get("city", "your destination")
        duration = basic_info.get("duration", "several")
        
        welcome_message = f"""
🌍 Fantastic! Let's plan your {duration}-day trip to {city}!

I'm your AI travel assistant powered by real-time data. I can help you with:\n
• ☀️ Weather forecasts and packing advice\n
• ✈️ Flight search and pricing\n
• 🚂 Train options (especially for India)\n
• 🎉 Local events and activities\n
• 🏨 Accommodation recommendations\n
• 🗺️ Route planning and directions\n

What would you like to know first about your trip to {city}?
        """.strip()
        
        return {
            "session_id": user_id,
            "welcome_message": welcome_message,
            "suggested_responses": [
                f"What's the weather like in {city}?",
                f"Find flights to {city}",
                f"What events are happening in {city}?",
                f"Recommend accommodations in {city}",
                "Help me plan day by day",
                "What should I know about this destination?"
            ],
            "phase": "conversation_started"
        }
    
    @app.get("/trip/context/{user_id}")
    async def get_trip_context(user_id: str):
        """Get current conversation context for a user"""
        
        context = chat_orchestrator.get_user_context(user_id)
        basic_info = context.get("basic_info", {})
        
        # Get coordinates for the destination city
        maps_tool = MapsTool()
        city = basic_info.get("city", "")
        try:
            if city:
                location = await maps_tool._geocode_location(city)
                map_center = [location.lat, location.lng]
            else:
                map_center = [0, 0]
        except Exception as e:
            logger.error(f"Error getting coordinates for {city}: {str(e)}")
            map_center = [0, 0]
            
        return {
            "user_id": user_id,
            "basic_info": basic_info,
            "conversation_length": len(context.get("conversation_history", [])),
            "available_tools": list(chat_orchestrator.tools.keys()),
            "tool_data_available": list(context.get("tool_data", {}).keys()),
            "map_center": map_center
        }
    
    @app.post("/maps/route")
    async def get_route_data(request: dict):
            """Get route data between origin and destination"""
            try:
                origin = request.get("origin", "Delhi, India")
                destination = request.get("destination", "Mumbai, India")
                transport_mode = request.get("transport_mode", "driving")

                logger.info(f"Getting route from {origin} to {destination} via {transport_mode}")

                maps_tool = MapsTool()
                route_details = await maps_tool.get_route(
                    origin=origin,
                    destination=destination,
                    transport_mode=transport_mode
                )

                # ✅ Ensure we send the geometry
                return {
                    "success": True,
                    "route_data": {
                        **route_details.dict(),
                        "route_geometry": route_details.route_geometry
                    },
                    "origin": route_details.origin.dict(),
                    "destination": route_details.destination.dict(),
                    "distance": route_details.distance,
                    "travel_time": route_details.travel_time,
                    "transportation_mode": route_details.transportation_mode,
                    "route_options": route_details.route_options,
                }

            except Exception as e:
                logger.error(f"Error getting route data: {str(e)}")
                return {
                    "success": False,
                    "error": str(e),
                    "route_data": None
                }

    
    @app.delete("/trip/session/{user_id}")
    async def clear_trip_session(user_id: str):
        """Clear conversation session for a user"""
        
        if user_id in chat_orchestrator.user_sessions:
            del chat_orchestrator.user_sessions[user_id]
        
        connection_manager.disconnect(user_id)
        
        return {"message": f"Session cleared for user {user_id}"}