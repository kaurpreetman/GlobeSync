import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Chat from "@/lib/models/Chat";
import User from "@/lib/models/User";
import mongoose from "mongoose";

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const userId = url.searchParams.get('userId');
    
    if (action === 'check') {
      // Check database contents
      const users = await User.find({}, 'name email').lean();
      const chats = await Chat.find({}).lean(); // Removed populate since user is now a string
      
      return NextResponse.json({
        users_count: users.length,
        chats_count: chats.length,
        users: users.map(u => ({ id: u._id, name: u.name, email: u.email })),
        chats: chats.map(c => ({
          id: c._id,
          user: c.user, // This is now a string (OAuth user ID)
          title: c.title,
          basic_info: c.basic_info,
          messages_count: c.messages?.length || 0,
          created: c.createdAt
        }))
      });
    }
    
    if (action === 'create' && userId) {
      // Create test trips for user
      const testTrips = [
        {
          user: userId,
          title: "Trip to Paris",
          basic_info: {
            origin: "Meerut",
            city: "Paris",
            duration: "7",
            month: "June",
            tripType: "Couple",
            budget: "High"
          },
          messages: [
            {
              role: "system",
              content: "Welcome to your trip planning for Paris!",
              timestamp: new Date()
            }
          ]
        },
        {
          user: userId,
          title: "Delhi to Mumbai",
          basic_info: {
            origin: "Delhi",
            city: "Mumbai", 
            duration: "3",
            month: "March",
            tripType: "Business",
            budget: "Mid"
          },
          messages: [
            {
              role: "system", 
              content: "Planning your business trip to Mumbai",
              timestamp: new Date()
            }
          ]
        }
      ];
      
      const createdTrips = await Chat.insertMany(testTrips);
      
      return NextResponse.json({
        message: "Test trips created",
        count: createdTrips.length,
        trips: createdTrips.map(t => ({ id: t._id, title: t.title }))
      });
    }
    
    return NextResponse.json({ 
      message: "Debug API for trips",
      usage: {
        check: "?action=check - Check database contents",
        create: "?action=create&userId=USER_ID - Create test trips"
      }
    });
    
  } catch (err: any) {
    console.error("Debug API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}