import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";
import mongoose from "mongoose";

// Real-time geocoding using Nominatim (OpenStreetMap)
async function geocodeLocation(location: string) {
  try {
    const encodedLocation = encodeURIComponent(location);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedLocation}&limit=1&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'GlobeSync-TravelApp/1.0'
        },
        timeout: 10000
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error(`Location "${location}" not found`);
    }

    const result = data[0];
    
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      address: result.display_name,
      city: result.address?.city || result.address?.town || result.address?.village || location,
      country: result.address?.country || 'Unknown'
    };
  } catch (error) {
    console.error(`Geocoding failed for "${location}":`, error);
    throw new Error(`Unable to find location: ${location}`);
  }
}

// Get real route from OSRM (Open Source Routing Machine)
async function getRouteFromOSRM(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, transportMode: string) {
  try {
    // Map transport modes to OSRM profiles
    const profileMapping: Record<string, string> = {
      "driving": "driving",
      "walking": "foot",
      "cycling": "bike",
      "transit": "driving" // Fallback to driving for transit
    };
    
    const profile = profileMapping[transportMode] || "driving";
    
    console.log(`🗺️ Requesting ${profile} route from OSRM:`, {
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`
    });
    
    // OSRM public API endpoint
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
    
    const params = new URLSearchParams({
      overview: "full",
      alternatives: "false",
      steps: "false",
      geometries: "geojson"
    });
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(`${osrmUrl}?${params}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GlobeSync-TravelApp/1.0'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`OSRM API responded with ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.code !== "Ok") {
      throw new Error(`OSRM error: ${data.message || data.code}`);
    }
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error("No routes found between these locations");
    }
    
    const route = data.routes[0];
    
    if (!route.geometry || !route.geometry.coordinates || route.geometry.coordinates.length < 2) {
      throw new Error("Invalid route geometry received");
    }
    
    console.log(`✅ OSRM route found: ${(route.distance / 1000).toFixed(1)}km, ${Math.round(route.duration / 60)}min`);
    
    return {
      geometry: route.geometry.coordinates,
      distance: route.distance / 1000, // Convert to km
      duration: route.duration, // In seconds
      found: true
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown routing error';
    console.error(`❌ OSRM routing failed:`, errorMessage);
    throw new Error(`Route not available: ${errorMessage}`);
  }
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

    console.log(`🗺️ Route request:`, { chatId, origin, destination, transportMode });

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

    const finalOrigin = origin || "Delhi, India";
    const finalDestination = destination || chat.basic_info?.city || "Mumbai, India";

    if (!finalOrigin || !finalDestination) {
      return NextResponse.json({ 
        error: "Both origin and destination are required" 
      }, { status: 400 });
    }

    // Step 1: Geocode both locations using real-time geocoding
    console.log(`📍 Geocoding locations: ${finalOrigin} -> ${finalDestination}`);
    
    const [originCoords, destCoords] = await Promise.all([
      geocodeLocation(finalOrigin),
      geocodeLocation(finalDestination)
    ]);

    console.log(`✅ Geocoding successful:`);
    console.log(`  Origin: ${originCoords.city} (${originCoords.lat}, ${originCoords.lng})`);
    console.log(`  Destination: ${destCoords.city} (${destCoords.lat}, ${destCoords.lng})`);

    // Step 2: Try to get route from backend first
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    let routeData;
    
    try {
      console.log(`🔍 Trying backend route service at ${backendUrl}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
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
          console.log("✅ Backend route service successful");
        } else {
          throw new Error(backendJson?.error || "Backend returned unsuccessful response");
        }
      } else {
        throw new Error(`Backend responded with status ${backendRes.status}`);
      }
    } catch (backendError: any) {
      console.log(`⚠️ Backend unavailable: ${backendError.message}`);
      
      // Step 3: Fallback to direct OSRM routing
      try {
        console.log(`🔄 Trying direct OSRM routing...`);
        const osrmRoute = await getRouteFromOSRM(originCoords, destCoords, transportMode);
        
        const timeText = osrmRoute.duration > 0
          ? osrmRoute.duration < 3600 
            ? `${Math.round(osrmRoute.duration / 60)} mins`
            : `${Math.floor(osrmRoute.duration / 3600)}h ${Math.round((osrmRoute.duration % 3600) / 60)}m`
          : "N/A";
        
        routeData = {
          origin: {
            lat: originCoords.lat,
            lng: originCoords.lng,
            city: originCoords.city,
            address: originCoords.address
          },
          destination: {
            lat: destCoords.lat,
            lng: destCoords.lng,
            city: destCoords.city,
            address: destCoords.address
          },
          distance: Math.round(osrmRoute.distance * 10) / 10,
          travel_time: timeText,
          transportation_mode: transportMode,
          route_geometry: osrmRoute.geometry,
          route_options: [{
            route_name: "Optimal Route",
            distance: osrmRoute.distance,
            duration: timeText,
            distance_text: `${Math.round(osrmRoute.distance * 10) / 10} km`
          }],
          route_type: "road"
        };
        
        console.log(`✅ Direct OSRM routing successful`);
      } catch (osrmError: any) {
        console.error(`❌ All routing methods failed:`, osrmError.message);
        
        // Return error - no fallback modes
        return NextResponse.json({ 
          success: false, 
          error: `Unable to find route between ${finalOrigin} and ${finalDestination}: ${osrmError.message}`,
          locations: {
            origin: originCoords,
            destination: destCoords
          }
        }, { status: 404 });
      }
    }

    // Save route data to chat
    chat.route_data = routeData;
    await chat.save();

    console.log(`✅ Route data saved successfully`);
    return NextResponse.json({ success: true, route_data: routeData });

  } catch (err: any) {
    console.error("❌ Error in /api/chat/map/route:", err);
    return NextResponse.json({ 
      success: false, 
      error: err.message || "Failed to process route request" 
    }, { status: 500 });
  }
}
