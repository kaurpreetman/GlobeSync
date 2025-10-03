# queries.py
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime


# ---------------- Trip Requests ----------------
async def get_user_trips(db: AsyncIOMotorDatabase, user_id: str) -> List[Dict[str, Any]]:
    """Get all trip requests for a user"""
    return await db["trip_requests"].find({"user_id": user_id}).to_list(length=100)


async def get_trip_request(db: AsyncIOMotorDatabase, trip_id: str) -> Optional[Dict[str, Any]]:
    """Get a single trip request by ID"""
    return await db["trip_requests"].find_one({"_id": trip_id})


# ---------------- Trip Summaries ----------------
async def get_last_summary(db: AsyncIOMotorDatabase, user_id: str) -> Optional[Dict[str, Any]]:
    """Get the latest trip summary for a user"""
    return await db["trip_summaries"].find_one(
        {"trip_overview.user_id": user_id},
        sort=[("processing_time", -1)]
    )


async def get_trip_summary(db: AsyncIOMotorDatabase, trip_id: str) -> Optional[Dict[str, Any]]:
    """Get trip summary for a given trip ID"""
    return await db["trip_summaries"].find_one({"trip_overview.trip_id": trip_id})


# ---------------- Agent Responses ----------------
async def get_agent_responses(db: AsyncIOMotorDatabase, thread_id: str) -> List[Dict[str, Any]]:
    """Get all agent responses for a workflow/thread"""
    return await db["agent_responses"].find({"thread_id": thread_id}).sort("timestamp", -1).to_list(length=100)


# ---------------- Orchestration States ----------------
async def get_workflow_states(db: AsyncIOMotorDatabase, thread_id: str) -> List[Dict[str, Any]]:
    """Get all orchestration states for a workflow/thread"""
    return await db["orchestration_states"].find({"thread_id": thread_id}).sort("timestamp", -1).to_list(length=50)


# ---------------- Error Logs ----------------
async def get_errors(db: AsyncIOMotorDatabase, thread_id: str) -> List[Dict[str, Any]]:
    """Get all error logs for a workflow/thread"""
    return await db["errors_logs"].find({"thread_id": thread_id}).sort("timestamp", -1).to_list(length=50)


async def log_error(db: AsyncIOMotorDatabase, step: str, error: str, thread_id: Optional[str] = None):
    """Log an error into errors_logs collection"""
    error_doc = {
        "step": step,
        "error": error,
        "timestamp": datetime.utcnow(),
    }
    if thread_id:
        error_doc["thread_id"] = thread_id
    await db["errors_logs"].insert_one(error_doc)
