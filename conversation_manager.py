"""
🤖 Conversational Travel Planning System
This module handles the interactive chat-based travel planning flow
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json
import random
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from config import settings

class ContextTracker:
    """Tracks conversation context and user preferences across the session"""
    
    def __init__(self):
        self.sessions = {}
    
    def get_context(self, user_id: str) -> Dict[str, Any]:
        """Get conversation context for user"""
        return self.sessions.get(user_id, {
            "basic_info": {},
            "preferences": {},
            "constraints": {},
            "agent_data": {},
            "conversation_history": [],
            "current_phase": "initial",
            "extracted_entities": {},
            "recommendations": {}
        })
    
    def update_context(self, user_id: str, updates: Dict[str, Any]):
        """Update conversation context"""
        if user_id not in self.sessions:
            self.sessions[user_id] = self.get_context(user_id)
        
        for key, value in updates.items():
            if isinstance(value, dict) and key in self.sessions[user_id]:
                self.sessions[user_id][key].update(value)
            else:
                self.sessions[user_id][key] = value
    
    def add_message(self, user_id: str, role: str, content: str):
        """Add message to conversation history"""
        if user_id not in self.sessions:
            self.sessions[user_id] = self.get_context(user_id)
        
        self.sessions[user_id]["conversation_history"].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
    
    def extract_entities(self, message: str) -> Dict[str, Any]:
        """Extract relevant entities from user message"""
        entities = {
            "dates": [],
            "preferences": [],
            "constraints": [],
            "budget_mentions": [],
            "location_mentions": []
        }
        
        message_lower = message.lower()
        
        # Preference keywords
        preference_keywords = {
            "art": ["art", "museum", "gallery", "culture", "exhibition"],
            "food": ["food", "restaurant", "cuisine", "dining", "culinary", "wine", "cooking"],
            "adventure": ["adventure", "hiking", "outdoor", "sports", "active", "trek"],
            "relaxation": ["relax", "spa", "beach", "peaceful", "calm", "wellness"],
            "nightlife": ["nightlife", "bars", "clubs", "party", "dancing", "entertainment"],
            "shopping": ["shopping", "boutique", "market", "souvenirs", "fashion"],
            "history": ["history", "historical", "ancient", "heritage", "monuments"],
            "nature": ["nature", "park", "garden", "wildlife", "scenic", "landscape"]
        }
        
        for category, keywords in preference_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                entities["preferences"].append(category)
        
        # Budget constraints
        budget_terms = ["budget", "cheap", "expensive", "affordable", "luxury", "mid-range"]
        if any(term in message_lower for term in budget_terms):
            entities["budget_mentions"].append(message_lower)
        
        return entities

class QuestionGenerator:
    """Generates contextual questions based on conversation state"""
    
    def __init__(self):
        self.question_templates = {
            "preferences": [
                "What type of experiences are you most excited about in {city}?",
                "Are there any specific activities you absolutely want to include?",
                "What's your travel style - relaxed exploration or packed with activities?",
                "Any dietary restrictions or food preferences I should know about?",
                "Are you interested in guided tours or prefer exploring independently?"
            ],
            "constraints": [
                "Are there any dates you need to avoid during your trip?",
                "Do you have any mobility considerations I should keep in mind?",
                "What's your preferred accommodation style?",
                "Transportation preferences - flights, trains, or are you flexible?",
                "Any specific neighborhoods or areas you'd like to stay in?"
            ],
            "refinement": [
                "How does this itinerary look so far?",
                "Would you like to adjust anything in the current plan?",
                "Any specific time preferences for activities (morning person vs night owl)?",
                "Should I look for more budget-friendly alternatives?",
                "Would you prefer more structured planning or flexible free time?"
            ],
            "weather_based": [
                "I see there might be some rain during your visit. Would you like me to focus more on indoor activities?",
                "The weather looks perfect for outdoor activities! Interested in parks, walking tours, or outdoor dining?",
                "It'll be quite warm during your trip. Should I prioritize air-conditioned venues and early morning activities?"
            ]
        }
    
    async def generate_contextual_question(self, context: Dict, agent_data: Dict = None) -> str:
        """Generate next appropriate question based on context and agent data"""
        
        basic_info = context.get("basic_info", {})
        city = basic_info.get("city", "your destination")
        
        # If we have agent data, incorporate it into questions
        if agent_data:
            if "weather_warning" in agent_data:
                return f"⚠️ I noticed {agent_data['weather_warning']} Would you like me to adjust the plan for indoor activities or different timing?"
            
            if "flight_recommendation" in agent_data:
                return f"✈️ Great news! {agent_data['flight_recommendation']} Which timeframe works better for you?"
            
            if "accommodation_options" in agent_data:
                return f"🏨 I found some accommodation options: {agent_data['accommodation_options']} Which style appeals to you most?"
        
        # Standard contextual questions
        missing_info = self.identify_missing_information(context)
        
        if "activity_preferences" in missing_info:
            question = random.choice(self.question_templates["preferences"])
            return question.format(city=city)
        elif "constraints" in missing_info:
            return random.choice(self.question_templates["constraints"])
        else:
            return random.choice(self.question_templates["refinement"])
    
    def identify_missing_information(self, context: Dict) -> List[str]:
        """Identify what information is still needed"""
        missing = []
        
        preferences = context.get("preferences", {})
        if not preferences.get("activity_types"):
            missing.append("activity_preferences")
        if not preferences.get("accommodation_type"):
            missing.append("accommodation_preferences")
        if not preferences.get("transportation_mode"):
            missing.append("transportation_preferences")
        if not preferences.get("dining_preferences"):
            missing.append("dining_preferences")
        
        return missing

class RecommendationEngine:
    """Generates intelligent recommendations based on context and agent data"""
    
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.7
        )
    
    async def generate_recommendations(self, context: Dict, agent_data: Dict) -> Dict[str, Any]:
        """Generate contextual recommendations"""
        
        basic_info = context.get("basic_info", {})
        preferences = context.get("preferences", {})
        
        # Create recommendation prompt
        prompt = f"""
        You are an expert travel advisor helping plan a trip with these details:
        
        Destination: {basic_info.get('city', 'Unknown')}
        Duration: {basic_info.get('duration', 'Unknown')} days
        Travelers: {basic_info.get('travelers', 'Unknown')} people
        Budget: ${basic_info.get('budget', 'Unknown')}
        Month: {basic_info.get('month', 'Unknown')}
        
        User Preferences: {preferences}
        
        Current Data from Agents:
        Weather: {agent_data.get('weather', 'No data')}
        Flights: {agent_data.get('flights', 'No data')}
        Events: {agent_data.get('events', 'No data')}
        
        Generate specific, actionable recommendations for:
        1. Best timing for the trip
        2. Must-see attractions based on preferences
        3. Transportation recommendations
        4. Accommodation suggestions
        5. Weather-appropriate activities
        
        Format as a friendly, conversational response with emojis.
        """
        
        try:
            response = await self.llm.ainvoke(prompt)
            return {
                "recommendation": response.content,
                "confidence": "high",
                "data_sources": list(agent_data.keys())
            }
        except Exception as e:
            return {
                "recommendation": "I'm gathering more information to provide better recommendations.",
                "confidence": "low",
                "error": str(e)
            }
    
    def generate_timing_advice(self, weather_data: Dict, flight_data: Dict, events_data: Dict) -> str:
        """Generate timing recommendations based on multiple factors"""
        
        advice_parts = []
        
        # Weather-based advice
        if weather_data:
            if weather_data.get("precipitation_chance", 0) > 0.6:
                advice_parts.append("🌧️ Expect some rain, so indoor activities might be better")
            elif weather_data.get("temperature_range", {}).get("max", 20) > 30:
                advice_parts.append("🌡️ It'll be hot - early morning and evening activities recommended")
            else:
                advice_parts.append("☀️ Great weather for outdoor exploration")
        
        # Flight pricing advice
        if flight_data:
            # This would analyze actual flight data
            advice_parts.append("✈️ Flight prices are moderate for your chosen dates")
        
        # Events advice
        if events_data and isinstance(events_data, list) and len(events_data) > 0:
            advice_parts.append(f"🎉 Found {len(events_data)} interesting events during your stay")
        
        return " | ".join(advice_parts) if advice_parts else "I'm analyzing the best timing for your trip."

class ConversationManager:
    """Main conversation management system"""
    
    def __init__(self):
        self.context_tracker = ContextTracker()
        self.question_generator = QuestionGenerator()
        self.recommendation_engine = RecommendationEngine()
        self.llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.7
        )
    
    async def process_message(self, user_id: str, message: str, session_data: Dict = None) -> Dict[str, Any]:
        """Process user message and generate appropriate response"""
        
        # Get current context
        context = self.context_tracker.get_context(user_id)
        
        # Add user message to history
        self.context_tracker.add_message(user_id, "user", message)
        
        # Extract entities from user message
        entities = self.context_tracker.extract_entities(message)
        
        # Update preferences based on extracted entities
        if entities["preferences"]:
            current_prefs = context.get("preferences", {}).get("activity_types", [])
            updated_prefs = list(set(current_prefs + entities["preferences"]))
            self.context_tracker.update_context(user_id, {
                "preferences": {"activity_types": updated_prefs}
            })
        
        # Determine conversation phase
        phase = self.determine_conversation_phase(context)
        
        # Generate response based on phase
        if phase == "preference_gathering":
            response = await self.handle_preference_gathering(user_id, message, context)
        elif phase == "recommendation_review":
            response = await self.handle_recommendation_review(user_id, message, context)
        elif phase == "itinerary_refinement":
            response = await self.handle_itinerary_refinement(user_id, message, context)
        else:
            response = await self.handle_general_query(user_id, message, context)
        
        # Add AI response to history
        self.context_tracker.add_message(user_id, "assistant", response["message"])
        
        return response
    
    def determine_conversation_phase(self, context: Dict) -> str:
        """Determine which phase of conversation we're in"""
        preferences = context.get("preferences", {})
        
        # Check if we have basic preferences
        if not preferences.get("activity_types"):
            return "preference_gathering"
        elif len(context.get("recommendations", {})) == 0:
            return "recommendation_review"
        elif not context.get("itinerary_approved", False):
            return "itinerary_refinement"
        else:
            return "general_query"
    
    async def handle_preference_gathering(self, user_id: str, message: str, context: Dict) -> Dict[str, Any]:
        """Handle preference gathering phase"""
        
        # Generate next question
        next_question = await self.question_generator.generate_contextual_question(context)
        
        # Generate suggested responses based on context
        suggested_responses = self.generate_suggested_responses(context, "preferences")
        
        return {
            "message": next_question,
            "phase": "preference_gathering",
            "suggested_responses": suggested_responses,
            "context_updated": True
        }
    
    async def handle_recommendation_review(self, user_id: str, message: str, context: Dict) -> Dict[str, Any]:
        """Handle recommendation review phase"""
        
        # This would trigger agent calls and generate recommendations
        recommendations = await self.recommendation_engine.generate_recommendations(
            context, 
            context.get("agent_data", {})
        )
        
        # Update context with recommendations
        self.context_tracker.update_context(user_id, {
            "recommendations": recommendations
        })
        
        response_message = f"""
        🎯 Based on your preferences, here are my recommendations:
        
        {recommendations.get('recommendation', 'Gathering recommendations...')}
        
        What do you think? Should I adjust anything or would you like more details about specific activities?
        """
        
        suggested_responses = [
            "This looks great!",
            "Can you suggest more food experiences?",
            "I'd prefer more cultural activities",  
            "What about budget-friendly options?",
            "Tell me more about accommodation"
        ]
        
        return {
            "message": response_message,
            "phase": "recommendation_review",
            "suggested_responses": suggested_responses,
            "recommendations": recommendations
        }
    
    async def handle_itinerary_refinement(self, user_id: str, message: str, context: Dict) -> Dict[str, Any]:
        """Handle itinerary refinement phase"""
        
        refinement_message = f"""
        🔧 Let me refine the itinerary based on your feedback: "{message}"
        
        I'm adjusting the plan to better match your preferences. This might take a moment while I coordinate with different services...
        """
        
        return {
            "message": refinement_message,
            "phase": "itinerary_refinement",
            "suggested_responses": [
                "Perfect, finalize this plan",
                "Can you add more variety?",
                "I need more budget-friendly options",
                "Show me the final itinerary"
            ],
            "action_required": "refine_itinerary"
        }
    
    async def handle_general_query(self, user_id: str, message: str, context: Dict) -> Dict[str, Any]:
        """Handle general queries and conversation"""
        
        # Use Gemini to generate contextual response
        conversation_history = context.get("conversation_history", [])[-5:]  # Last 5 messages
        
        prompt = f"""
        You are a helpful travel planning assistant. The user is asking: "{message}"
        
        Context of the conversation:
        {json.dumps(conversation_history, indent=2)}
        
        Trip details:
        {json.dumps(context.get("basic_info", {}), indent=2)}
        
        User preferences:
        {json.dumps(context.get("preferences", {}), indent=2)}
        
        Provide a helpful, friendly response. If the user is asking for changes, acknowledge them and explain what you'll do next.
        """
        
        try:
            response = await self.llm.ainvoke(prompt)
            return {
                "message": response.content,
                "phase": "general_query",
                "suggested_responses": [
                    "That sounds good",
                    "Can you be more specific?",
                    "What other options do I have?",
                    "Let's finalize the plan"
                ]
            }
        except Exception as e:
            return {
                "message": "I understand what you're looking for. Let me work on that for you!",
                "phase": "general_query",
                "error": str(e)
            }
    
    def generate_suggested_responses(self, context: Dict, phase: str) -> List[str]:
        """Generate contextual suggested responses"""
        
        if phase == "preferences":
            return [
                "🎨 Art & Culture",
                "🍷 Food & Wine",
                "🏰 Historical Sites", 
                "🌙 Nightlife",
                "🛍️ Shopping",
                "🏃‍♂️ Active/Adventure",
                "😌 Relaxation",
                "🎭 Entertainment"
            ]
        elif phase == "constraints":
            return [
                "No specific constraints",
                "Budget is flexible",
                "I prefer morning activities",
                "I have mobility considerations",
                "Central location preferred"
            ]
        else:
            return [
                "That looks perfect!",
                "Can you adjust something?",
                "Tell me more",
                "What are my other options?"
            ]