import asyncio
from motor.motor_asyncio import AsyncIOMotorClient


async def setup_mongo(uri="mongodb+srv://preetkaurpawar8_db_user:cgHndcuK5RlqTSSb@cluster0.nhvlyqr.mongodb.net/", db_name="travel_planner"):
    client = AsyncIOMotorClient(uri)
    db = client[db_name]

    # ---------------- Trip Requests ----------------
    await db.create_collection("trip_requests", validator={
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["user_id", "destination", "start_date", "end_date", "budget"],
            "properties": {
                "user_id": {"bsonType": "string"},
                "destination": {"bsonType": "string"},
                "start_date": {"bsonType": "date"},
                "end_date": {"bsonType": "date"},
                "budget": {"bsonType": ["decimal", "double", "int"]}
            }
        }
    })
    await db["trip_requests"].create_index([("user_id", 1)])
    await db["trip_requests"].create_index([("destination", 1)])
    await db["trip_requests"].create_index([("start_date", 1), ("end_date", 1)])

    # ---------------- Agent Responses ----------------
    await db.create_collection("agent_responses", validator={
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["agent_name", "status", "data", "timestamp"],
            "properties": {
                "agent_name": {"bsonType": "string"},
                "status": {"bsonType": "string"},
                "data": {"bsonType": "object"},
                "timestamp": {"bsonType": "date"}
            }
        }
    })
    await db["agent_responses"].create_index([("agent_name", 1)])
    await db["agent_responses"].create_index([("timestamp", -1)])

    # ---------------- Orchestration States ----------------
    await db.create_collection("orchestration_states", validator={
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["thread_id", "state", "timestamp"],
            "properties": {
                "thread_id": {"bsonType": "string"},
                "state": {"bsonType": "object"},
                "timestamp": {"bsonType": "date"}
            }
        }
    })
    await db["orchestration_states"].create_index([("thread_id", 1)])
    await db["orchestration_states"].create_index([("timestamp", -1)])

    # ---------------- Trip Summaries ----------------
    await db.create_collection("trip_summaries", validator={
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["trip_overview", "status"],
            "properties": {
                "trip_overview": {"bsonType": "object"},
                "status": {"bsonType": "string"}
            }
        }
    })
    await db["trip_summaries"].create_index([("trip_overview.destination", 1)])
    await db["trip_summaries"].create_index([("status", 1)])
    await db["trip_summaries"].create_index([("processing_time", -1)])

    # ---------------- Errors Logs ----------------
    await db.create_collection("errors_logs", validator={
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["step", "error", "timestamp"],
            "properties": {
                "step": {"bsonType": "string"},
                "error": {"bsonType": "string"},
                "timestamp": {"bsonType": "date"}
            }
        }
    })
    await db["errors_logs"].create_index([("step", 1)])
    await db["errors_logs"].create_index([("timestamp", -1)])

    print("✅ MongoDB schema validation & indexes created.")


if __name__ == "__main__":
    asyncio.run(setup_mongo())
