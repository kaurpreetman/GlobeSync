"""
Google Calendar Integration API
Handles OAuth flow and calendar event management
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import os
import pickle
from datetime import datetime
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

# OAuth 2.0 configuration - Use only calendar scope
SCOPES = ['https://www.googleapis.com/auth/calendar']
REDIRECT_URI = "http://localhost:8000/api/calendar/oauth2callback"

# Use a consistent state/session store
oauth_states = {}  # In production, use Redis or similar

class CalendarEventRequest(BaseModel):
    """Request model for adding calendar event"""
    summary: str
    location: str
    description: str
    start_time: str  # ISO format
    end_time: str    # ISO format
    user_id: str

class CalendarConnectionStatus(BaseModel):
    """Response model for calendar connection status"""
    connected: bool
    email: Optional[str] = None
    calendar_id: Optional[str] = None

def get_user_credentials(user_id: str) -> Optional[Credentials]:
    """Get stored credentials for a user"""
    token_path = f"tokens/user_{user_id}_token.pickle"
    
    if os.path.exists(token_path):
        try:
            with open(token_path, 'rb') as token:
                creds = pickle.load(token)
                if creds and creds.valid:
                    return creds
        except Exception as e:
            logger.error(f"Error loading credentials for user {user_id}: {e}")
    
    return None

def save_user_credentials(user_id: str, creds: Credentials):
    """Save credentials for a user"""
    os.makedirs("tokens", exist_ok=True)
    token_path = f"tokens/user_{user_id}_token.pickle"
    
    with open(token_path, 'wb') as token:
        pickle.dump(creds, token)

@router.get("/connect")
async def connect_calendar(user_id: str):
    """
    Initiate Google Calendar OAuth flow
    Returns authorization URL for user to visit
    """
    try:
        if not os.path.exists(settings.GOOGLE_CALENDAR_CREDENTIALS_PATH):
            raise HTTPException(
                status_code=500,
                detail="Google Calendar credentials not configured. Please add credentials.json"
            )
        
        # Delete existing token to force re-authentication with correct scopes
        token_path = f"tokens/user_{user_id}_token.pickle"
        if os.path.exists(token_path):
            try:
                os.remove(token_path)
                logger.info(f"Removed old token for user {user_id}")
            except Exception as e:
                logger.warning(f"Could not remove old token: {e}")
        
        # Create flow instance with explicit scopes
        flow = Flow.from_client_secrets_file(
            settings.GOOGLE_CALENDAR_CREDENTIALS_PATH,
            scopes=SCOPES,  # Use our defined scopes, not from credentials file
            redirect_uri=REDIRECT_URI
        )
        
        # Generate authorization URL with explicit parameters
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='false',  # Don't include other scopes
            prompt='consent',  # Force consent screen to ensure correct scopes
            state=user_id  # Pass user_id in state
        )
        
        # Store state for verification
        oauth_states[state] = user_id
        
        return {
            "authorization_url": authorization_url,
            "message": "Please visit the URL to authorize calendar access"
        }
        
    except Exception as e:
        logger.error(f"Error initiating OAuth flow: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/oauth2callback")
async def oauth2_callback(request: Request):
    """
    Handle OAuth callback from Google
    """
    try:
        # Get authorization code and state (user_id) from callback
        code = request.query_params.get('code')
        state = request.query_params.get('state')  # user_id
        error = request.query_params.get('error')
        
        # Check for OAuth errors
        if error:
            logger.error(f"OAuth error: {error}")
            return RedirectResponse(url=f"http://localhost:3000/?calendar_error={error}")
        
        if not code:
            raise HTTPException(status_code=400, detail="No authorization code received")
        
        # Verify state
        user_id = oauth_states.get(state, state)
        if state in oauth_states:
            del oauth_states[state]  # Clean up
        
        # Create flow instance with same parameters
        flow = Flow.from_client_secrets_file(
            settings.GOOGLE_CALENDAR_CREDENTIALS_PATH,
            scopes=SCOPES,  # Use our defined scopes
            redirect_uri=REDIRECT_URI
        )
        
        # Set the state to match what was sent
        flow.oauth2session.state = state
        
        # Exchange authorization code for credentials
        flow.fetch_token(code=code)
        creds = flow.credentials
        
        # Verify we got the right scopes
        if creds.scopes:
            logger.info(f"Granted scopes: {creds.scopes}")
        
        # Save credentials for the user
        save_user_credentials(user_id, creds)
        
        logger.info(f"Successfully authenticated user {user_id}")
        
        # Redirect to frontend success page
        return RedirectResponse(url=f"http://localhost:3000/?calendar_connected=true")
        
    except Exception as e:
        logger.error(f"Error handling OAuth callback: {e}", exc_info=True)
        error_msg = str(e).replace(" ", "_")
        return RedirectResponse(url=f"http://localhost:3000/?calendar_error={error_msg}")

@router.get("/status")
async def get_calendar_status(user_id: str):
    """
    Check if user has connected their Google Calendar
    """
    try:
        creds = get_user_credentials(user_id)
        
        if not creds:
            return CalendarConnectionStatus(connected=False)
        
        # Get user's email from credentials
        service = build('calendar', 'v3', credentials=creds)
        calendar = service.calendars().get(calendarId='primary').execute()
        
        return CalendarConnectionStatus(
            connected=True,
            email=calendar.get('summary'),
            calendar_id='primary'
        )
        
    except Exception as e:
        logger.error(f"Error checking calendar status: {e}")
        return CalendarConnectionStatus(connected=False)

@router.post("/add-event")
async def add_event_to_calendar(event_request: CalendarEventRequest):
    """
    Add an event to user's Google Calendar
    """
    try:
        creds = get_user_credentials(event_request.user_id)
        
        if not creds:
            raise HTTPException(
                status_code=401,
                detail="Calendar not connected. Please connect your Google Calendar first."
            )
        
        # Build calendar service
        service = build('calendar', 'v3', credentials=creds)
        
        # Create event
        event = {
            'summary': event_request.summary,
            'location': event_request.location,
            'description': event_request.description,
            'start': {
                'dateTime': event_request.start_time,
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': event_request.end_time,
                'timeZone': 'UTC',
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24 * 60},
                    {'method': 'popup', 'minutes': 30},
                ],
            },
        }
        
        # Insert event
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        
        return {
            "success": True,
            "event_id": created_event['id'],
            "event_link": created_event.get('htmlLink'),
            "message": f"Event '{event_request.summary}' added to calendar"
        }
        
    except Exception as e:
        logger.error(f"Error adding event to calendar: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/add-events-batch")
async def add_events_batch(user_id: str, events: List[Dict[str, Any]]):
    """
    Add multiple events to user's calendar at once
    Used when events are found during trip planning
    """
    try:
        creds = get_user_credentials(user_id)
        
        if not creds:
            return {
                "success": False,
                "message": "Calendar not connected",
                "events_added": 0
            }
        
        service = build('calendar', 'v3', credentials=creds)
        
        added_events = []
        failed_events = []
        
        for event_data in events:
            try:
                event = {
                    'summary': event_data.get('name', event_data.get('summary')),
                    'location': event_data.get('location', {}).get('address', ''),
                    'description': event_data.get('description', ''),
                    'start': {
                        'dateTime': event_data.get('start_time'),
                        'timeZone': 'UTC',
                    },
                    'end': {
                        'dateTime': event_data.get('end_time'),
                        'timeZone': 'UTC',
                    },
                    'reminders': {
                        'useDefault': False,
                        'overrides': [
                            {'method': 'email', 'minutes': 24 * 60},
                            {'method': 'popup', 'minutes': 30},
                        ],
                    },
                }
                
                created_event = service.events().insert(calendarId='primary', body=event).execute()
                added_events.append({
                    "name": event_data.get('name'),
                    "event_id": created_event['id'],
                    "link": created_event.get('htmlLink')
                })
                
            except Exception as e:
                logger.error(f"Error adding event {event_data.get('name')}: {e}")
                failed_events.append(event_data.get('name'))
        
        return {
            "success": True,
            "events_added": len(added_events),
            "events_failed": len(failed_events),
            "added_events": added_events,
            "failed_events": failed_events
        }
        
    except Exception as e:
        logger.error(f"Error adding events batch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/disconnect")
async def disconnect_calendar(user_id: str):
    """
    Disconnect user's Google Calendar
    """
    try:
        token_path = f"tokens/user_{user_id}_token.pickle"
        
        if os.path.exists(token_path):
            os.remove(token_path)
            logger.info(f"Disconnected calendar for user {user_id}")
        
        return {
            "success": True,
            "message": "Calendar disconnected successfully"
        }
        
    except Exception as e:
        logger.error(f"Error disconnecting calendar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/clear-tokens")
async def clear_all_tokens():
    """
    Development endpoint: Clear all stored tokens
    Use this if you need to reset all calendar connections
    """
    try:
        if os.path.exists("tokens"):
            import shutil
            shutil.rmtree("tokens")
            os.makedirs("tokens", exist_ok=True)
            logger.info("Cleared all calendar tokens")
        
        return {
            "success": True,
            "message": "All calendar tokens cleared"
        }
        
    except Exception as e:
        logger.error(f"Error clearing tokens: {e}")
        raise HTTPException(status_code=500, detail=str(e))
