import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    // Connect to database first
    await connectDb();
    
    const { chatId } = await params;
    console.log("Fetching chat with ID:", chatId);

    if (!chatId) {
      console.log("No chatId provided");
      return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.log("Invalid ObjectId format:", chatId);
      return NextResponse.json({ error: "Invalid chat ID format" }, { status: 400 });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      console.log("Chat not found:", chatId);
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    console.log("Chat found with messages:", chat.messages.length);
    return NextResponse.json(chat);
  } catch (err: any) {
    console.error("Error fetching chat:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}