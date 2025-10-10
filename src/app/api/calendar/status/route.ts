import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 });
    }

    // Forward request to backend
    const backendUrl = `http://localhost:8000/api/calendar/status?user_id=${userId}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GlobeSync-Frontend/1.0'
      }
    });

    if (!response.ok) {
      console.error('Backend calendar status check failed:', response.status);
      return NextResponse.json({ connected: false }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Calendar status check error:', error);
    return NextResponse.json({ connected: false }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 });
    }

    // Forward request to backend
    const backendUrl = `http://localhost:8000/api/calendar/disconnect?user_id=${userId}`;
    
    const response = await fetch(backendUrl, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GlobeSync-Frontend/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Calendar disconnect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}