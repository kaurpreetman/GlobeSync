"""
🚀 Chat API Integration for Conversational Travel Planning
This module adds WebSocket and REST endpoints for the chat interface
"""

from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, List, Any
import json
import asyncio
from datetime import datetime

from conversation_manager import ConversationManager
from orchestrator import TravelOrchestrator
from tools import WeatherTool, AmadeusFlightsTool, IRCTCTrainsTool, EventsTool, AccommodationTool

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

class ChatOrchestrator:
    """Orchestrates chat conversations with agent integration"""
    
    def __init__(self):
        self.conversation_manager = ConversationManager()
        self.travel_orchestrator = TravelOrchestrator()
        self.tools = {
            "weather": WeatherTool(),
            "flights": AmadeusFlightsTool(),
            "trains": IRCTCTrainsTool(),
            "events": EventsTool(),
            "accommodation": AccommodationTool()
        }
        
    async def should_call_agents(self, context: Dict, message: str) -> bool:
        """Determine if we should call travel agents based on conversation"""
        
        # Check if we have enough information to make agent calls
        basic_info = context.get("basic_info", {})
        preferences = context.get("preferences", {})
        
        # Need at least destination and some preferences
        if not basic_info.get("city") or not preferences.get("activity_types"):
            return False
        
        # Check if we haven't called agents recently
        last_agent_call = context.get("last_agent_call")
        if last_agent_call:
            # Don't call agents too frequently (wait at least 2 messages)
            messages_since = len(context.get("conversation_history", [])) - last_agent_call
            if messages_since < 3:
                return False
        
        # Call agents if user is asking for specific information
        trigger_words = ["recommend", "suggest", "find", "show me", "what about", "options", "available"]
        return any(word in message.lower() for word in trigger_words)
    
    async def call_relevant_agents(self, context: Dict) -> Dict[str, Any]:
        """Call relevant travel agents based on context"""
        
        basic_info = context.get("basic_info", {})
        preferences = context.get("preferences", {})
        
        agent_data = {}
        
        try:
            # Always get weather data
            if basic_info.get("city"):
                print(f"🌤️ Getting weather for {basic_info['city']}")
                
                # Calculate approximate dates
                start_date = datetime.now().replace(day=1)  # First of current month
                if basic_info.get("month"):
                    # Parse month (simplified)
                    month_name = basic_info["month"].split()[0].lower()
                    month_mapping = {
                        "january": 1, "february": 2, "march": 3, "april": 4,
                        "may": 5, "june": 6, "july": 7, "august": 8,
                        "september": 9, "october": 10, "november": 11, "december": 12
                    }
                    if month_name in month_mapping:
                        start_date = start_date.replace(month=month_mapping[month_name])
                
                end_date = start_date.replace(day=min(28, start_date.day + basic_info.get("duration", 7)))
                
                weather_data = await self.tools["weather"].get_weather_forecast(
                    basic_info["city"], start_date, end_date
                )
                agent_data["weather"] = {
                    "data": weather_data.dict() if hasattr(weather_data, 'dict') else weather_data,
                    "summary": f"Weather in {basic_info['city']}: {weather_data.conditions} with temperatures {weather_data.temperature_range['min']}-{weather_data.temperature_range['max']}°C"
                }
        
        except Exception as e:
            print(f"Weather agent error: {e}")
            agent_data["weather"] = {"error": str(e)}
        
        # Get events if user is interested in activities
        try:
            if preferences.get("activity_types") and basic_info.get("city"):
                print(f"🎉 Finding events in {basic_info['city']}")
                
                events_data = await self.tools["events"].find_events(
                    basic_info["city"], 
                    start_date, 
                    end_date,
                    preferences["activity_types"]
                )
                
                agent_data["events"] = {
                    "data": [event.dict() if hasattr(event, 'dict') else event for event in events_data],
                    "summary": f"Found {len(events_data)} events matching your interests"
                }
        
        except Exception as e:
            print(f"Events agent error: {e}")
            agent_data["events"] = {"error": str(e)}
        
        # Get transportation options if needed
        try:
            if not preferences.get("transportation_decided") and basic_info.get("city"):
                print(f"✈️ Checking transportation to {basic_info['city']}")
                
                # This is simplified - in reality you'd get user's location
                origin = "Current Location"
                
                # Get flight options
                flights_data = await self.tools["flights"].search_flights(
                    origin, basic_info["city"], start_date
                )
                
                agent_data["flights"] = {
                    "data": flights_data[:3] if isinstance(flights_data, list) else flights_data,
                    "summary": f"Found flight options starting from ${min(f.get('price', 999) for f in flights_data) if isinstance(flights_data, list) and flights_data else 'N/A'}"
                }
        
        except Exception as e:
            print(f"Flights agent error: {e}")
            agent_data["flights"] = {"error": str(e)}
        
        return agent_data

# Initialize global instances
connection_manager = ConnectionManager()
chat_orchestrator = ChatOrchestrator()

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
                
                # Get current context
                context = chat_orchestrator.conversation_manager.context_tracker.get_context(user_id)
                
                # Determine if we should call agents
                should_call = await chat_orchestrator.should_call_agents(context, message)
                
                agent_data = {}
                if should_call:
                    # Show typing indicator
                    await connection_manager.send_message(user_id, {
                        "type": "typing",
                        "message": "🤖 Let me check the latest information for you..."
                    })
                    
                    # Call relevant agents
                    agent_data = await chat_orchestrator.call_relevant_agents(context)
                    
                    # Update context with agent data
                    chat_orchestrator.conversation_manager.context_tracker.update_context(user_id, {
                        "agent_data": agent_data,
                        "last_agent_call": len(context.get("conversation_history", []))
                    })
                
                # Process message through conversation manager
                response = await chat_orchestrator.conversation_manager.process_message(
                    user_id, message, session_data
                )
                
                # Add agent insights to response if available
                if agent_data:
                    response["agent_insights"] = chat_orchestrator.format_agent_insights(agent_data)
                    response["has_new_data"] = True
                
                # Send response back to client
                response["type"] = "message"
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
        chat_orchestrator.conversation_manager.context_tracker.update_context(user_id, {
            "basic_info": basic_info,
            "current_phase": "preference_gathering"
        })
        
        # Generate initial welcome message
        city = basic_info.get("city", "your destination")
        duration = basic_info.get("duration", "several")
        travelers = basic_info.get("travelers", "")
        
        welcome_message = f"""
🌍 Fantastic! Let's plan your {duration}-day trip to {city}{f' for {travelers} people' if travelers else ''}!

I'm your personal travel assistant, and I'll help you create the perfect itinerary. I can check real-time weather, find flights and trains, discover local events, and even sync everything to your calendar.

To get started, what type of experiences are you most excited about? I can help with:
• 🎨 Art & Cultural attractions  
• 🍷 Food & Culinary experiences
• 🏰 Historical sites & Architecture
• 🌙 Nightlife & Entertainment
• 🛍️ Shopping & Local markets
• 🏃‍♂️ Adventure & Outdoor activities

What sounds most appealing to you?
        """.strip()
        
        return {
            "session_id": user_id,
            "welcome_message": welcome_message,
            "suggested_responses": [
                "🎨 Art & Culture",
                "🍷 Food & Wine", 
                "🏰 Historical Sites",
                "🌙 Entertainment",
                "🛍️ Shopping",
                "🏃‍♂️ Adventure",
                "A mix of everything!"
            ],
            "phase": "preference_gathering"
        }
    
    @app.post("/trip/context/{user_id}")
    async def get_trip_context(user_id: str):
        """Get current conversation context for a user"""
        
        context = chat_orchestrator.conversation_manager.context_tracker.get_context(user_id)
        
        return {
            "user_id": user_id,
            "current_phase": context.get("current_phase", "initial"),
            "basic_info": context.get("basic_info", {}),
            "preferences": context.get("preferences", {}),
            "conversation_length": len(context.get("conversation_history", [])),
            "has_recommendations": bool(context.get("recommendations", {})),
            "agent_data_available": bool(context.get("agent_data", {}))
        }
    
    @app.post("/trip/finalize/{user_id}")
    async def finalize_itinerary(user_id: str):
        """Generate final itinerary from conversation context"""
        
        context = chat_orchestrator.conversation_manager.context_tracker.get_context(user_id)
        
        if not context.get("basic_info") or not context.get("preferences"):
            raise HTTPException(
                status_code=400, 
                detail="Insufficient information to create itinerary. Please continue the conversation."
            )
        
        try:
            # Create trip request from context
            basic_info = context["basic_info"]
            preferences = context["preferences"]
            
            # This would integrate with your existing TravelOrchestrator
            trip_request = {
                "destination": basic_info.get("city"),
                "start_date": basic_info.get("start_date", datetime.now().isoformat()),
                "end_date": basic_info.get("end_date", (datetime.now() + timedelta(days=basic_info.get("duration", 7))).isoformat()),
                "budget": basic_info.get("budget", 1000),
                "preferences": preferences
            }
            
            # Generate final itinerary
            final_itinerary = await chat_orchestrator.travel_orchestrator.plan_trip(trip_request)
            
            # Mark as finalized in context
            chat_orchestrator.conversation_manager.context_tracker.update_context(user_id, {
                "itinerary_finalized": True,
                "final_itinerary": final_itinerary
            })
            
            return {
                "itinerary": final_itinerary,
                "calendar_sync_available": True,
                "total_estimated_cost": final_itinerary.get("estimated_cost", "TBD"),
                "booking_links": final_itinerary.get("booking_info", {}),
                "message": "🎉 Your personalized itinerary is ready! Would you like me to sync it to your Google Calendar?"
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error creating itinerary: {str(e)}")
    
    @app.delete("/trip/session/{user_id}")
    async def clear_trip_session(user_id: str):
        """Clear conversation session for a user"""
        
        if user_id in chat_orchestrator.conversation_manager.context_tracker.sessions:
            del chat_orchestrator.conversation_manager.context_tracker.sessions[user_id]
        
        connection_manager.disconnect(user_id)
        
        return {"message": f"Session cleared for user {user_id}"}

# Add method to ChatOrchestrator class
def format_agent_insights(self, agent_data: Dict[str, Any]) -> str:
    """Format agent data into readable insights"""
    
    insights = []
    
    if "weather" in agent_data and "summary" in agent_data["weather"]:
        insights.append(f"🌤️ {agent_data['weather']['summary']}")
    
    if "events" in agent_data and "summary" in agent_data["events"]:
        insights.append(f"🎉 {agent_data['events']['summary']}")
    
    if "flights" in agent_data and "summary" in agent_data["flights"]:
        insights.append(f"✈️ {agent_data['flights']['summary']}")
    
    return " | ".join(insights) if insights else ""

# Add this method to ChatOrchestrator class
ChatOrchestrator.format_agent_insights = format_agent_insights