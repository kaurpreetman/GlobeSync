import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { destination, startDate, duration } = await request.json();

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    // Forward to backend weather API
    const weatherResponse = await fetch(`http://localhost:8000/api/v1/weather/forecast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GlobeSync-Frontend/1.0'
      },
      body: JSON.stringify({
        destination,
        start_date: startDate,
        duration: duration || 3
      })
    });

    if (!weatherResponse.ok) {
      // If backend weather fails, create mock data
      console.warn('Backend weather API failed, using mock data');
      
      const mockWeatherData = {
        current: {
          temperature: Math.round(15 + Math.random() * 20), // 15-35°C
          condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
          humidity: Math.round(40 + Math.random() * 40), // 40-80%
          windSpeed: Math.round(5 + Math.random() * 15) // 5-20 km/h
        },
        forecast: Array.from({ length: Math.min(duration || 3, 7) }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() + i + 1);
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            high: Math.round(18 + Math.random() * 15), // 18-33°C
            low: Math.round(8 + Math.random() * 10), // 8-18°C
            condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)]
          };
        }),
        packingRecommendations: [
          'Light layers for temperature variation',
          'Comfortable walking shoes',
          'Light rain jacket or umbrella',
          'Sunscreen and sunglasses',
          'Hat for sun protection'
        ],
        destination,
        bestTime: 'Morning and late afternoon are generally most comfortable'
      };

      return NextResponse.json(mockWeatherData);
    }

    const weatherData = await weatherResponse.json();

    // Transform backend response to our expected format
    const transformedData = {
      current: {
        temperature: weatherData.current_weather?.temperature || 22,
        condition: weatherData.current_weather?.condition || 'Partly Cloudy',
        humidity: weatherData.current_weather?.humidity || 60,
        windSpeed: weatherData.current_weather?.wind_speed || 10
      },
      forecast: (weatherData.forecast || []).slice(0, duration || 3).map((day: any) => ({
        date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        high: day.temperature_max || day.high || 25,
        low: day.temperature_min || day.low || 15,
        condition: day.condition || 'Partly Cloudy'
      })),
      packingRecommendations: weatherData.packing_recommendations || [
        'Check weather updates before departure',
        'Pack layers for temperature changes',
        'Bring appropriate seasonal clothing',
        'Don\'t forget rain protection',
        'Comfortable shoes are essential'
      ],
      destination,
      bestTime: weatherData.best_time || 'Plan activities based on daily forecasts'
    };

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('Weather tool error:', error);
    
    // Return fallback weather data
    return NextResponse.json({
      current: {
        temperature: 22,
        condition: 'Partly Cloudy',
        humidity: 65,
        windSpeed: 8
      },
      forecast: [
        { date: 'Tomorrow', high: 25, low: 18, condition: 'Sunny' },
        { date: 'Day 2', high: 23, low: 16, condition: 'Partly Cloudy' },
        { date: 'Day 3', high: 21, low: 14, condition: 'Cloudy' }
      ],
      packingRecommendations: [
        'Pack layers for varying temperatures',
        'Bring a light jacket',
        'Comfortable walking shoes',
        'Umbrella for possible rain'
      ],
      destination: 'Unknown',
      bestTime: 'Weather forecast unavailable, pack for various conditions'
    });
  }
}