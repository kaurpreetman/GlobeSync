import pytest
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal

from models import TripRequest, UserPreferences
from agents import weather_agent, maps_agent, events_agent, budget_agent, itinerary_agent
from orchestrator import travel_orchestrator
from tools import weather_tool, maps_tool, events_tool, budget_tool

@pytest.fixture
def sample_trip_request():
    """Sample trip request for testing"""
    return TripRequest(
        user_id="test_user",
        destination="Paris, France",
        start_date=datetime.now() + timedelta(days=30),
        end_date=datetime.now() + timedelta(days=35),
        budget=Decimal("2500.00"),
        preferences={
            "accommodation_type": "hotel",
            "transport_options": ["flight"],
            "activity_types": ["sightseeing", "entertainment"]
        }
    )

@pytest.fixture
def sample_state():
    """Sample state for agent testing"""
    return {
        "trip_request": TripRequest(
            user_id="test_user",
            destination="Paris, France",
            start_date=datetime.now() + timedelta(days=30),
            end_date=datetime.now() + timedelta(days=35),
            budget=Decimal("2500.00")
        ),
        "weather_data": {
            "conditions": "sunny",
            "temperature_range": {"min": 18, "max": 25}
        },
        "events": [
            {"name": "Louvre Tour", "price": 25.0, "category": "sightseeing"}
        ]
    }

class TestTools:
    """Test suite for external tools"""
    
    @pytest.mark.asyncio
    async def test_weather_tool(self):
        """Test weather tool functionality"""
        start_date = datetime.now() + timedelta(days=30)
        end_date = start_date + timedelta(days=5)
        
        weather_data = await weather_tool.get_weather_forecast(
            "Paris, France", start_date, end_date
        )
        
        assert weather_data.location == "Paris, France"
        assert weather_data.conditions is not None
        assert weather_data.temperature_range is not None
        assert isinstance(weather_data.precipitation_chance, float)
    
    @pytest.mark.asyncio
    async def test_maps_tool(self):
        """Test maps tool functionality"""
        route_details = await maps_tool.get_route(
            "New York, USA", "Boston, USA", "driving"
        )
        
        assert route_details.origin is not None
        assert route_details.destination is not None
        assert route_details.distance > 0
        assert route_details.travel_time is not None
    
    @pytest.mark.asyncio
    async def test_events_tool(self):
        """Test events tool functionality"""
        start_date = datetime.now() + timedelta(days=30)
        end_date = start_date + timedelta(days=5)
        
        events = await events_tool.find_events(
            "Paris, France", start_date, end_date, ["entertainment"]
        )
        
        assert isinstance(events, list)
        if events:
            assert events[0].name is not None
            assert events[0].location is not None
    
    @pytest.mark.asyncio
    async def test_budget_tool(self):
        """Test budget tool functionality"""
        budget_options = await budget_tool.optimize_budget(
            total_budget=2500.0,
            destination="Paris, France",
            days=5,
            preferences={}
        )
        
        assert budget_options.total_cost == 2500.0
        assert len(budget_options.transport_options) > 0
        assert len(budget_options.accommodation_options) > 0

class TestAgents:
    """Test suite for individual agents"""
    
    @pytest.mark.asyncio
    async def test_weather_agent(self, sample_state):
        """Test weather agent processing"""
        response = await weather_agent.process(sample_state)
        
        assert response.agent_name == "weather_agent"
        assert response.status in ["completed", "error"]
        assert response.timestamp is not None
        
        if response.status == "completed":
            assert "weather_data" in response.data
            assert "recommendations" in response.data
    
    @pytest.mark.asyncio
    async def test_maps_agent(self, sample_state):
        """Test maps agent processing"""
        response = await maps_agent.process(sample_state)
        
        assert response.agent_name == "maps_agent"
        assert response.status in ["completed", "error"]
        assert response.timestamp is not None
        
        if response.status == "completed":
            assert "route_details" in response.data
    
    @pytest.mark.asyncio
    async def test_events_agent(self, sample_state):
        """Test events agent processing"""
        response = await events_agent.process(sample_state)
        
        assert response.agent_name == "events_agent"
        assert response.status in ["completed", "error"]
        assert response.timestamp is not None
        
        if response.status == "completed":
            assert "events" in response.data
    
    @pytest.mark.asyncio
    async def test_budget_agent(self, sample_state):
        """Test budget agent processing"""
        response = await budget_agent.process(sample_state)
        
        assert response.agent_name == "budget_agent"
        assert response.status in ["completed", "error"]
        assert response.timestamp is not None
        
        if response.status == "completed":
            assert "budget_breakdown" in response.data
    
    @pytest.mark.asyncio
    async def test_itinerary_agent(self, sample_state):
        """Test itinerary agent processing"""
        response = await itinerary_agent.process(sample_state)
        
        assert response.agent_name == "itinerary_agent"
        assert response.status in ["completed", "error"]
        assert response.timestamp is not None
        
        if response.status == "completed":
            assert "itinerary" in response.data

class TestOrchestrator:
    """Test suite for the travel orchestrator"""
    
    @pytest.mark.asyncio
    async def test_trip_planning_workflow(self, sample_trip_request):
        """Test complete trip planning workflow"""
        result = await travel_orchestrator.plan_trip(sample_trip_request)
        
        assert isinstance(result, dict)
        assert "final_summary" in result or "error" in result
        
        if "final_summary" in result:
            summary = result["final_summary"]
            assert summary["destination"] == sample_trip_request.destination
            assert "completion_time" in summary
    
    @pytest.mark.asyncio
    async def test_trip_status(self):
        """Test trip status retrieval"""
        status = await travel_orchestrator.get_trip_status("test_trip_123")
        
        assert isinstance(status, dict)
        assert "trip_id" in status
        assert "status" in status

class TestModels:
    """Test suite for data models"""
    
    def test_trip_request_model(self):
        """Test TripRequest model validation"""
        trip_request = TripRequest(
            user_id="test_user",
            destination="Paris, France",
            start_date=datetime.now() + timedelta(days=30),
            end_date=datetime.now() + timedelta(days=35),
            budget=Decimal("2500.00")
        )
        
        assert trip_request.user_id == "test_user"
        assert trip_request.destination == "Paris, France"
        assert trip_request.budget == Decimal("2500.00")
    
    def test_user_preferences_model(self):
        """Test UserPreferences model"""
        preferences = UserPreferences(
            accommodation_type="hotel",
            transport_options=["flight", "train"],
            activity_types=["sightseeing"],
            dietary_restrictions=["vegetarian"],
            accessibility_needs=[]
        )
        
        assert preferences.accommodation_type == "hotel"
        assert "flight" in preferences.transport_options
        assert "sightseeing" in preferences.activity_types

@pytest.mark.integration
class TestIntegration:
    """Integration tests for the complete system"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_workflow(self, sample_trip_request):
        """Test complete end-to-end workflow"""
        # This test would require actual API keys and external services
        # For now, we'll test the workflow structure
        
        # Start with weather agent
        initial_state = {"trip_request": sample_trip_request}
        weather_response = await weather_agent.process(initial_state)
        
        if weather_response.status == "completed":
            # Continue with maps agent
            state_with_weather = {
                **initial_state,
                "weather_data": weather_response.data.get("weather_data", {})
            }
            maps_response = await maps_agent.process(state_with_weather)
            
            assert maps_response.agent_name == "maps_agent"
            assert maps_response.status in ["completed", "error"]

if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])