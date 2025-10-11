import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing user_id parameter' }, { status: 400 });
    }

    // Forward request to backend
    const backendUrl = `http://localhost:8000/api/calendar/connect?user_id=${userId}`;
    
    console.log('Initiating calendar connection for user:', userId);
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GlobeSync-Frontend/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Backend calendar connect failed:', response.status, errorText);
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Calendar connect error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}