# 🚀 Full-Stack Deployment Configuration

## 📦 Project Structure for Production
```
travel-planner/
├── backend/                 # FastAPI backend
│   ├── tools.py
│   ├── agents.py
│   ├── orchestrator.py
│   ├── api.py
│   ├── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
├── frontend/               # React/Next.js frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── Dockerfile
│   └── .env.local
├── docker-compose.yml      # Multi-container setup
└── deploy/                # Deployment scripts
    ├── nginx.conf
    ├── deploy.sh
    └── k8s/               # Kubernetes configs
```

## 🐳 Docker Configuration

### Backend Dockerfile
```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - WEATHER_API_KEY=${WEATHER_API_KEY}
      - RAPIDAPI_KEY=${RAPIDAPI_KEY}
      - AMADEUS_CLIENT_ID=${AMADEUS_CLIENT_ID}
      - AMADEUS_CLIENT_SECRET=${AMADEUS_CLIENT_SECRET}
    volumes:
      - ./backend:/app
    restart: unless-stopped
    networks:
      - travel-network

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://backend:8000
    depends_on:
      - backend
    restart: unless-stopped
    networks:
      - travel-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/nginx.conf:/etc/nginx/nginx.conf
      - ./deploy/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - travel-network

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - travel-network

networks:
  travel-network:
    driver: bridge
```

## 🌐 Nginx Configuration
```nginx
# deploy/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:8000;
    }

    server {
        listen 80;
        server_name yourdomain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Frontend routes
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # API routes
        location /api/ {
            proxy_pass http://backend/;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # CORS headers
            add_header Access-Control-Allow-Origin *;
            add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization";
        }

        # Static files caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## ☁️ Cloud Deployment Options

### 1. AWS Deployment
```bash
# deploy/aws-deploy.sh
#!/bin/bash

# Build and push Docker images to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Build images
docker build -t travel-planner-backend ./backend
docker build -t travel-planner-frontend ./frontend

# Tag images
docker tag travel-planner-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/travel-planner-backend:latest
docker tag travel-planner-frontend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/travel-planner-frontend:latest

# Push images
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/travel-planner-backend:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/travel-planner-frontend:latest

# Deploy to ECS or EKS
aws ecs update-service --cluster travel-planner --service backend --force-new-deployment
aws ecs update-service --cluster travel-planner --service frontend --force-new-deployment
```

### 2. Vercel + Railway Deployment
```bash
# Frontend to Vercel
cd frontend
npm install -g vercel
vercel --prod

# Backend to Railway
cd backend
git init
git add .
git commit -m "Initial commit"
# Connect to Railway and deploy
```

### 3. DigitalOcean App Platform
```yaml
# .do/app.yaml
name: travel-planner
services:
- name: backend
  source_dir: /backend
  github:
    repo: your-username/travel-planner
    branch: main
  run_command: uvicorn main:app --host 0.0.0.0 --port 8080
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  routes:
  - path: /api
  envs:
  - key: GEMINI_API_KEY
    value: ${GEMINI_API_KEY}
  - key: WEATHER_API_KEY
    value: ${WEATHER_API_KEY}

- name: frontend
  source_dir: /frontend
  github:
    repo: your-username/travel-planner
    branch: main
  build_command: npm run build
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  routes:
  - path: /
  envs:
  - key: NEXT_PUBLIC_API_BASE_URL
    value: ${backend.PUBLIC_URL}/api
```

## 🚀 Quick Deployment Commands

### Local Development
```bash
# Start full stack locally
docker-compose up -d

# Or start services individually
cd backend && uvicorn main:app --reload --port 8000
cd frontend && npm run dev
```

### Production Deployment
```bash
# Build for production
docker-compose -f docker-compose.prod.yml build

# Deploy to cloud
./deploy/deploy.sh production

# Health check
curl https://yourdomain.com/api/health
curl https://yourdomain.com
```

## 📊 Monitoring & Logging

### Health Check Endpoints
```python
# Add to main.py
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

@app.get("/api/status")
async def api_status():
    return {
        "database": "connected",
        "external_apis": {
            "gemini": "active",
            "weather": "active",
            "flights": "active"
        }
    }
```

### Logging Configuration
```python
# Add to main.py
import logging
from fastapi import Request
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    logger.info(
        f"{request.method} {request.url.path} - "
        f"Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    
    return response
```

## 🔒 Security & Environment Variables

### Backend .env
```env
# API Keys
GEMINI_API_KEY=your_gemini_key
WEATHER_API_KEY=your_openweather_key
RAPIDAPI_KEY=your_rapidapi_key
AMADEUS_CLIENT_ID=your_amadeus_id
AMADEUS_CLIENT_SECRET=your_amadeus_secret

# Google Calendar
GOOGLE_CALENDAR_CREDENTIALS_PATH=credentials.json
GOOGLE_CALENDAR_TOKEN_PATH=token.pickle

# Database
DATABASE_URL=postgresql://user:pass@localhost/travel_db

# Security
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend .env.local
```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_key
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

## 📈 Performance Optimization

### Caching Strategy
```python
# Add Redis caching
import redis
from functools import wraps

redis_client = redis.Redis(host='redis', port=6379, db=0)

def cache_result(expire_time=300):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_result = redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)
            
            # Calculate and cache result
            result = await func(*args, **kwargs)
            redis_client.setex(cache_key, expire_time, json.dumps(result))
            
            return result
        return wrapper
    return decorator

# Usage
@cache_result(expire_time=600)  # Cache for 10 minutes
async def get_weather_forecast(location, start_date, end_date):
    # Expensive API call
    pass
```

This deployment configuration provides a production-ready setup for your travel planning application! 🌟