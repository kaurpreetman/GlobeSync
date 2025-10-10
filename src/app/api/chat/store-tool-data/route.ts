import { NextRequest, NextResponse } from 'next/server';
import connectDb from '@/lib/mongodb';
import Chat from '@/lib/models/Chat';

export async function POST(request: NextRequest) {
  try {
    const { chatId, toolType, toolData, userId } = await request.json();

    if (!chatId || !toolType || !toolData || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, toolType, toolData, userId' },
        { status: 400 }
      );
    }

    await connectDb();

    // Find the chat by ID and update it with tool data
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Check if user owns this chat
    if (chat.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Initialize tool_data if it doesn't exist
    if (!chat.tool_data) {
      chat.tool_data = {};
    }

    // Store the tool data with timestamp
    chat.tool_data[toolType] = {
      data: toolData,
      timestamp: new Date(),
      last_updated: new Date()
    };

    // Mark as modified and save
    chat.markModified('tool_data');
    chat.updatedAt = new Date();
    
    await chat.save();

    console.log(`Stored ${toolType} tool data for chat ${chatId}`);

    return NextResponse.json({
      success: true,
      message: `${toolType} tool data stored successfully`,
      chatId: chatId,
      toolType: toolType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Store tool data error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to store tool data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}