import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";

export async function POST(req: NextRequest) {
  try {
    // Connect to database first
    await connectDb();
    
    const { chatId, message } = await req.json();

    if (!chatId || !message) {
      return NextResponse.json(
        { error: "chatId and message are required" },
        { status: 400 }
      );
    }

    console.log("Saving message to chat:", chatId, "message:", message);

    const chat = await Chat.findById(chatId);
    if (!chat) {
      console.log("Chat not found:", chatId);
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    // Ensure message has proper ID and timestamp
    const messageToSave = {
      ...message,
      id: message.id || `msg-${Date.now()}`,
      timestamp: message.timestamp || new Date()
    };

    chat.messages.push(messageToSave);
    await chat.save();

    console.log("Message saved successfully. Total messages:", chat.messages.length);

    return NextResponse.json(chat);
  } catch (err: any) {
    console.error("Error saving message:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
