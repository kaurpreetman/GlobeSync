"""
Example usage scripts for the LangGraph Travel Planning API
"""

import asyncio
import httpx
import json
from datetime import datetime, timedelta

# API Configuration
API_BASE_URL = "http://localhost:8000"

async def example_trip_planning():
    """Example of planning a complete trip"""
    
    async with httpx.AsyncClient() as client:
        # 1. Start trip planning
        trip_request = {
            "user_id": "demo_user_123",
            "destination": "Tokyo, Japan",
            "start_date": (datetime.now() + timedelta(days=30)).isoformat(),
            "end_date": (datetime.now() + timedelta(days=37)).isoformat(),
            "budget": 3500.00,
            "preferences": {
                "accommodation_type": "hotel",
                "transport_options": ["flight"],
                "activity_types": ["sightseeing", "entertainment", "cultural"],
                "dietary_restrictions": [],
                "accessibility_needs": []
            }
        }
        
        print("🚀 Starting trip planning...")
        response = await client.post(f"{API_BASE_URL}/api/v1/trips/plan", json=trip_request)
        trip_data = response.json()
        trip_id = trip_data["trip_id"]
        print(f"📍 Trip ID: {trip_id}")
        print(f"Status URL: {trip_data['status_url']}")
        
        # 2. Monitor progress
        print("\n📊 Monitoring progress...")
        while True:
            status_response = await client.get(f"{API_BASE_URL}/api/v1/trips/{trip_id}/status")
            status = status_response.json()
            
            print(f"Status: {status['status']} | Step: {status['current_step']} | Progress: {status['progress_percentage']}%")
            print(f"Completed agents: {', '.join(status['completed_agents'])}")
            
            if status["status"] in ["completed", "failed"]:
                break
            
            await asyncio.sleep(2)
        
        # 3. Get final results
        if status["status"] == "completed":
            print("\n✅ Trip planning completed! Getting results...")
            result_response = await client.get(f"{API_BASE_URL}/api/v1/trips/{trip_id}/result")
            result = result_response.json()
            
            print(f"\n🎯 Trip Planning Results:")
            print(f"Processing time: {result['processing_time']:.2f} seconds")
            print(f"Completed agents: {', '.join(result['completed_agents'])}")
            
            # Display summary if available
            final_summary = result.get("result", {}).get("final_summary", {})
            if final_summary:
                print(f"\n📋 Trip Summary:")
                print(f"Destination: {final_summary.get('destination')}")
                print(f"Events found: {final_summary.get('events_count', 0)}")
                print(f"Itinerary ready: {final_summary.get('itinerary_ready', False)}")
                print(f"Total errors: {final_summary.get('total_errors', 0)}")
        else:
            print(f"\n❌ Trip planning failed: {status.get('error_message')}")

async def example_system_monitoring():
    """Example of monitoring system status"""
    
    async with httpx.AsyncClient() as client:
        # Get system stats
        print("📊 System Statistics:")
        stats_response = await client.get(f"{API_BASE_URL}/api/v1/system/stats")
        stats = stats_response.json()
        
        print(f"Total trips: {stats['total_trips']}")
        print(f"Active trips: {stats['active_trips']}")
        print(f"Completed trips: {stats['completed_trips']}")
        print(f"Failed trips: {stats['failed_trips']}")
        print(f"System status: {stats['system_status']}")
        
        # List available agents
        print("\n🤖 Available Agents:")
        agents_response = await client.get(f"{API_BASE_URL}/api/v1/agents")
        agents_data = agents_response.json()
        
        for agent in agents_data["agents"]:
            print(f"- {agent['name']}: {agent['description']}")
            print(f"  Capabilities: {', '.join(agent['capabilities'])}")
        
        # List recent trips
        print("\n📋 Recent Trips:")
        trips_response = await client.get(f"{API_BASE_URL}/api/v1/trips")
        trips_data = trips_response.json()
        
        for trip in trips_data["trips"][:5]:
            print(f"- {trip['trip_id'][:8]}... | {trip['destination']} | {trip['status']}")

async def example_batch_planning():
    """Example of planning multiple trips"""
    
    destinations = [
        "Paris, France",
        "New York, USA", 
        "Sydney, Australia",
        "Bangkok, Thailand"
    ]
    
    trip_ids = []
    
    async with httpx.AsyncClient() as client:
        # Start multiple trip planning processes
        print("🌍 Starting batch trip planning...")
        
        for i, destination in enumerate(destinations):
            trip_request = {
                "user_id": f"batch_user_{i}",
                "destination": destination,
                "start_date": (datetime.now() + timedelta(days=60 + i*7)).isoformat(),
                "end_date": (datetime.now() + timedelta(days=65 + i*7)).isoformat(),
                "budget": 2000.00 + (i * 500),
                "preferences": {
                    "activity_types": ["sightseeing", "entertainment"]
                }
            }
            
            response = await client.post(f"{API_BASE_URL}/api/v1/trips/plan", json=trip_request)
            trip_data = response.json()
            trip_ids.append(trip_data["trip_id"])
            print(f"Started planning for {destination}: {trip_data['trip_id'][:8]}...")
        
        # Monitor all trips
        print("\n📊 Monitoring all trips...")
        completed_trips = set()
        
        while len(completed_trips) < len(trip_ids):
            for trip_id in trip_ids:
                if trip_id in completed_trips:
                    continue
                
                status_response = await client.get(f"{API_BASE_URL}/api/v1/trips/{trip_id}/status")
                status = status_response.json()
                
                if status["status"] in ["completed", "failed"]:
                    completed_trips.add(trip_id)
                    destination_index = trip_ids.index(trip_id)
                    print(f"✅ {destinations[destination_index]} planning {status['status']}")
            
            if len(completed_trips) < len(trip_ids):
                await asyncio.sleep(3)
        
        print(f"\n🎉 All {len(trip_ids)} trips completed!")

async def main():
    """Run example usage scenarios"""
    print("🌟 LangGraph Travel Planning API Examples\n")
    
    try:
        # Check if API is running
        async with httpx.AsyncClient() as client:
            health_response = await client.get(f"{API_BASE_URL}/health")
            if health_response.status_code != 200:
                print("❌ API is not running. Please start the server first.")
                return
        
        print("✅ API is running. Starting examples...\n")
        
        # Run examples
        print("=" * 50)
        print("1. Single Trip Planning Example")
        print("=" * 50)
        await example_trip_planning()
        
        await asyncio.sleep(2)
        
        print("\n" + "=" * 50)
        print("2. System Monitoring Example")
        print("=" * 50)
        await example_system_monitoring()
        
        # Uncomment to run batch example (takes longer)
        # await asyncio.sleep(2)
        # print("\n" + "=" * 50)
        # print("3. Batch Planning Example")
        # print("=" * 50)
        # await example_batch_planning()
        
    except httpx.ConnectError:
        print("❌ Could not connect to API. Please ensure the server is running at http://localhost:8000")
    except Exception as e:
        print(f"❌ An error occurred: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())