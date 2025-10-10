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

    // Use Gemini to resolve and correct city names
    const prompt = `
You are a travel assistant that helps resolve city names for flight bookings. 
Given a user input city name (which might be misspelled or informal), provide:
1. The correct, official city name
2. The country
3. Confidence score (0-1)
4. Alternative interpretations if ambiguous

User input: "${cityInput}"

Respond in JSON format:
{
  "original": "${cityInput}",
  "resolved": "Correct City Name",
  "confidence": 0.95,
  "country": "Country Name",
  "alternatives": ["Alternative 1", "Alternative 2"]
}

Examples:
- "new yourk" → "New York"
- "paris" → "Paris" (but specify which one if ambiguous)
- "londen" → "London"
- "mumbai" → "Mumbai"
- "deli" → "Delhi"

Be precise and return valid JSON only.
`;

    const response = await fetch('http://localhost:8000/api/v1/ai/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        context: 'city_resolution',
        max_tokens: 200
      }),
    });

    if (!response.ok) {
      throw new Error('AI service unavailable');
    }

    const aiResponse = await response.json();
    
    try {
      // Try to parse the AI response as JSON
      const cityResolution = JSON.parse(aiResponse.response || aiResponse.message || '{}');
      
      // Validate the response structure
      if (!cityResolution.resolved || !cityResolution.country) {
        throw new Error('Invalid AI response format');
      }

      return NextResponse.json({
        original: cityInput,
        resolved: cityResolution.resolved,
        confidence: cityResolution.confidence || 0.8,
        country: cityResolution.country,
        alternatives: cityResolution.alternatives || []
      });

    } catch (parseError) {
      // If JSON parsing fails, use a simpler approach
      console.error('AI response parsing failed:', parseError);
      
      return NextResponse.json({
        original: cityInput,
        resolved: cityInput.trim().split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' '),
        confidence: 0.3,
        country: 'Unknown',
        alternatives: []
      });
    }

  } catch (error) {
    console.error('City resolution error:', error);
    
    return NextResponse.json(
      { 
        error: 'City resolution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}