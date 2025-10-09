"""
Fix Google Calendar OAuth Scope Issues
This script clears cached tokens and helps resolve scope conflicts
"""
import os
import shutil

def clear_tokens():
    """Remove all cached calendar tokens"""
    tokens_dir = "tokens"
    
    if os.path.exists(tokens_dir):
        try:
            shutil.rmtree(tokens_dir)
            print("✅ Removed tokens directory")
        except Exception as e:
            print(f"❌ Error removing tokens: {e}")
    
    # Recreate empty directory
    os.makedirs(tokens_dir, exist_ok=True)
    print("✅ Created fresh tokens directory")

def clear_token_json():
    """Remove token.json if it exists"""
    if os.path.exists("token.json"):
        try:
            os.remove("token.json")
            print("✅ Removed token.json")
        except Exception as e:
            print(f"❌ Error removing token.json: {e}")

def main():
    print("🔧 Google Calendar OAuth Scope Fix Tool\n")
    print("=" * 60)
    
    print("\n1️⃣  Clearing cached tokens...")
    clear_tokens()
    
    print("\n2️⃣  Clearing token.json...")
    clear_token_json()
    
    print("\n" + "=" * 60)
    print("✅ Done! Tokens cleared.\n")
    print("📋 Next Steps:")
    print("   1. Restart your backend server")
    print("   2. Go to http://localhost:3000")
    print("   3. Click 'Connect Calendar' again")
    print("   4. You'll be prompted to re-authorize with correct scopes\n")
    print("💡 Tip: If you still see scope errors:")
    print("   - Check your credentials.json is for a Web Application")
    print("   - Verify redirect URI is: http://localhost:8000/api/calendar/oauth2callback")
    print("   - Make sure OAuth consent screen scopes include only Calendar API")
    print("=" * 60)

if __name__ == "__main__":
    main()
