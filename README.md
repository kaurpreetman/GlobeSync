# 🌍 GlobeSync - AI-Powered Travel Planning Platform

GlobeSync is a comprehensive travel planning platform that combines the power of artificial intelligence with modern web technologies to create personalized, intelligent travel itineraries. The platform features a multi-agent AI backend powered by LangGraph and Google Gemini, paired with a sleek Next.js frontend for seamless user experience.

## ✨ Features

### 🤖 AI-Powered Planning
- **Multi-Agent Architecture**: Specialized AI agents for different aspects of travel planning
- **Weather Agent**: Real-time weather forecasts and travel recommendations
- **Maps Agent**: Route optimization using OpenStreetMap data
- **Events Agent**: Local event discovery using intelligent web search
- **Budget Agent**: Cost optimization and money-saving recommendations
- **Itinerary Agent**: Day-by-day schedule creation
- **Calendar Agent**: Automatic Google Calendar synchronization

### 🎯 Smart Features
- **City Comparison**: Compare two destinations with real-time data
- **Budget Analysis**: Detailed cost breakdown and optimization
- **Weather Integration**: Weather-based activity suggestions
- **Calendar Sync**: Automatic itinerary sync with Google Calendar
- **Interactive Maps**: Folium-powered route visualization
- **Real-time Updates**: Live travel information and updates

### 🎨 Modern Frontend
- **Next.js 15**: Latest React framework with App Router
- **TypeScript**: Full type safety and developer experience
- **Tailwind CSS**: Modern, responsive design system
- **Radix UI**: Accessible, customizable UI components
- **NextAuth.js**: Secure authentication system
- **MongoDB**: User data and session management

## 🏗️ Architecture

```
GlobeSync/
├── backend/GlobeSync/          # Python FastAPI backend
│   ├── agents.py               # AI agent implementations
│   ├── orchestrator.py         # LangGraph workflow orchestration
│   ├── api.py                  # FastAPI routes and endpoints
│   ├── tools.py                # External API integrations
│   ├── models.py               # Pydantic data models
│   ├── config.py               # Configuration management
│   └── main.py                 # Application entry point
├── frontend/GlobeSync/         # Next.js frontend
│   ├── src/app/                # App Router pages
│   ├── src/components/         # Reusable components
│   ├── src/lib/                # Utility functions
│   ├── src/services/           # API service layers
│   └── src/types/              # TypeScript definitions
└── node_modules/               # Shared dependencies
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/globesync.git
cd globesync
```

### 2. Backend Setup
```bash
cd backend/GlobeSync

# Install Python dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Edit .env with your API keys (see Configuration section)
# Required: GEMINI_API_KEY, WEATHER_API_KEY
```

### 3. Frontend Setup
```bash
cd ../../frontend/GlobeSync

# Install Node.js dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Configure your environment variables
```

### 4. Start Development Servers

**Backend (Terminal 1):**
```bash
cd backend/GlobeSync
python main.py
```
Backend will be available at: http://localhost:8000

**Frontend (Terminal 2):**
```bash
cd frontend/GlobeSync
npm run dev
```
Frontend will be available at: http://localhost:3000

## 🔧 Configuration

### Required API Keys

#### Backend (.env)
```bash
# Google Gemini API (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenWeatherMap API (Required)
WEATHER_API_KEY=your_openweathermap_api_key_here

# Optional APIs
RAPIDAPI_KEY=your_rapidapi_key_here  # For train bookings in India
GOOGLE_CALENDAR_CREDENTIALS_PATH=credentials.json
GOOGLE_CALENDAR_TOKEN_PATH=token.json

# Server Configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

#### Frontend (.env.local)
```bash
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# MongoDB (for user sessions and data)
MONGODB_URI=your-mongodb-connection-string

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Where to Get API Keys

| Service | Purpose | Link |
|---------|---------|------|
| Google Gemini | AI/LLM Processing | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| OpenWeatherMap | Weather Data | [OpenWeatherMap API](https://openweathermap.org/api) |
| MongoDB | Database | [MongoDB Atlas](https://cloud.mongodb.com/) |
| Google Calendar | Calendar Integration | [Google Cloud Console](https://console.cloud.google.com/) |

## 📱 Usage

### 1. Plan a Trip
- Visit the homepage and click "Start Planning"
- Enter your destination, dates, and budget
- Let the AI agents create your personalized itinerary
- Review weather forecasts, activities, and recommendations

### 2. Compare Cities
- Use the "Compare Cities" feature on the homepage
- Enter two destinations to compare
- Get real-time weather, flight, and budget comparisons
- Make informed decisions about your travel destination

### 3. Calendar Integration
- Connect your Google Calendar in the settings
- Automatically sync your travel itinerary
- Receive reminders and updates
- Share your calendar with travel companions

## 🛠️ Development

### Backend Development
```bash
cd backend/GlobeSync

# Run with auto-reload
python main.py

# Run tests
pytest

# API Documentation
# Visit: http://localhost:8000/docs
```

### Frontend Development
```bash
cd frontend/GlobeSync

# Development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🚀 Deployment

### Backend Deployment
- Deploy to platforms like Railway, Heroku, or AWS
- Set environment variables in your deployment platform
- Ensure all API keys are properly configured

### Frontend Deployment
- Deploy to Vercel, Netlify, or similar platforms
- Configure environment variables
- Set up domain and SSL certificates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 API Documentation

### Backend API Endpoints

#### Trip Management
- `POST /api/v1/trips/plan` - Start new trip planning
- `GET /api/v1/trips/{trip_id}/status` - Get trip status
- `GET /api/v1/trips/{trip_id}/result` - Get trip results
- `GET /api/v1/trips` - List all trips
- `DELETE /api/v1/trips/{trip_id}` - Cancel trip planning

#### Calendar Integration
- `POST /api/v1/trips/{trip_id}/calendar/sync` - Sync trip to calendar
- `GET /api/v1/trips/{trip_id}/calendar` - Get calendar info
- `GET /api/v1/calendar/setup` - Setup instructions

#### System Information
- `GET /api/v1/agents` - List available agents
- `GET /api/v1/system/stats` - System statistics
- `GET /health` - Health check

Full API documentation available at: http://localhost:8000/docs

## 🛡️ Security

- API keys stored securely in environment variables
- Input validation with Pydantic models
- CORS configuration for cross-origin requests
- Secure authentication with NextAuth.js
- MongoDB for secure user data storage

## 📊 Technology Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **LangGraph** - Multi-agent workflow orchestration
- **Google Gemini 2.5-flash** - Advanced AI language model
- **OpenWeatherMap** - Weather data API
- **OpenStreetMap + Folium** - Mapping and route optimization
- **Google Calendar API** - Calendar integration
- **Pydantic** - Data validation and settings management

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component library
- **NextAuth.js** - Authentication system
- **TanStack Query** - Data fetching and caching
- **Framer Motion** - Animation library
- **React Hook Form** - Form management

### Infrastructure
- **MongoDB** - NoSQL database
- **Axios** - HTTP client
- **Leaflet** - Interactive maps
- **Day.js** - Date manipulation



---

**GlobeSync** - Making travel planning intelligent, comprehensive, and effortless. 🌍✈️🤖
