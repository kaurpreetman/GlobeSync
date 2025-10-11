# Integration Test Guide

## Backend Setup
1. Start the Python backend:
   ```bash
   cd backend/GlobeSync
   python main.py
   ```
   Backend should run on `http://localhost:8000`

## Frontend Setup
1. Start the Next.js frontend:
   ```bash
   cd frontend/GlobeSync
   npm run dev
   ```
   Frontend should run on `http://localhost:3000`

## Test Flow

### 1. Explore Page
- Navigate to `/explore`
- Fill out the trip planning form:
  - Destination City: "Paris"
  - Trip Duration: "5"
  - Month: "June"
  - Type: "Couple"
  - Budget: "Mid"
- Click "Start Planning"
- Should redirect to `/dashboard?sessionId=<id>`

### 2. Dashboard Page
- Should load with the chat interface
- Should show welcome message from AI
- Should display suggested response buttons
- Map should be visible on the left side

### 3. Chat Interface
- Type a message like "What's the weather like in Paris?"
- Should show typing indicator
- Should receive AI response with weather data
- Should show suggested follow-up questions

### 4. WebSocket Connection
- Check browser console for "WebSocket connected" message
- Messages should be sent and received in real-time
- No 404 errors for `/api/chat/initialize`

## Expected API Endpoints

### Frontend APIs (Next.js)
- `POST /api/chat/initialize` - Initialize new chat session
- `GET /api/chat/[chatId]` - Get chat by ID
- `POST /api/chat/message` - Save message to chat
- `POST /api/chat/map` - Update map center

### Backend APIs (FastAPI)
- `POST /trip/initialize` - Initialize trip planning
- `WebSocket /chat/{user_id}` - Real-time chat
- `GET /trip/context/{user_id}` - Get trip context

## Troubleshooting

### Common Issues
1. **404 on /api/chat/initialize**: Check if the route file exists
2. **WebSocket connection failed**: Ensure backend is running on port 8000
3. **CORS errors**: Backend should allow frontend origin
4. **Database connection**: Ensure MongoDB is running and connected

### Debug Steps
1. Check browser Network tab for failed requests
2. Check browser Console for WebSocket errors
3. Check backend logs for processing errors
4. Verify all environment variables are set
