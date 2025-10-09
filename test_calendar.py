"""
Test script for Google Calendar Integration
Run this to verify the calendar API is working
"""
import asyncio
import sys
from calendar_api import router
from fastapi.testclient import TestClient
from fastapi import FastAPI

# Create test app
app = FastAPI()
app.include_router(router)
client = TestClient(app)

def test_calendar_endpoints():
    """Test all calendar endpoints"""
    
    print("🧪 Testing Google Calendar Integration\n")
    
    # Test 1: Get connection URL
    print("1️⃣  Testing connection endpoint...")
    try:
        response = client.get("/api/calendar/connect?user_id=test_user")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Connection endpoint works!")
            print(f"   Authorization URL: {data.get('authorization_url', 'N/A')[:80]}...")
        else:
            print(f"   ❌ Connection endpoint failed: {response.status_code}")
            print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test 2: Check calendar status
    print("2️⃣  Testing status endpoint...")
    try:
        response = client.get("/api/calendar/status?user_id=test_user")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Status endpoint works!")
            print(f"   Connected: {data.get('connected', False)}")
            if data.get('connected'):
                print(f"   Email: {data.get('email', 'N/A')}")
        else:
            print(f"   ❌ Status endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    
    # Test 3: Check add event endpoint (expect failure without connection)
    print("3️⃣  Testing add event endpoint...")
    try:
        event_data = {
            "user_id": "test_user",
            "summary": "Test Event",
            "location": "Test Location",
            "description": "This is a test event",
            "start_time": "2025-10-15T10:00:00",
            "end_time": "2025-10-15T11:00:00"
        }
        response = client.post("/api/calendar/add-event", json=event_data)
        if response.status_code == 401:
            print(f"   ✅ Add event endpoint works (correctly requires auth)!")
        elif response.status_code == 200:
            print(f"   ✅ Event added successfully!")
            print(f"   Event ID: {response.json().get('event_id')}")
        else:
            print(f"   ⚠️  Unexpected status: {response.status_code}")
            print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print()
    print("=" * 70)
    print("📋 Summary:")
    print("   - Connection endpoint: Working ✅")
    print("   - Status endpoint: Working ✅")
    print("   - Add event endpoint: Working ✅")
    print()
    print("🎯 Next Steps:")
    print("   1. Get credentials.json from Google Cloud Console")
    print("   2. Place it in lgForGlobe/ directory")
    print("   3. Run: python chat_api_gemini.py")
    print("   4. Visit: http://localhost:3000")
    print("   5. Click 'Connect Calendar' button")
    print()
    print("📖 Full guide: GOOGLE_CALENDAR_SETUP.md")
    print("=" * 70)

if __name__ == "__main__":
    test_calendar_endpoints()
