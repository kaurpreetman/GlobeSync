from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, List, Any
import json
import asyncio
from datetime import datetime, timedelta
from langchain_google_genai import ChatGoogleGenerativeAI
import dateparser 
from tools import WeatherTool, AmadeusFlightsTool, IRCTCTrainsTool, EventsTool, AccommodationTool, MapsTool
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
            "maps": MapsTool()
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

Tools available:
weather, flights, trains, events, accommodation, maps.

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
                
        except Exception as e:
            return {
                "type": "error",
                "message": "I'm having trouble processing your request. Please try again.",
                "error_details": str(e)
            }
    
    async def handle_tool_call(self, user_id: str, tool_instruction: str, original_message: str) -> Dict[str, Any]:
        context = self.get_user_context(user_id)
        tool_part = tool_instruction.replace("TOOL_CALL:", "").strip().lower()

        try:
            if "weather" in tool_part:
                location = await self.extract_location_from_context(context, original_message)
                if not location:
                    return {
                        "type": "message",
                        "message": "Which city should I check the weather for?",
                        "suggested_responses": ["Paris", "London", "Tokyo", "Mumbai"]
                    }

                # Parse requested date from user message
                parsed_date = dateparser.parse(original_message, settings={'PREFER_DATES_FROM': 'future'})
                if parsed_date is None:
                    # fallback: current + 7 days
                    start_date, end_date = datetime.now(), datetime.now() + timedelta(days=7)
                else:
                    # forecast only for that date
                    start_date, end_date = parsed_date, parsed_date

                weather_data = await self.tools["weather"].get_weather_forecast(location, start_date, end_date)
                context["tool_data"]["weather"] = safe_json(weather_data)
                return await self.interpret_tool_data(user_id, "weather", weather_data, original_message)


          # install: pip install dateparser

            elif "flight" in tool_part:
                origin = context.get("basic_info", {}).get("origin", "Delhi")
                destination = self.extract_location_from_context(context, original_message)

                if not destination:
                    return {
                        "type":"message",
                        "message":"Where would you like to fly to?",
                        "suggested_responses":["Paris","London","Tokyo","New York"]
                    }

                # Parse dates from user message if available
                dep_date = dateparser.parse(original_message, settings={'PREFER_DATES_FROM': 'future'})
                ret_date = None
                if "return" in context.get("basic_info", {}):
                    ret_date = dateparser.parse(context["basic_info"]["return"])

                if not dep_date:
                    # fallback: 30 days later
                    dep_date = datetime.now() + timedelta(days=30)

                flights_data = await self.tools["flights"].search_flights(
                    origin,
                    destination,
                    dep_date.strftime("%Y-%m-%d"),
                    return_date=ret_date.strftime("%Y-%m-%d") if ret_date else None
                )

                context["tool_data"]["flights"] = safe_json(flights_data)
                return await self.interpret_tool_data(user_id,"flights",flights_data,original_message)


            elif "train" in tool_part:
                destination = await self.extract_location_from_context(context, original_message)
                if not destination:
                    return {"type":"message","message":"Which city in India would you like to travel to by train?","suggested_responses":["Mumbai","Bangalore","Chennai","Kolkata"]}
                trains_data = await self.tools["trains"].search_trains_between_cities("Delhi",destination,datetime.now()+timedelta(days=30))
                context["tool_data"]["trains"] = safe_json(trains_data)
                return await self.interpret_tool_data(user_id,"trains",trains_data,original_message)

            elif "event" in tool_part:
                location = self.extract_location_from_context(context, original_message)
                if not location:
                    return {"type":"message","message":"Which city should I look for events in?","suggested_responses":["Paris","London","Tokyo","New York"]}
                events_data = await self.tools["events"].find_events(location,datetime.now(),datetime.now()+timedelta(days=30),["entertainment","cultural","sightseeing"])
                context["tool_data"]["events"] = safe_json(events_data)
                return await self.interpret_tool_data(user_id,"events",events_data,original_message)

            else:
                return {
                    "type": "message",
                    "message": "I understand you need help with travel planning. Could you clarify if you're asking about weather, flights, trains, events, or hotels?",
                    "suggested_responses": ["Weather forecast","Find flights","Search for trains","Discover local events","Find accommodations"]
                }
        except Exception as e:
            return {"type":"error","message":"I encountered an issue while getting that information.","error_details":str(e)}

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


    def generate_suggestions(self, response: str, context: Dict) -> List[str]:
        suggestions = ["That sounds good","Tell me more","What are my options?","Can you help with something else?"]
        if "weather" in response.lower(): suggestions.extend(["What should I pack?","Any outdoor activities?"])
        if "flight" in response.lower(): suggestions.extend(["Check train options","Find accommodation"])
        if "event" in response.lower(): suggestions.extend(["Find nearby restaurants","Check weather"])
        return suggestions[:6]

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
                
                # Show typing indicator
                await connection_manager.send_message(user_id, {
                    "type": "typing",
                    "message": "🤖 Thinking..."
                })
                
                # Process message through Gemini
                response = await chat_orchestrator.process_user_message(user_id, message)
                
                # Send response back to client
                await connection_manager.send_message(user_id, response)
                
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
        
        user_id = request.get("user_id")
        basic_info = request.get("basic_info", {})
        
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

I'm your AI travel assistant powered by real-time data. I can help you with:
• ☀️ Weather forecasts and packing advice
• ✈️ Flight search and pricing
• 🚂 Train options (especially for India)
• 🎉 Local events and activities
• 🏨 Accommodation recommendations
• 🗺️ Route planning and directions

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
        
        return {
            "user_id": user_id,
            "basic_info": context.get("basic_info", {}),
            "conversation_length": len(context.get("conversation_history", [])),
            "available_tools": list(chat_orchestrator.tools.keys()),
            "tool_data_available": list(context.get("tool_data", {}).keys())
        }
    
    @app.delete("/trip/session/{user_id}")
    async def clear_trip_session(user_id: str):
        """Clear conversation session for a user"""
        
        if user_id in chat_orchestrator.user_sessions:
            del chat_orchestrator.user_sessions[user_id]
        
        connection_manager.disconnect(user_id)
        
        return {"message": f"Session cleared for user {user_id}"}