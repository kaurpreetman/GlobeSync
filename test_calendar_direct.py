"""
Direct test of Google Calendar API to verify credentials work
"""
import pickle
import os
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

def test_calendar():
    user_id = "117978642858986784707"
    token_path = f"tokens/user_{user_id}_token.pickle"
    
    print(f"🔍 Checking token file: {token_path}")
    
    if not os.path.exists(token_path):
        print(f"❌ Token file not found!")
        return
    
    print(f"✅ Token file exists")
    
    # Load credentials
    try:
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
        print(f"✅ Loaded credentials from pickle")
    except Exception as e:
        print(f"❌ Failed to load credentials: {e}")
        return
    
    # Check validity
    print(f"\n📊 Credentials Status:")
    print(f"   Valid: {creds.valid}")
    print(f"   Expired: {creds.expired if hasattr(creds, 'expired') else 'N/A'}")
    print(f"   Has refresh token: {bool(creds.refresh_token) if hasattr(creds, 'refresh_token') else 'N/A'}")
    
    # Try to refresh if needed
    if creds.expired and creds.refresh_token:
        print(f"\n🔄 Refreshing expired credentials...")
        from google.auth.transport.requests import Request
        try:
            creds.refresh(Request())
            print(f"✅ Credentials refreshed successfully")
            # Save refreshed creds
            with open(token_path, 'wb') as token:
                pickle.dump(creds, token)
            print(f"✅ Saved refreshed credentials")
        except Exception as e:
            print(f"❌ Failed to refresh: {e}")
            return
    
    if not creds.valid:
        print(f"❌ Credentials are not valid and cannot be refreshed")
        return
    
    # Try to access calendar
    print(f"\n🗓️ Testing Calendar API access...")
    try:
        service = build('calendar', 'v3', credentials=creds)
        print(f"✅ Calendar service built successfully")
    except Exception as e:
        print(f"❌ Failed to build service: {e}")
        return
    
    # List calendars
    try:
        calendar_list = service.calendarList().list().execute()
        calendars = calendar_list.get('items', [])
        print(f"\n📋 Found {len(calendars)} calendars:")
        for cal in calendars:
            print(f"   - {cal.get('summary')} (ID: {cal.get('id')})")
    except Exception as e:
        print(f"❌ Failed to list calendars: {e}")
        return
    
    # Create a test event
    print(f"\n🎯 Creating test event...")
    test_event = {
        'summary': 'GlobeSync Calendar Test',
        'description': 'Test event to verify calendar integration works',
        'start': {
            'dateTime': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%dT10:00:00'),
            'timeZone': 'UTC',
        },
        'end': {
            'dateTime': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%dT11:00:00'),
            'timeZone': 'UTC',
        },
        'reminders': {
            'useDefault': False,
            'overrides': [
                {'method': 'popup', 'minutes': 10},
            ],
        },
    }
    
    try:
        created_event = service.events().insert(calendarId='primary', body=test_event).execute()
        print(f"✅ Test event created successfully!")
        print(f"   Event ID: {created_event['id']}")
        print(f"   Link: {created_event.get('htmlLink')}")
        print(f"\n🎉 Calendar integration is working! Check your Google Calendar app.")
        
        # Optionally delete the test event
        response = input("\nDelete test event? (y/n): ")
        if response.lower() == 'y':
            service.events().delete(calendarId='primary', eventId=created_event['id']).execute()
            print("✅ Test event deleted")
        
    except Exception as e:
        print(f"❌ Failed to create event: {e}")
        import traceback
        traceback.print_exc()
        return

if __name__ == "__main__":
    test_calendar()
