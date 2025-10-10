import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";
import mongoose from "mongoose";

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

    const backendRes = await fetch(`${backendUrl}/maps/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: origin || "Delhi, India",
        destination: destination || chat.basic_info?.city || "Mumbai, India",
        transport_mode: transportMode,
      }),
    });

    // Check backend response
    if (!backendRes.ok) {
      const text = await backendRes.text();
      console.error("Backend maps/route failed:", backendRes.status, text);
      return NextResponse.json({ success: false, error: `Backend failed: ${backendRes.status}` }, { status: 502 });
    }

    const backendJson = await backendRes.json();

    if (!backendJson?.success) {
      console.error("Backend returned error:", backendJson?.error);
      return NextResponse.json({ success: false, error: backendJson?.error }, { status: 500 });
    }

    chat.route_data = backendJson.route_data;
    await chat.save();

    return NextResponse.json({ success: true, route_data: chat.route_data });

  } catch (err: any) {
    console.error("Error in /api/chat/map/route:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
