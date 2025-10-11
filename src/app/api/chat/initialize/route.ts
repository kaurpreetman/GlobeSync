import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";
import { getCityCoordinates } from "@/lib/geocoding";

export async function POST(req: NextRequest) {
  try {
    // Connect to database first
    await connectDb();
    
    const { userId, basic_info } = await req.json();

    if (!userId || !basic_info) {
      return NextResponse.json(
        { error: "userId and basic_info are required" },
        { status: 400 }
      );
    }

    console.log("Creating chat for user:", userId, "with basic_info:", basic_info);

    // Get coordinates for the destination city
    const coordinates = await getCityCoordinates(basic_info.city);
    const mapCenter = coordinates ? [coordinates.lat, coordinates.lng] : [0, 0];
    
    console.log(`Coordinates for ${basic_info.city}:`, coordinates);

    // Create a new chat session in MongoDB with userId as string (for OAuth compatibility)
    const chat = await Chat.create({
      user: userId,  // Use string directly - no ObjectId conversion
      title: `Trip to ${basic_info.city}`,
      basic_info: basic_info,
      messages: [],
      map_center: mapCenter,
    });

    console.log("Chat created with ID:", chat._id);

    // For now, let's test without backend call
    const backendData = {
      welcome_message: `🌍 Fantastic! Let's plan your ${basic_info.duration}-day trip to ${basic_info.city}!

I'm your AI travel assistant powered by real-time data. I can help you with:

• ☀️ Weather forecasts and packing advice
• ✈️ Flight search and pricing  
• 🚂 Train options (especially for India)
• 🎉 Local events and activities
• 🏨 Accommodation recommendations
• 🗺️ Route planning and directions

What would you like to know first about your trip to ${basic_info.city}?`,
      suggested_responses: [
        `What's the weather like in ${basic_info.city}?`,
        `Find flights to ${basic_info.city}`,
        `What events are happening in ${basic_info.city}?`,
        `Recommend accommodations in ${basic_info.city}`,
        "Help me plan day by day",
        "What should I know about this destination?"
      ],
      phase: "conversation_started"
    };
    console.log("Using mock backend response:", backendData);

    // Add system message first, then welcome message
    const systemMessage = {
      id: `system-${Date.now()}`,
      role: "system" as const,
      content: `Trip Planning Session Started - Destination: ${basic_info.city}, Duration: ${basic_info.duration} days, Month: ${basic_info.month}, Type: ${basic_info.tripType}, Budget: ${basic_info.budget}`,
      timestamp: new Date(),
    };

    const welcomeMessage = {
      id: `welcome-${Date.now()}`,
      role: "assistant" as const,
      content: backendData.welcome_message,
      timestamp: new Date(),
      suggested_responses: backendData.suggested_responses || []
    };

    chat.messages.push(systemMessage, welcomeMessage);
    
    console.log("Messages to be saved:", chat.messages);
    
    await chat.save();
    console.log("Chat saved successfully with messages:", chat.messages.length);

    return NextResponse.json({
      sessionId: chat._id,
      welcome_message: backendData.welcome_message,
      suggested_responses: backendData.suggested_responses,
      phase: backendData.phase,
    });
  } catch (err: any) {
    console.error("Error initializing chat:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
