"""
Google Calendar Authentication Setup Script
This script helps you authenticate with Google Calendar API using OAuth2.
"""

import json
import os
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/calendar']

def setup_google_calendar_auth():
    """Set up Google Calendar authentication"""
    
    print("🔧 Setting up Google Calendar Authentication...")
    print("=" * 50)
    
    # Check if credentials.json exists
    credentials_path = Path("credentials.json")
    if not credentials_path.exists():
        print("❌ Error: credentials.json not found!")
        print("   Please download your OAuth2 credentials from Google Cloud Console")
        print("   and save them as 'credentials.json' in this directory.")
        return False
    
    print(f"✅ Found credentials file: {credentials_path}")
    
    # Load credentials
    try:
        with open(credentials_path) as f:
            cred_data = json.load(f)
            
        # Check credential type
        if "web" in cred_data:
            print("⚠️  WARNING: You have 'web' application credentials.")
            print("   For backend services, 'desktop' application credentials work better.")
            print("   Your current setup will still work, but you may need to modify the redirect URI.")
            print()
            
            # Modify for desktop use
            cred_data["installed"] = cred_data.pop("web") 
            cred_data["installed"]["redirect_uris"] = ["urn:ietf:wg:oauth:2.0:oob", "http://localhost"]
            
            # Save modified credentials
            with open(credentials_path, 'w') as f:
                json.dump(cred_data, f, indent=2)
            
            print("✅ Modified credentials for desktop application use.")
            
        elif "installed" in cred_data:
            print("✅ Desktop application credentials detected - perfect!")
            client_info = cred_data['installed']
            client_id = client_info.get('client_id', 'Unknown')
            project_id = client_info.get('project_id', 'Unknown')
            print(f"   Client ID: {client_id[:20]}...")
            print(f"   Project ID: {project_id}")
            
        else:
            print("❌ Unknown credentials format!")
            return False
            
    except Exception as e:
        print(f"❌ Error reading credentials: {e}")
        return False
    
    creds = None
    token_path = Path("token.json")
    
    # The file token.json stores the user's access and refresh tokens.
    if token_path.exists():
        try:
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)
            print("✅ Found existing authentication token.")
        except Exception as e:
            print(f"⚠️  Existing token is invalid: {e}")
            if token_path.exists():
                token_path.unlink()
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                print("🔄 Refreshing expired token...")
                creds.refresh(Request())
                print("✅ Token refreshed successfully.")
            except Exception as e:
                print(f"❌ Failed to refresh token: {e}")
                creds = None
        
        if not creds:
            print("🌐 Opening browser for Google Calendar authentication...")
            print("   Please complete the authentication in your browser.")
            
            try:
                flow = InstalledAppFlow.from_client_secrets_file(
                    credentials_path, SCOPES)
                creds = flow.run_local_server(port=0)
                print("✅ Authentication completed successfully!")
            except Exception as e:
                print(f"❌ Authentication failed: {e}")
                print("\n🔧 Troubleshooting:")
                print("1. Make sure you've enabled the Google Calendar API in Google Cloud Console")
                print("2. Add http://localhost:8080 to your OAuth2 redirect URIs")
                print("3. Make sure your credentials.json is from a Desktop Application")
                return False
        
        # Save the credentials for the next run
        try:
            with open(token_path, 'w') as token:
                token.write(creds.to_json())
            print(f"✅ Saved authentication token to {token_path}")
        except Exception as e:
            print(f"⚠️  Could not save token: {e}")
    
    # Test the API connection
    try:
        print("🧪 Testing Google Calendar API connection...")
        service = build('calendar', 'v3', credentials=creds)
        
        # Get the user's calendar list
        calendars_result = service.calendarList().list().execute()
        calendars = calendars_result.get('items', [])
        
        print(f"✅ Successfully connected to Google Calendar!")
        print(f"   Found {len(calendars)} calendar(s):")
        
        for calendar in calendars[:5]:  # Show first 5 calendars
            name = calendar.get('summary', 'Unknown')
            calendar_id = calendar.get('id', 'Unknown')
            primary = " (Primary)" if calendar.get('primary') else ""
            print(f"   - {name}{primary}")
            
        if len(calendars) > 5:
            print(f"   ... and {len(calendars) - 5} more calendars")
            
        return True
        
    except Exception as e:
        print(f"❌ Failed to connect to Google Calendar API: {e}")
        print("\n🔧 Troubleshooting:")
        print("1. Make sure Google Calendar API is enabled in Google Cloud Console")
        print("2. Check that your project has the correct permissions")
        print("3. Verify your credentials.json is valid")
        return False

def main():
    """Main function to run the setup"""
    
    print("📅 Google Calendar Setup for LangGraph Travel Planning")
    print("=" * 55)
    print()
    
    # Change to the script directory
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    success = setup_google_calendar_auth()
    
    print()
    print("=" * 55)
    if success:
        print("🎉 Google Calendar authentication setup complete!")
        print()
        print("✅ What's working:")
        print("   - OAuth2 credentials configured")
        print("   - Authentication token saved")
        print("   - Google Calendar API connection verified")
        print()
        print("🚀 Next steps:")
        print("   1. Run: python validate_apis.py (to test all APIs)")
        print("   2. Run: python main.py (to start your travel planning server)")
        print()
        print("📝 Your calendar integration is now ready!")
        print("   The travel planning system will automatically sync itineraries to your Google Calendar.")
        
    else:
        print("❌ Google Calendar authentication setup failed!")
        print()
        print("🔧 Manual setup steps:")
        print("   1. Go to: https://console.cloud.google.com/")
        print("   2. Create a new project or select existing one")
        print("   3. Enable Google Calendar API")
        print("   4. Go to Credentials → Create Credentials → OAuth 2.0 Client IDs")
        print("   5. Choose 'Desktop Application' type")
        print("   6. Download credentials.json and place it in your project folder")
        print("   7. Run this script again")
        
        print()
        print("📚 Documentation:")
        print("   https://developers.google.com/calendar/api/quickstart/python")

if __name__ == "__main__":
    main()