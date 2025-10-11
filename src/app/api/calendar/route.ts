import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const userId = searchParams.get('userId') || 'default_user';

  try {
    if (action === 'connect') {
      // Get authorization URL from backend
      const response = await fetch(
        `${BACKEND_URL}/api/calendar/connect?user_id=${userId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to initiate calendar connection');
      }

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        authorizationUrl: data.authorization_url,
        message: data.message
      });
    }

    if (action === 'status') {
      // Check calendar connection status
      const response = await fetch(
        `${BACKEND_URL}/api/calendar/status?user_id=${userId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to check calendar status');
      }

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        connected: data.connected,
        email: data.email,
        calendarId: data.calendar_id
      });
    }

    if (action === 'disconnect') {
      // Disconnect calendar
      const response = await fetch(
        `${BACKEND_URL}/api/calendar/disconnect?user_id=${userId}`,
        { method: 'DELETE' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to disconnect calendar');
      }

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        message: data.message
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, event } = body;

    if (!userId || !event) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Add event to calendar
    const response = await fetch(
      `${BACKEND_URL}/api/calendar/add-event`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          ...event
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to add event to calendar');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      eventId: data.event_id,
      eventLink: data.event_link,
      message: data.message
    });

  } catch (error) {
    console.error('Calendar event add error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
