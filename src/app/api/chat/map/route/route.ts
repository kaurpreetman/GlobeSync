import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";
import mongoose from "mongoose";

// Mock geocoding function to get coordinates for cities
function getMockCoordinates(city: string) {
  const cityCoords: Record<string, { lat: number; lng: number; address: string }> = {
    "delhi": { lat: 28.6139, lng: 77.2090, address: "Delhi, India" },
    "mumbai": { lat: 19.0760, lng: 72.8777, address: "Mumbai, India" },
    "bangalore": { lat: 12.9716, lng: 77.5946, address: "Bangalore, India" },
    "chennai": { lat: 13.0827, lng: 80.2707, address: "Chennai, India" },
    "kolkata": { lat: 22.5726, lng: 88.3639, address: "Kolkata, India" },
    "hyderabad": { lat: 17.3850, lng: 78.4867, address: "Hyderabad, India" },
    "pune": { lat: 18.5204, lng: 73.8567, address: "Pune, India" },
    "jaipur": { lat: 26.9124, lng: 75.7873, address: "Jaipur, India" },
    "meerut": { lat: 28.9845, lng: 77.7064, address: "Meerut, India" },
    "paris": { lat: 48.8566, lng: 2.3522, address: "Paris, France" },
    "london": { lat: 51.5074, lng: -0.1278, address: "London, UK" },
    "new york": { lat: 40.7128, lng: -74.0060, address: "New York, USA" },
    "tokyo": { lat: 35.6762, lng: 139.6503, address: "Tokyo, Japan" },
    "rome": { lat: 41.9028, lng: 12.4964, address: "Rome, Italy" },
    "barcelona": { lat: 41.3851, lng: 2.1734, address: "Barcelona, Spain" },
  };

  const normalizedCity = city.toLowerCase().replace(/,.*/, '').trim();
  return cityCoords[normalizedCity] || { lat: 0, lng: 0, address: city };
}

// Generate mock route geometry (curved path between two points)
function generateMockRouteGeometry(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  const points = [];
  const steps = 20; // Number of points in the route
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    
    // Linear interpolation with some curve
    const lat = origin.lat + (destination.lat - origin.lat) * t;
    let lng = origin.lng + (destination.lng - origin.lng) * t;
    
    // Add some curve to make it look more realistic
    const curve = Math.sin(t * Math.PI) * 0.5;
    lng += curve;
    
    points.push([lng, lat]); // GeoJSON format: [longitude, latitude]
  }
  
  return points;
}

function calculateDistance(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) {
  const R = 6371; // Earth's radius in km
  const dLat = (destination.lat - origin.lat) * Math.PI / 180;
  const dLng = (destination.lng - origin.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const { chatId, origin, destination, transportMode = "driving" } = await req.json();

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return NextResponse.json({ error: "Invalid chatId" }, { status: 400 });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const finalOrigin = origin || "Delhi, India";
    const finalDestination = destination || chat.basic_info?.city || "Mumbai, India";

    console.log(`🗺️ Getting route from ${finalOrigin} to ${finalDestination}`);

    let routeData;
    
    try {
      // Try to fetch from backend first (with shorter timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const backendRes = await fetch(`${backendUrl}/maps/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: finalOrigin,
          destination: finalDestination,
          transport_mode: transportMode,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (backendRes.ok) {
        const backendJson = await backendRes.json();
        if (backendJson?.success) {
          routeData = backendJson.route_data;
          console.log("✅ Using real backend route data");
        } else {
          throw new Error(backendJson?.error || "Backend returned unsuccessful response");
        }
      } else {
        throw new Error(`Backend responded with status ${backendRes.status}`);
      }
    } catch (backendError: any) {
      console.log(`⚠️ Backend unavailable (${backendError.message}), using mock data`);
      
      // Generate mock route data
      const originCoords = getMockCoordinates(finalOrigin);
      const destCoords = getMockCoordinates(finalDestination);
      const distance = calculateDistance(originCoords, destCoords);
      const routeGeometry = generateMockRouteGeometry(originCoords, destCoords);
      
      // Estimate travel time based on distance and transport mode
      const speedMap = { driving: 60, walking: 5, cycling: 15, transit: 40 };
      const speed = speedMap[transportMode as keyof typeof speedMap] || 60;
      const timeHours = distance / speed;
      const timeText = timeHours < 1 ? `${Math.round(timeHours * 60)} mins` : `${Math.floor(timeHours)}h ${Math.round((timeHours % 1) * 60)}m`;
      
      routeData = {
        origin: {
          lat: originCoords.lat,
          lng: originCoords.lng,
          city: finalOrigin,
          address: originCoords.address
        },
        destination: {
          lat: destCoords.lat,
          lng: destCoords.lng,
          city: finalDestination,
          address: destCoords.address
        },
        distance: Math.round(distance * 10) / 10,
        travel_time: timeText,
        transportation_mode: transportMode,
        route_geometry: routeGeometry,
        route_options: [{
          route_name: "Main Route",
          distance: distance,
          duration: timeText,
          distance_text: `${Math.round(distance * 10) / 10} km`
        }],
        mock_data: true // Flag to indicate this is mock data
      };
      
      console.log("🎭 Using mock route data with curved geometry");
    }

    // Save route data to chat
    chat.route_data = routeData;
    await chat.save();

    return NextResponse.json({ success: true, route_data: routeData });

  } catch (err: any) {
    console.error("Error in /api/chat/map/route:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
