import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const chatsCollection = db.collection('chats');

    // Get all chats
    const chats = await chatsCollection.find({}).toArray();
    
    console.log(`Found ${chats.length} chat documents`);

    if (chats.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No chats to migrate",
        migrated: 0,
        skipped: 0,
        errors: 0
      });
    }

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (const chat of chats) {
      try {
        // Check if user field is already a string
        if (typeof chat.user === 'string') {
          console.log(`Skipping chat ${chat._id} - user field already string`);
          skipped++;
          continue;
        }

        // If user is ObjectId, convert to string
        if (chat.user && typeof chat.user === 'object') {
          const userIdString = chat.user.toString();
          
          await chatsCollection.updateOne(
            { _id: chat._id },
            { $set: { user: userIdString } }
          );
          
          console.log(`Migrated chat ${chat._id}: ${chat.user} → ${userIdString}`);
          migrated++;
        }
      } catch (error: any) {
        console.error(`Error migrating chat ${chat._id}:`, error);
        errors++;
        errorDetails.push({
          chatId: chat._id,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed",
      total: chats.length,
      migrated,
      skipped,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined
    });

  } catch (err: any) {
    console.error("Migration error:", err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }

    const chatsCollection = db.collection('chats');
    const chats = await chatsCollection.find({}).toArray();

    const analysis = {
      total: chats.length,
      withStringUser: 0,
      withObjectIdUser: 0,
      samples: [] as any[]
    };

    for (const chat of chats) {
      if (typeof chat.user === 'string') {
        analysis.withStringUser++;
      } else if (chat.user && typeof chat.user === 'object') {
        analysis.withObjectIdUser++;
      }

      // Add first 5 samples
      if (analysis.samples.length < 5) {
        analysis.samples.push({
          _id: chat._id,
          user: chat.user,
          userType: typeof chat.user,
          title: chat.title
        });
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      needsMigration: analysis.withObjectIdUser > 0
    });

  } catch (err: any) {
    console.error("Analysis error:", err);
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 });
  }
}
