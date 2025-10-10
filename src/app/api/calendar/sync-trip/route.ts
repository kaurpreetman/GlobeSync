import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { trip_id, user_id, force_resync } = await request.json();

    if (!trip_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing trip_id or user_id' },
        { status: 400 }
      );
    }

    // First, get the trip data from the database
    const tripResponse = await fetch(`http://localhost:3000/api/chat/${trip_id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!tripResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch trip data' },
        { status: tripResponse.status }
      );
    }

    const tripData = await tripResponse.json();

    // Now sync the trip to calendar via backend
    const syncResponse = await fetch('http://localhost:8000/api/calendar/sync-trip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GlobeSync-Frontend/1.0'
      },
      body: JSON.stringify({
        trip_id: trip_id,
        user_id: user_id,
        trip_data: {
          basic_info: tripData.basic_info || {},
          messages: tripData.messages || [],
          route_data: tripData.route_data || {},
          created_at: tripData.createdAt,
          updated_at: tripData.updatedAt
        },
        force_resync: force_resync || false
      })
    });

    if (!syncResponse.ok) {
      const errorText = await syncResponse.text().catch(() => 'Unknown error');
      console.error('Backend trip sync failed:', syncResponse.status, errorText);
      return NextResponse.json(
        { error: errorText },
        { status: syncResponse.status }
      );
    }

    const syncResult = await syncResponse.json();
    return NextResponse.json(syncResult);

  } catch (error) {
    console.error('Trip sync error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync trip to calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}