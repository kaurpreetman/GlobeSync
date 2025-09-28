# LangGraph Travel Planning Backend

A comprehensive travel planning system built with LangGraph, FastAPI, Google Gemini 2.5-flash, and multiple specialized AI agents.

## 🚀 Features

### Multi-Agent Architecture
- **Weather Agent**: Provides weather forecasts and travel recommendations
- **Maps Agent**: Handles route planning and location services using OpenStreetMap  
- **Events Agent**: Finds and recommends events and activities using web search
- **Budget Agent**: Optimizes budget allocation and finds cost-effective options
- **Itinerary Agent**: Creates comprehensive travel itineraries
- **Calendar Agent**: Automatically syncs travel itinerary to Google Calendar
- **Travel Orchestrator**: Coordinates all agents in a structured LangGraph workflow

### API Capabilities
- Asynchronous trip planning with real-time status updates
- RESTful API with comprehensive documentation
- Background task processing
- Trip status tracking and management
- Agent performance monitoring

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd lgforglobe
```

2. **Install dependencies**
```bash
pip install -e .
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. **Configure API Keys** (ALL REQUIRED - No Mock Data)
Edit the `.env` file with your API keys:

```bash
# Google Gemini API (AI/LLM)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenWeatherMap API (Weather Data)
WEATHER_API_KEY=your_openweathermap_api_key_here

# Maps are now powered by OpenStreetMap + Folium (no API key needed)
# Events are now discovered using DuckDuckGo search + Gemini AI processing
# No additional API keys needed for maps or events

# RapidAPI (Optional - for IRCTC train bookings in India)
RAPIDAPI_KEY=your_rapidapi_key_here

# Google Calendar Integration (Optional - enables automatic itinerary sync)
GOOGLE_CALENDAR_CREDENTIALS_PATH=credentials.json
GOOGLE_CALENDAR_TOKEN_PATH=token.json
```

**⚠️ Important**: This is a production-ready backend with NO mock data. Required API keys for the system to function.

**Where to get API keys:**
- **Gemini API**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **Weather API**: [OpenWeatherMap](https://openweathermap.org/api) (One Call API 3.0)
- **Maps**: Powered by OpenStreetMap + Folium/Leaflet (no API key needed)
- **Events**: Powered by DuckDuckGo web search + Gemini AI processing (no additional API key needed)
- **Trains**: IRCTC API via RapidAPI for India train bookings (optional - for India domestic travel)
- **Calendar**: Google Calendar integration (optional - requires OAuth2 setup)

## 🚀 Quick Start

### Start the API Server
```bash
python main.py
```

The API will be available at:
- **API**: http://localhost:8000
- **Documentation**: http://localhost:8000/docs
- **OpenAPI Schema**: http://localhost:8000/openapi.json

### Basic Usage

1. **Start a trip planning process**
```bash
curl -X POST "http://localhost:8000/api/v1/trips/plan" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "destination": "Paris, France",
    "start_date": "2025-06-01T00:00:00",
    "end_date": "2025-06-07T00:00:00",
    "budget": 2000.00,
    "preferences": {
      "accommodation_type": "hotel",
      "transport_options": ["flight"],
      "activity_types": ["sightseeing", "entertainment"]
    }
  }'
```

2. **Check trip status**
```bash
curl "http://localhost:8000/api/v1/trips/{trip_id}/status"
```

3. **Get trip results**
```bash
curl "http://localhost:8000/api/v1/trips/{trip_id}/result"
```

## � Google Calendar Integration (Optional)

The system can automatically sync your travel itinerary to Google Calendar, creating a dedicated calendar with all your planned activities, including reminders and location details.

### Setup Steps:

1. **Enable Google Calendar API**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Calendar API
   - Go to "Credentials" and create OAuth2 credentials for "Desktop Application"
   - Download the credentials file as `credentials.json`

2. **Configure the Application**
   ```bash
   # Place credentials.json in your project root
   cp ~/Downloads/credentials.json ./credentials.json
   ```

3. **First-Time Authentication**
   - The first time you use calendar integration, a browser window will open
   - Sign in with your Google account and grant calendar permissions
   - The authentication token will be saved for future use

4. **Calendar Features**
   - 📅 Creates a dedicated calendar for each trip
   - ⏰ Sets up email and popup reminders
   - 📍 Includes location details for each activity
   - 🔗 Provides shareable calendar links
   - 📱 Works with all Google Calendar apps

### Calendar API Endpoints:

- `POST /api/v1/trips/{trip_id}/calendar/sync` - Manually sync trip to calendar
- `GET /api/v1/trips/{trip_id}/calendar` - Get calendar integration info
- `GET /api/v1/calendar/setup` - Get setup instructions

## �📊 API Endpoints

### Trip Management
- `POST /api/v1/trips/plan` - Start new trip planning
- `GET /api/v1/trips/{trip_id}/status` - Get trip status
- `GET /api/v1/trips/{trip_id}/result` - Get trip results
- `GET /api/v1/trips` - List all trips
- `DELETE /api/v1/trips/{trip_id}` - Cancel trip planning

### Train Search (India)
- `POST /api/v1/trains/search` - Search trains between cities
- `GET /api/v1/trains/stations/{city}` - Get station code for city
- `GET /api/v1/trains/live/{station_code}` - Get live train information

### Calendar Integration
- `POST /api/v1/trips/{trip_id}/calendar/sync` - Manually sync trip to calendar
- `GET /api/v1/trips/{trip_id}/calendar` - Get calendar integration info
- `GET /api/v1/calendar/setup` - Get setup instructions

### System Information
- `GET /api/v1/agents` - List available agents
- `GET /api/v1/system/stats` - System statistics
- `GET /health` - Health check

## 🏗️ Architecture

### LangGraph Workflow
The system uses LangGraph to orchestrate a multi-agent workflow:

```
Trip Request → Weather Agent → Maps Agent → Events Agent → Budget Agent → Itinerary Agent → Trains Agent → Calendar Agent → Summary
```

Each agent processes the accumulated state and passes enriched data to the next agent.

### Agent Responsibilities

1. **Weather Agent**
   - Fetches weather forecasts
   - Provides weather-based recommendations
   - Suggests appropriate clothing and activities

2. **Maps Agent**
   - Plans optimal routes using OpenStreetMap data
   - Calculates travel times and distances
   - Creates interactive Folium/Leaflet maps
   - Suggests transport options

3. **Events Agent**
   - Discovers local events and activities using web search
   - Filters based on preferences and weather using AI processing
   - Provides event details and booking information

4. **Budget Agent**
   - Optimizes budget allocation
   - Finds cost-effective options
   - Provides money-saving recommendations

5. **Itinerary Agent**
   - Creates detailed day-by-day schedules
   - Optimizes activity sequencing
   - Considers travel times and logistics

6. **Calendar Agent**
   - Syncs itinerary to Google Calendar
   - Creates dedicated trip calendar
   - Sets up reminders and notifications
   - Enables calendar sharing with travel companions

### State Management
The system uses LangGraph's built-in state management with checkpointing for:
- Workflow persistence
- Error recovery
- Progress tracking
- State introspection

## 🔧 Configuration

### Environment Variables
- `GEMINI_API_KEY`: Google Gemini API key for LLM interactions
- `WEATHER_API_KEY`: Weather service API key
- `MAPS_API_KEY`: Maps service API key
- Events: Powered by DuckDuckGo search + Gemini AI (no API key needed)
- `DEBUG`: Enable debug mode (default: True)
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)

### Agent Configuration
- `TEMPERATURE`: LLM temperature setting (default: 0.7)
- `MAX_TOKENS`: Maximum tokens per LLM call (default: 1000)
- `MAX_ITERATIONS`: Maximum workflow iterations (default: 10)
- `TIMEOUT`: Workflow timeout in seconds (default: 300)

## 🚦 Development

### Project Structure
```
lgforglobe/
├── main.py           # Application entry point
├── api.py            # FastAPI application and routes
├── orchestrator.py   # LangGraph workflow orchestration
├── agents.py         # Individual agent implementations
├── tools.py          # External API integrations
├── models.py         # Pydantic data models
├── config.py         # Configuration management
├── pyproject.toml    # Project dependencies
└── .env.example      # Environment variables template
```

### Adding New Agents
1. Create agent class inheriting from `BaseAgent`
2. Implement the `process` method
3. Add agent to orchestrator workflow
4. Update API documentation

### Extending Tools
1. Add new tool class in `tools.py`
2. Implement required API integrations
3. Update agent implementations to use new tools
4. Add configuration for new APIs

## 🔍 Monitoring

### System Statistics
The API provides comprehensive monitoring:
- Active trip count
- Completion rates
- Error tracking
- Performance metrics

### Logging
All agent interactions and workflow steps are logged for debugging and monitoring.

## 🚨 Error Handling

The system includes robust error handling:
- Agent-level error recovery
- Workflow continuation on partial failures
- Detailed error reporting
- Graceful degradation

## 🔒 Security Considerations

- API key management through environment variables
- Input validation with Pydantic models
- CORS configuration for cross-origin requests
- Rate limiting (recommended for production)

## 📈 Performance

### Optimization Features
- Asynchronous processing
- Background task management
- Memory-efficient state handling
- Configurable timeouts

### Scalability
- Stateless agent design
- Horizontal scaling support
- Database integration ready
- Caching layer support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the API documentation at `/docs`
2. Review the agent logs
3. Ensure all API keys are configured
4. Check system status at `/api/v1/system/stats`
