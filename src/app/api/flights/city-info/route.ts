import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { cityInput } = await request.json();

    if (!cityInput || typeof cityInput !== 'string') {
      return NextResponse.json(
        { error: 'Invalid city input' },
        { status: 400 }
      );
    }

    // Forward to backend flight city info endpoint
    const response = await fetch(`http://localhost:8000/api/v1/flights/airports/${encodeURIComponent(cityInput)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GlobeSync-Frontend/1.0'
      }
    });

    if (!response.ok) {
      console.error('Backend flight city info failed:', response.status);
      return NextResponse.json(
        { error: 'Flight city information unavailable' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Transform backend response to our expected format
    return NextResponse.json({
      cityName: data.city || cityInput,
      airportCode: data.airport_info?.code || 'N/A',
      country: data.airport_info?.country || 'Unknown',
      fullName: data.airport_info?.full_name || `${data.city} Airport`
    });

  } catch (error) {
    console.error('Flight city info error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get flight city information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}