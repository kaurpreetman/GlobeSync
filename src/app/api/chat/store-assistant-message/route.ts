import { NextRequest, NextResponse } from 'next/server';
import connectDb from '@/lib/mongodb';
import Chat from '@/lib/models/Chat';

export async function POST(request: NextRequest) {
  try {
    const { chatId, message, userId } = await request.json();

    if (!chatId || !message || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: chatId, message, userId' },
        { status: 400 }
      );
    }

    await connectDb();

    // Find the chat by ID
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }

    // Check if user owns this chat (assuming chat has userId field or user reference)
    const chatUserId = chat.user?.toString();
    console.log(`Authorization check - Chat user: ${chatUserId}, Request user: ${userId}`);
    
    if (chatUserId !== userId) {
      console.error(`Authorization failed: chat.user (${chatUserId}) !== userId (${userId})`);
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          debug: {
            chatUserId,
            requestUserId: userId,
            chatId
          }
        },
        { status: 403 }
      );
    }

    // Ensure the message has proper structure
    const assistantMessage = {
      id: message.id || `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: message.role || 'assistant',
      content: message.content,
      timestamp: message.timestamp || new Date(),
      suggested_responses: message.suggested_responses || []
    };

    // Add the assistant message to the chat
    chat.messages.push(assistantMessage);
    chat.updatedAt = new Date();
    
    await chat.save();

    console.log(`Stored assistant message for chat ${chatId}:`, assistantMessage.content.substring(0, 100) + '...');

    return NextResponse.json({
      success: true,
      message: 'Assistant message stored successfully',
      chatId: chatId,
      messageId: assistantMessage.id,
      timestamp: assistantMessage.timestamp
    });

  } catch (error) {
    console.error('Store assistant message error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to store assistant message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}