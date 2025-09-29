"""
🤖 Gemini-Powered Chat API for Conversational Travel Planning
This module uses Gemini AI to intelligently handle all chat interactions and tool decisions
"""

from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, List, Any
import json
import asyncio
from datetime import datetime, timedelta
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from tools import WeatherTool, AmadeusFlightsTool, IRCTCTrainsTool, EventsTool, AccommodationTool, MapsTool
from config import settings

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
        """Get or create user context"""
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
        """Add message to conversation history"""
        context = self.get_user_context(user_id)
        context["conversation_history"].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        # Keep only last 10 messages to avoid token limit
        if len(context["conversation_history"]) > 10:
            context["conversation_history"] = context["conversation_history"][-10:]
    
    async def process_user_message(self, user_id: str, message: str) -> Dict[str, Any]:
        """Process user message through Gemini and decide on actions"""
        
        context = self.get_user_context(user_id)
        self.add_to_conversation_history(user_id, "user", message)
        
        # Create system prompt for Gemini
        system_prompt = f"""
You are an expert travel planning assistant. Your job is to help users plan their trips by:

1. **STRICTLY follow these rules:**
   - DO NOT hallucinate or make up any information
   - Only use information provided by the user or from tool calls
   - If you don't have enough information, ask the user specific questions
   - Never invent flight prices, hotel rates, or event details
   - Always be honest if you need to call tools to get real data

2. **Available Tools:**
   - weather: Get weather forecast for locations
   - flights: Search for flight options and prices
   - trains: Search for train options (mainly India)
   - events: Find events and activities in destinations
   - accommodation: Find hotels and accommodations
   - maps: Get route information and directions

3. **Decision Making:**
   - If user asks about weather, flights, trains, events, or accommodations: suggest calling the appropriate tool
   - If you have enough information to answer: provide a helpful response
   - If user needs recommendations: offer relevant suggestions based on their preferences

4. **Current User Context:**
   Basic Info: {context.get('basic_info', 'Not provided yet')}
   Preferences: {context.get('preferences', 'Not shared yet')}
   Previous Tool Data: {list(context.get('tool_data', {}).keys())}

5. **Conversation History:**
{json.dumps(context['conversation_history'][-5:], indent=2)}

**User's Current Message:** "{message}"

Based on this, decide what to do:
- If you need to call a tool, respond with: TOOL_CALL: [tool_name] with [parameters]
- If you can answer directly, provide a helpful response
- If you need more info, ask specific questions
- Always be concise and conversational

Your response:"""

        try:
            # Call Gemini for decision making
            response = await self.llm.ainvoke(system_prompt)
            gemini_response = response.content.strip()
            
            # Check if Gemini wants to call a tool
            if gemini_response.startswith("TOOL_CALL:"):
                return await self.handle_tool_call(user_id, gemini_response, message)
            else:
                # Direct response from Gemini
                self.add_to_conversation_history(user_id, "assistant", gemini_response)
                return {
                    "type": "message",
                    "message": gemini_response,
                    "suggested_responses": self.generate_suggestions(gemini_response, context),
                    "has_tool_data": bool(context.get("tool_data"))
                }
                
        except Exception as e:
            error_message = "I'm having trouble processing your request. Could you please try again?"
            return {
                "type": "error",
                "message": error_message,
                "error_details": str(e)
            }
    
    async def handle_tool_call(self, user_id: str, tool_instruction: str, original_message: str) -> Dict[str, Any]:
        """Handle tool calls based on Gemini's decision"""
        
        context = self.get_user_context(user_id)
        
        try:
            # Parse tool instruction
            tool_part = tool_instruction.replace("TOOL_CALL:", "").strip()
            
            # Send typing indicator
            typing_message = "🤖 Let me get the latest information for you..."
            
            # Determine which tool to call based on the instruction
            if "weather" in tool_part.lower():
                location = self.extract_location_from_context(context, original_message)
                if location:
                    weather_data = await self.tools["weather"].get_weather_forecast(
                        location, 
                        datetime.now(), 
                        datetime.now() + timedelta(days=7)
                    )
                    context["tool_data"]["weather"] = weather_data.dict() if hasattr(weather_data, 'dict') else weather_data
                    
                    # Ask Gemini to interpret the weather data
                    response = await self.interpret_tool_data(user_id, "weather", weather_data, original_message)
                    return response
                else:
                    return {
                        "type": "message",
                        "message": "Which city would you like me to check the weather for?",
                        "suggested_responses": ["Paris", "London", "Tokyo", "New York"]
                    }
            
            elif "flight" in tool_part.lower():
                # Extract flight search parameters
                basic_info = context.get("basic_info", {})
                origin = basic_info.get("origin", "Current Location")
                destination = self.extract_location_from_context(context, original_message)
                
                if destination:
                    flights_data = await self.tools["flights"].search_flights(
                        origin, destination, datetime.now() + timedelta(days=30)
                    )
                    context["tool_data"]["flights"] = flights_data
                    
                    response = await self.interpret_tool_data(user_id, "flights", flights_data, original_message)
                    return response
                else:
                    return {
                        "type": "message",
                        "message": "Where would you like to fly to?",
                        "suggested_responses": ["Paris, France", "London, UK", "Tokyo, Japan", "New York, USA"]
                    }
            
            elif "train" in tool_part.lower():
                # Extract train search parameters
                destination = self.extract_location_from_context(context, original_message)
                if destination:
                    trains_data = await self.tools["trains"].search_trains_between_cities(
                        "Delhi", destination, datetime.now() + timedelta(days=30)
                    )
                    context["tool_data"]["trains"] = trains_data
                    
                    response = await self.interpret_tool_data(user_id, "trains", trains_data, original_message)
                    return response
                else:
                    return {
                        "type": "message", 
                        "message": "Which city in India would you like to travel to by train?",
                        "suggested_responses": ["Mumbai", "Bangalore", "Chennai", "Kolkata"]
                    }
            
            elif "event" in tool_part.lower():
                location = self.extract_location_from_context(context, original_message)
                if location:
                    events_data = await self.tools["events"].find_events(
                        location,
                        datetime.now(),
                        datetime.now() + timedelta(days=30),
                        ["entertainment", "cultural", "sightseeing"]
                    )
                    context["tool_data"]["events"] = [event.dict() if hasattr(event, 'dict') else event for event in events_data]
                    
                    response = await self.interpret_tool_data(user_id, "events", events_data, original_message)
                    return response
                else:
                    return {
                        "type": "message",
                        "message": "Which city would you like me to find events and activities for?",
                        "suggested_responses": ["Paris", "London", "Tokyo", "New York"]
                    }
            
            else:
                # Generic tool call
                return {
                    "type": "message",
                    "message": f"{typing_message}\n\nI understand you need help with travel planning. Could you be more specific about what information you're looking for?",
                    "suggested_responses": [
                        "Check weather for my destination",
                        "Find flights",
                        "Search for trains", 
                        "Discover local events",
                        "Find accommodations"
                    ]
                }
                
        except Exception as e:
            return {
                "type": "error",
                "message": "I encountered an issue while getting that information. Please try again.",
                "error_details": str(e)
            }
    
    async def interpret_tool_data(self, user_id: str, tool_type: str, tool_data: Any, original_message: str) -> Dict[str, Any]:
        """Ask Gemini to interpret and present tool data"""
        
        context = self.get_user_context(user_id)
        
        interpretation_prompt = f"""
You are a travel assistant. I just retrieved {tool_type} data for the user. Present this information in a helpful, conversational way.

**IMPORTANT RULES:**
- Present the data clearly and concisely
- Do NOT add any information not in the tool data
- Do NOT make up prices, times, or details
- If data is limited, mention that
- Provide practical advice based on the real data
- Be conversational and helpful

**User's Original Request:** "{original_message}"

**{tool_type.title()} Data Retrieved:**
{json.dumps(tool_data, indent=2, default=str)}

**User Context:**
{json.dumps(context.get('basic_info', {}), indent=2)}

Provide a helpful response based on this real data:"""

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
            fallback_message = f"I retrieved the {tool_type} information, but had trouble presenting it. The data is available if you'd like to ask specific questions about it."
            return {
                "type": "message",
                "message": fallback_message,
                "error_details": str(e)
            }
    
    def extract_location_from_context(self, context: Dict, message: str) -> str:
        """Extract location from user context or message"""
        # Check basic info first
        basic_info = context.get("basic_info", {})
        if basic_info.get("destination"):
            return basic_info["destination"]
        if basic_info.get("city"):
            return basic_info["city"]
        
        # Try to extract from current message
        # This is a simple extraction - could be enhanced with NLP
        common_cities = [
            "Paris", "London", "Tokyo", "New York", "Mumbai", "Delhi", 
            "Bangalore", "Chennai", "Kolkata", "Dubai", "Singapore"
        ]
        
        message_lower = message.lower()
        for city in common_cities:
            if city.lower() in message_lower:
                return city
        
        return None
    
    def generate_suggestions(self, response: str, context: Dict) -> List[str]:
        """Generate contextual suggestion responses"""
        
        basic_suggestions = [
            "That sounds good",
            "Tell me more",
            "What are my options?",
            "Can you help with something else?"
        ]
        
        # Add context-specific suggestions
        if "weather" in response.lower():
            basic_suggestions.extend(["What should I pack?", "Any outdoor activities?"])
        
        if "flight" in response.lower():
            basic_suggestions.extend(["Check train options too", "Find accommodation"])
        
        if "event" in response.lower():
            basic_suggestions.extend(["Find nearby restaurants", "Check weather"])
        
        return basic_suggestions[:6]  # Limit to 6 suggestions
    
    def generate_tool_based_suggestions(self, tool_type: str, context: Dict) -> List[str]:
        """Generate suggestions based on tool type"""
        
        suggestions_map = {
            "weather": [
                "What should I pack?",
                "Any weather-appropriate activities?",
                "Find flights to this destination",
                "Look for indoor activities"
            ],
            "flights": [
                "Check train options too",
                "Find accommodation near airport",
                "What's the weather like there?",
                "Discover local events"
            ],
            "trains": [
                "Find accommodation near station",
                "Check weather for destination",
                "Discover local events",
                "Compare with flight options"
            ],
            "events": [
                "Find nearby restaurants",
                "Check weather forecast",
                "Look for accommodation",
                "Find more activities"
            ]
        }
        
        return suggestions_map.get(tool_type, [
            "That's helpful",
            "What else can you help with?",
            "Plan more of my trip",
            "Find other options"
        ])

# Initialize global instances
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