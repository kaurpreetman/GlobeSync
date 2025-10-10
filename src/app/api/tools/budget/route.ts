import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { destination, duration, tripType, currentBudget } = await request.json();

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination is required' },
        { status: 400 }
      );
    }

    // Use Gemini AI to generate budget analysis
    const prompt = `
You are a travel budget expert. Analyze the budget for this trip and provide detailed recommendations.

Trip Details:
- Destination: ${destination}
- Duration: ${duration} days
- Trip Type: ${tripType}
- Current Budget: $${currentBudget}

Please provide a JSON response with:
1. Realistic total budget estimate
2. Detailed budget breakdown by category (accommodation, food, transport, activities, miscellaneous)
3. Money-saving recommendations
4. Whether the current budget is sufficient

Response format:
{
  "total": 1200,
  "breakdown": [
    {"category": "Accommodation", "amount": 400, "percentage": 33},
    {"category": "Food", "amount": 300, "percentage": 25},
    {"category": "Transportation", "amount": 200, "percentage": 17},
    {"category": "Activities", "amount": 200, "percentage": 17},
    {"category": "Miscellaneous", "amount": 100, "percentage": 8}
  ],
  "recommendations": [
    "Book accommodation in advance for 20-30% savings",
    "Consider local street food for authentic and budget-friendly meals",
    "Use public transportation instead of taxis"
  ],
  "budgetAnalysis": "sufficient/insufficient",
  "savingsTips": ["specific tip 1", "specific tip 2"]
}

Return valid JSON only.
`;

    const response = await fetch('http://localhost:8000/api/v1/ai/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        context: 'budget_analysis',
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      throw new Error('AI service unavailable');
    }

    const aiResponse = await response.json();
    
    try {
      // Parse AI response
      const budgetData = JSON.parse(aiResponse.response || aiResponse.message || '{}');
      
      // Validate and return structured data
      return NextResponse.json({
        total: budgetData.total || currentBudget,
        breakdown: budgetData.breakdown || [
          { category: 'Accommodation', amount: Math.round(currentBudget * 0.4), percentage: 40 },
          { category: 'Food', amount: Math.round(currentBudget * 0.25), percentage: 25 },
          { category: 'Transportation', amount: Math.round(currentBudget * 0.15), percentage: 15 },
          { category: 'Activities', amount: Math.round(currentBudget * 0.15), percentage: 15 },
          { category: 'Miscellaneous', amount: Math.round(currentBudget * 0.05), percentage: 5 }
        ],
        recommendations: budgetData.recommendations || budgetData.savingsTips || [
          'Book flights in advance for better deals',
          'Consider staying in hostels or guesthouses',
          'Eat at local restaurants instead of tourist areas',
          'Use public transportation',
          'Look for free walking tours and activities'
        ],
        budgetAnalysis: budgetData.budgetAnalysis || 'sufficient',
        destination,
        duration,
        tripType
      });

    } catch (parseError) {
      console.error('AI response parsing failed:', parseError);
      
      // Fallback budget calculation
      return NextResponse.json({
        total: currentBudget,
        breakdown: [
          { category: 'Accommodation', amount: Math.round(currentBudget * 0.4), percentage: 40 },
          { category: 'Food', amount: Math.round(currentBudget * 0.25), percentage: 25 },
          { category: 'Transportation', amount: Math.round(currentBudget * 0.15), percentage: 15 },
          { category: 'Activities', amount: Math.round(currentBudget * 0.15), percentage: 15 },
          { category: 'Miscellaneous', amount: Math.round(currentBudget * 0.05), percentage: 5 }
        ],
        recommendations: [
          'Book accommodation in advance',
          'Try local cuisine for better prices',
          'Use public transportation',
          'Look for free activities and attractions'
        ],
        budgetAnalysis: 'estimated',
        destination,
        duration,
        tripType
      });
    }

  } catch (error) {
    console.error('Budget tool error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze budget',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}