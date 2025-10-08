from typing import Dict, Any, List, TypedDict, Annotated
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
import operator
from datetime import datetime
import asyncio

from models import TripRequest, AgentResponse
import agents

from motor.motor_asyncio import AsyncIOMotorClient

# ---------------- MongoDB Setup ----------------
MONGO_URI = "mongodb+srv://preetkaurpawar8_db_user:cgHndcuK5RlqTSSb@cluster0.nhvlyqr.mongodb.net/"
DB_NAME = "travel_planner"
client = AsyncIOMotorClient(MONGO_URI)
db = client[DB_NAME]
    

# ---------------- Workflow State ----------------
class TravelPlanningState(TypedDict):
    trip_request: TripRequest
    weather_data: Dict[str, Any]
    route_details: Dict[str, Any]
    events_data: Dict[str, Any]
    budget_analysis: Dict[str, Any]
    itinerary: Dict[str, Any]
    flight_details: Dict[str, Any]
    train_details: Dict[str, Any]
    calendar_data: Dict[str, Any]

    agent_responses: Annotated[List[AgentResponse], operator.add]
    current_step: str
    completed_agents: Annotated[List[str], operator.add]
    errors: Annotated[List[str], operator.add]


# ---------------- Orchestrator ----------------
class TravelOrchestrator:
    """Main orchestrator for the travel planning workflow using LangGraph"""

    def __init__(self):
        self.memory = MemorySaver()
        self.workflow = self._create_workflow()

    def _create_workflow(self):
        workflow = StateGraph(TravelPlanningState)

        # Define nodes
        workflow.add_node("weather_analysis", self._weather_node)
        workflow.add_node("route_planning", self._route_node)
        workflow.add_node("event_discovery", self._events_node)
        workflow.add_node("budget_optimization", self._budget_node)
        workflow.add_node("itinerary_creation", self._itinerary_node)
        workflow.add_node("flight_search", self._flights_node)
        workflow.add_node("train_search", self._trains_node)
        workflow.add_node("calendar_sync", self._calendar_node)
        workflow.add_node("trip_summary", self._summary_node)

        # Define edges
        workflow.set_entry_point("weather_analysis")
        workflow.add_edge("weather_analysis", "route_planning")
        workflow.add_edge("route_planning", "event_discovery")
        workflow.add_edge("event_discovery", "budget_optimization")
        workflow.add_edge("budget_optimization", "itinerary_creation")
        workflow.add_edge("itinerary_creation", "flight_search")
        workflow.add_edge("flight_search", "train_search")
        workflow.add_edge("train_search", "calendar_sync")
        workflow.add_edge("calendar_sync", "trip_summary")
        workflow.add_edge("trip_summary", END)

        return workflow.compile(checkpointer=self.memory)

    # ---------------- Agent Nodes ----------------
    async def _weather_node(self, state: TravelPlanningState) -> Dict[str, Any]:
        try:
            response = await agents.weather_agent.process(state)
            await self._save_agent_response(response, "weather_agent")
            return {
                "weather_data": response.data.get("weather_data", {}),
                "agent_responses": [response],
                "completed_agents": ["weather_agent"],
                "current_step": "weather_completed"
            }
        except Exception as e:
            await self._log_error("weather_agent", str(e))
            return {"errors": [f"Weather agent error: {str(e)}"], "current_step": "weather_error"}

    async def _route_node(self, state: TravelPlanningState) -> Dict[str, Any]:
        try:
            response = await agents.maps_agent.process(state)
            await self._save_agent_response(response, "maps_agent")
            return {
                "route_details": response.data.get("route_details", {}),
                "agent_responses": [response],
                "completed_agents": ["maps_agent"],
                "current_step": "route_completed"
            }
        except Exception as e:
            await self._log_error("maps_agent", str(e))
            return {"errors": [f"Maps agent error: {str(e)}"], "current_step": "route_error"}

    async def _events_node(self, state: TravelPlanningState) -> Dict[str, Any]:
        try:
            response = await agents.events_agent.process(state)
            await self._save_agent_response(response, "events_agent")
            return {
                "events_data": response.data.get("events", {}),
                "agent_responses": [response],
                "completed_agents": ["events_agent"],
                "current_step": "events_completed"
            }
        except Exception as e:
            await self._log_error("events_agent", str(e))
            return {"errors": [f"Events agent error: {str(e)}"], "current_step": "events_error"}

    async def _budget_node(self, state: TravelPlanningState) -> Dict[str, Any]:
        try:
            response = await agents.budget_agent.process(state)
            await self._save_agent_response(response, "budget_agent")
            return {
                "budget_analysis": response.data.get("budget_breakdown", {}),
                "agent_responses": [response],
                "completed_agents": ["budget_agent"],
                "current_step": "budget_completed"
            }
        except Exception as e:
            await self._log_error("budget_agent", str(e))
            return {"errors": [f"Budget agent error: {str(e)}"], "current_step": "budget_error"}

    async def _itinerary_node(self, state: TravelPlanningState) -> Dict[str, Any]:
        try:
            response = await agents.itinerary_agent.process(state)
            await self._save_agent_response(response, "itinerary_agent")
            return {
                "itinerary": response.data.get("itinerary", {}),
                "agent_responses": [response],
                "completed_agents": ["itinerary_agent"],
                "current_step": "itinerary_completed"
            }
        except Exception as e:
            await self._log_error("itinerary_agent", str(e))
            return {"errors": [f"Itinerary agent error: {str(e)}"], "current_step": "itinerary_error"}

    async def _flights_node(self, state: TravelPlanningState) -> Dict[str, Any]:
        try:
            response = await agents.flights_agent.process(state)
            await self._save_agent_response(response, "flights_agent")
            return {
                "flight_details": response.data.get("flight_recommendations", {}),
                "agent_responses": [response],
                "completed_agents": ["flights_agent"],
                "current_step": "flights_completed"
            }
        except Exception as e:
            await self._log_error("flights_agent", str(e))
            return {"errors": [f"Flights agent error: {str(e)}"], "current_step": "flights_error"}

    async def _trains_node(self, state: TravelPlanningState) -> Dict[str, Any]:
        try:
            response = await agents.trains_agent.process(state)
            await self._save_agent_response(response, "trains_agent")
            return {
                "train_details": response.data.get("train_recommendations", {}),
                "agent_responses": [response],
                "completed_agents": ["trains_agent"],
                "current_step": "trains_completed"
            }
        except Exception as e:
            await self._log_error("trains_agent", str(e))
            return {"errors": [f"Trains agent error: {str(e)}"], "current_step": "trains_error"}

    async def _calendar_node(self, state: TravelPlanningState) -> Dict[str, Any]:
        try:
            response = await agents.calendar_agent.process(state)
            await self._save_agent_response(response, "calendar_agent")
            return {
                "calendar_data": response.data.get("calendar_events", {}),
                "agent_responses": [response],
                "completed_agents": ["calendar_agent"],
                "current_step": "calendar_completed"
            }
        except Exception as e:
            await self._log_error("calendar_agent", str(e))
            return {"errors": [f"Calendar agent error: {str(e)}"], "current_step": "calendar_error"}

    async def _summary_node(self, state: TravelPlanningState) -> Dict[str, Any]:
        try:
            all_responses = state.get("agent_responses", [])
            summary = {
                "trip_overview": {
                    "destination": state["trip_request"].destination,
                    "dates": f"{state['trip_request'].start_date} to {state['trip_request'].end_date}",
                    "budget": state["trip_request"].budget,
                    "duration": str(state["trip_request"].end_date - state["trip_request"].start_date)
                },
                "weather_summary": state.get("weather_data", {}),
                "route_summary": state.get("route_details", {}),
                "events_summary": state.get("events_data", {}),
                "budget_summary": state.get("budget_analysis", {}),
                "itinerary_summary": state.get("itinerary", {}),
                "flight_summary": state.get("flight_details", {}),
                "train_summary": state.get("train_details", {}),
                "calendar_summary": state.get("calendar_data", {}),
                "agent_count": len(all_responses),
                "completed_agents": state.get("completed_agents", []),
                "processing_time": datetime.now(),
                "status": "completed"
            }

            await db["trip_summaries"].insert_one(summary)
            return {"trip_summary": summary, "current_step": "completed", "final_status": "success"}
        except Exception as e:
            await self._log_error("summary_node", str(e))
            return {"errors": [f"Summary generation error: {str(e)}"], "current_step": "summary_error", "final_status": "error"}

    # ---------------- Public API ----------------
    async def plan_trip(self, request: TripRequest, thread_id: str = None) -> Dict[str, Any]:
        try:
            # Save initial request
            await db["trip_requests"].insert_one(request.dict())

            initial_state = TravelPlanningState(
                trip_request=request,
                weather_data={},
                route_details={},
                events_data={},
                budget_analysis={},
                itinerary={},
                flight_details={},
                train_details={},
                calendar_data={},
                agent_responses=[],
                current_step="starting",
                completed_agents=[],
                errors=[]
            )

            config = {"configurable": {"thread_id": thread_id or "default-thread"}}
            result = await self.workflow.ainvoke(initial_state, config)

            # Save orchestration state
            await db["orchestration_states"].insert_one({
                "thread_id": config["configurable"]["thread_id"],
                "state": dict(result),
                "timestamp": datetime.now()
            })
            return result
        except Exception as e:
            await self._log_error("plan_trip", str(e))
            return {"error": str(e), "status": "failed"}

    async def get_workflow_state(self, thread_id: str) -> Dict[str, Any]:
        try:
            config = {"configurable": {"thread_id": thread_id}}
            state = await self.workflow.aget_state(config)
            return {"current_state": state.values, "next_actions": state.next, "metadata": state.metadata}
        except Exception as e:
            return {"error": str(e)}

    # ---------------- Helpers ----------------
    async def _save_agent_response(self, response: AgentResponse, agent_name: str):
        """Save each agent response"""
        await db["agent_responses"].insert_one({
            "agent_name": agent_name,
            "status": response.status,
            "data": response.data,
            "timestamp": datetime.now()
        })

    async def _log_error(self, step: str, error: str):
        """Log errors to errors_logs"""
        await db["errors_logs"].insert_one({"step": step, "error": error, "timestamp": datetime.now()})


# Singleton orchestrator
orchestrator = TravelOrchestrator()
