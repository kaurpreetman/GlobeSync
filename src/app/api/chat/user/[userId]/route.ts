import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";

connectDb();

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDb();
    
    const { userId } = await params;
    console.log("Fetching chats for user ID:", userId);
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }
    
    // Find all chats for the user
    const chats = await Chat.find({ user: userId })
      .sort({ updatedAt: -1 })
      .lean(); // Use lean() for better performance
    
    console.log(`Found ${chats.length} chats for user ${userId}`);
    
    // Log some details about the chats
    chats.forEach((chat, index) => {
      console.log(`Chat ${index + 1}:`, {
        id: chat._id,
        title: chat.title,
        basic_info: chat.basic_info,
        messages_count: chat.messages?.length || 0,
        created: chat.createdAt
      });
    });
    
    return NextResponse.json(chats);
  } catch (err: any) {
    console.error("Error fetching user chats:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
