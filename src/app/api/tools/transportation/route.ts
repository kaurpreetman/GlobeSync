import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, departureDate, passengers, transportType = 'flight' } = await request.json();

    if (!origin || !destination) {
      return NextResponse.json(
        { error: 'Origin and destination are required' },
        { status: 400 }
      );
    }

    // Use Gemini to resolve and standardize city names
    let resolvedOrigin = origin;
    let resolvedDestination = destination;
    
    try {
      const cityResolutionPrompt = `
Resolve and standardize these city names for travel booking:

Origin: "${origin}"
Destination: "${destination}"

Return ONLY a JSON response with the standardized city names in this exact format:
{
  "origin": "Standard City Name, Country",
  "destination": "Standard City Name, Country"
}

Rules:
- Use major city names (e.g. "New York, USA" not "NYC")
- Include country for international routes
- Fix spelling errors
- Use airport cities for flights
- Use proper capitalization
`;

      const aiResponse = await fetch('http://localhost:8000/api/v1/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: cityResolutionPrompt,
          context: 'city_name_resolution',
          max_tokens: 100
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        try {
          const resolvedCities = JSON.parse(aiData.response || aiData.message || '{}');
          if (resolvedCities.origin && resolvedCities.destination) {
            resolvedOrigin = resolvedCities.origin;
            resolvedDestination = resolvedCities.destination;
          }
        } catch (parseError) {
          console.warn('Failed to parse city resolution, using original names:', parseError);
        }
      }
    } catch (aiError) {
      console.warn('City name resolution failed, using original names:', aiError);
    }

    const searchDate = departureDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const passengerCount = passengers || 1;
    
    let flights = [];
    let trains = [];
    let errors = [];
    let skippedServices = [];

    // Get flights (if requested)
    if (transportType === 'flight') {
      try {
        const flightResponse = await fetch(`http://localhost:8000/api/v1/flights/search?origin=${encodeURIComponent(resolvedOrigin)}&destination=${encodeURIComponent(resolvedDestination)}&departure_date=${searchDate}&passengers=${passengerCount}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'GlobeSync-Frontend/1.0'
          }
        });

        if (flightResponse.ok) {
          const flightData = await flightResponse.json();
          if (flightData.data?.flights && Array.isArray(flightData.data.flights)) {
            flights = flightData.data.flights.map(flight => ({
              type: 'flight',
              airline: flight.airline || 'Unknown Airline',
              flightNumber: flight.flight_number || 'N/A',
              departure: flight.departure_time || 'TBD',
              arrival: flight.arrival_time || 'TBD',
              duration: flight.duration || 'N/A',
              price: flight.price || 'Price on request',
              stops: flight.stops || 0,
              aircraft: flight.aircraft || 'N/A'
            }));
          }
        } else {
          errors.push('Flight search failed');
        }
      } catch (flightError) {
        console.warn('Flight API failed:', flightError);
        errors.push('Flight service unavailable');
      }
    } else {
      skippedServices.push('flights');
    }

    // Get trains (if requested)
    if (transportType === 'train') {
      try {
        const trainResponse = await fetch(`http://localhost:8000/api/v1/trains/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'GlobeSync-Frontend/1.0'
          },
          body: JSON.stringify({
            origin: resolvedOrigin,
            destination: resolvedDestination,
            travel_date: searchDate,
            passengers: passengerCount
          })
        });

        if (trainResponse.ok) {
          const trainData = await trainResponse.json();
          if (trainData.data?.trains && Array.isArray(trainData.data.trains)) {
            trains = trainData.data.trains.map(train => ({
              type: 'train',
              trainName: train.train_name || train.name || 'Unknown Train',
              trainNumber: train.train_number || 'N/A',
              departure: train.departure_time || 'TBD',
              arrival: train.arrival_time || 'TBD',
              duration: train.duration || 'N/A',
              price: train.fare || train.price || 'Price on request',
              class: train.class || 'Standard',
              operator: train.operator || 'N/A'
            }));
          }
        } else {
          errors.push('Train search failed');
        }
      } catch (trainError) {
        console.warn('Train API failed:', trainError);
        errors.push('Train service unavailable');
      }
    } else {
      skippedServices.push('trains');
    }

    // Generate user-friendly message
    let message = '';
    if (flights.length === 0 && trains.length === 0) {
      if (skippedServices.length > 0) {
        message = `No ${transportType === 'flight' ? 'flights' : 'trains'} found between ${resolvedOrigin} and ${resolvedDestination} for ${searchDate}.`;
      } else {
        message = `No transportation found between ${resolvedOrigin} and ${resolvedDestination} for ${searchDate}. Please try different dates or check city names.`;
      }
    } else {
      const resultParts = [];
      if (flights.length > 0) resultParts.push(`${flights.length} flight(s)`);
      if (trains.length > 0) resultParts.push(`${trains.length} train(s)`);
      message = `Found ${resultParts.join(' and ')} from ${resolvedOrigin} to ${resolvedDestination}.`;
    }

    // Return structured response
    return NextResponse.json({
      flights,
      trains,
      origin: resolvedOrigin,
      destination: resolvedDestination,
      originalOrigin: origin,
      originalDestination: destination,
      searchDate,
      passengers: passengerCount,
      transportType,
      summary: {
        totalFlights: flights.length,
        totalTrains: trains.length,
        hasResults: flights.length > 0 || trains.length > 0,
        searchedServices: [transportType],
        skippedServices
      },
      errors: errors.length > 0 ? errors : null,
      message
    });

  } catch (error) {
    console.error('Transportation tool error:', error);
    
    return NextResponse.json({
      flights: [],
      trains: [],
      origin: origin || 'Unknown',
      destination: destination || 'Unknown',
      originalOrigin: origin || 'Unknown',
      originalDestination: destination || 'Unknown',
      searchDate: departureDate || new Date().toISOString().split('T')[0],
      passengers: passengers || 1,
      transportType: transportType || 'flight',
      summary: {
        totalFlights: 0,
        totalTrains: 0,
        hasResults: false,
        searchedServices: [],
        skippedServices: []
      },
      errors: ['Transportation service temporarily unavailable'],
      message: 'Unable to search for transportation at this time. Please try again later or check your internet connection.'
    });
  }
}