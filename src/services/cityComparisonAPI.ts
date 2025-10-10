import { 
  WeatherData, 
  FlightOption, 
  TrainOption, 
  BudgetEstimate, 
  CityData, 
  ComparisonFormData,
  ApiResponse 
} from "@/types/cityComparison";

// Backend API Configuration
const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Backend API Types
interface TripPlanRequest {
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget: number;
  preferences?: {
    origin?: string;
    budgetLevel?: string;
    passengers?: number;
  } | null;
}

interface TripStatusResponse {
  trip_id: string;
  status: string;
  current_step: string;
  completed_agents: string[];
  progress_percentage: number;
  estimated_completion_time?: string;
  error_message?: string;
}

interface TripResultResponse {
  trip_id: string;
  status: string;
  result: {
    weather_data?: any;
    flights?: any;
    trains?: any;
    budget?: any;
    itinerary?: any;
    events?: any;
    completed_agents: string[];
  };
  processing_time: number;
  completed_agents: string[];
}

// Main function to fetch city comparison data using backend trip planning
export async function fetchCityComparisonData(formData: ComparisonFormData): Promise<{
  city1Data: CityData | null;
  city2Data: CityData | null;
  errors: string[];
}> {
  const errors: string[] = [];
  
  try {
    // Start trip planning for both cities in parallel
    const [city1TripId, city2TripId] = await Promise.all([
      startTripPlanning(formData.destinationCity1, formData),
      startTripPlanning(formData.destinationCity2, formData)
    ]);
    
    if (!city1TripId || !city2TripId) {
      errors.push("Failed to initiate trip planning for one or both cities");
      // Return fallback data instead of null
      return {
        city1Data: createFallbackCityData(formData.destinationCity1, formData),
        city2Data: createFallbackCityData(formData.destinationCity2, formData),
        errors
      };
    }
    
    // Poll for completion of both trips
    const [city1Result, city2Result] = await Promise.all([
      pollTripCompletion(city1TripId),
      pollTripCompletion(city2TripId)
    ]);
    
    // Process results into our format
    const city1Data = city1Result ? transformBackendDataToCityData(
      formData.destinationCity1, 
      city1Result.result, 
      formData
    ) : createFallbackCityData(formData.destinationCity1, formData);
    
    const city2Data = city2Result ? transformBackendDataToCityData(
      formData.destinationCity2, 
      city2Result.result, 
      formData
    ) : createFallbackCityData(formData.destinationCity2, formData);
    
    if (!city1Result) errors.push(`Backend failed for ${formData.destinationCity1} - using fallback data`);
    if (!city2Result) errors.push(`Backend failed for ${formData.destinationCity2} - using fallback data`);
    
    return { city1Data, city2Data, errors };
    
  } catch (error) {
    console.error('Error in fetchCityComparisonData:', error);
    errors.push(`Backend error: ${error}`);
    
    // Return fallback data on any error
    return {
      city1Data: createFallbackCityData(formData.destinationCity1, formData),
      city2Data: createFallbackCityData(formData.destinationCity2, formData),
      errors
    };
  }
}

// Start a trip planning process for a single city
async function startTripPlanning(destination: string, formData: ComparisonFormData): Promise<string | null> {
  try {
    const requestData: TripPlanRequest = {
      user_id: `comparison_user_${Date.now()}`,
      destination,
      start_date: formData.travelDate,
      end_date: formData.returnDate,
      budget: getBudgetAmount(formData.budgetLevel),
      preferences: {
        origin: formData.origin,
        budgetLevel: formData.budgetLevel,
        passengers: formData.passengers
      }
    };
    
    const response = await fetch(`${BACKEND_BASE_URL}/api/v1/trips/plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.trip_id;
    
  } catch (error) {
    console.error(`Error starting trip planning for ${destination}:`, error);
    return null;
  }
}

// Poll trip status until completion
async function pollTripCompletion(tripId: string): Promise<TripResultResponse | null> {
  const maxAttempts = 30; // 5 minutes max (10s intervals)
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const statusResponse = await fetch(`${BACKEND_BASE_URL}/api/v1/trips/${tripId}/status`);
      
      if (!statusResponse.ok) {
        throw new Error(`Status check failed: ${statusResponse.status}`);
      }
      
      const status: TripStatusResponse = await statusResponse.json();
      
      if (status.status === 'completed') {
        // Get the full result
        const resultResponse = await fetch(`${BACKEND_BASE_URL}/api/v1/trips/${tripId}/result`);
        
        if (resultResponse.ok) {
          return await resultResponse.json();
        }
      } else if (status.status === 'failed') {
        console.error(`Trip planning failed for ${tripId}: ${status.error_message}`);
        return null;
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
      attempts++;
      
    } catch (error) {
      console.error(`Error polling trip ${tripId}:`, error);
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds on error
    }
  }
  
  console.error(`Trip planning timed out for ${tripId}`);
  return null;
}

// Transform backend trip result to our CityData format
function transformBackendDataToCityData(
  cityName: string, 
  backendResult: any, 
  formData: ComparisonFormData
): CityData {
  console.log(`Transforming backend data for ${cityName}:`, backendResult);
  
  try {
    // Transform weather data
    const weather: WeatherData = transformWeatherData(backendResult.weather_data, cityName);
    
    // Transform flight data
    const flights: FlightOption[] = transformFlightData(backendResult.flights, formData.origin, cityName);
    
    // Transform train data
    const trains: TrainOption[] = transformTrainData(backendResult.trains, formData.origin, cityName);
    
    // Transform budget data
    const budget: BudgetEstimate = transformBudgetData(backendResult.budget, cityName, formData.budgetLevel);
    
    return {
      city: cityName,
      country: getCityCountry(cityName),
      weather,
      flights,
      trains,
      budget,
      attractions: getCityAttractions(cityName),
      bestTimeToVisit: getBestTimeToVisit(cityName),
      timezone: getCityTimezone(cityName),
      currency: getCityCurrency(cityName),
      language: getCityLanguage(cityName)
    };
    
  } catch (error) {
    console.error(`Error transforming backend data for ${cityName}:`, error);
    console.error('Backend result was:', backendResult);
    
    // Return fallback data on transformation error
    return createFallbackCityData(cityName, formData);
  }
}

// Transform backend weather data to our format
function transformWeatherData(weatherData: any, cityName: string): WeatherData {
  if (!weatherData || !weatherData.forecast_data) {
    return getFallbackWeatherDataSync(cityName);
  }
  
  const current = weatherData.forecast_data.current || {};
  const tempRange = weatherData.temperature_range || {};
  
  return {
    location: weatherData.location || cityName,
    temperature: {
      current: Math.round(current.temp || 20),
      min: Math.round(tempRange.min || current.temp - 5 || 15),
      max: Math.round(tempRange.max || current.temp + 5 || 25),
      feelsLike: Math.round(current.feels_like || current.temp || 20)
    },
    condition: weatherData.conditions || 'Clear',
    humidity: current.humidity || 50,
    windSpeed: 15,
    pressure: 1013,
    visibility: 10,
    uvIndex: 5,
    precipitation: Math.round((weatherData.precipitation_chance || 0.2) * 100),
    description: current.description || 'Pleasant weather',
    icon: (weatherData.conditions || 'clear').toLowerCase().replace(' ', '_')
  };
}

// Transform backend flight data to our format
function transformFlightData(flightData: any, origin: string, destination: string): FlightOption[] {
  if (!flightData || !Array.isArray(flightData) || flightData.length === 0) {
    return getFallbackFlightDataSync(origin, destination);
  }
  
  return flightData.slice(0, 3).map((flight: any, index: number) => ({
    id: `flight-${index + 1}`,
    airline: flight.carrier_name || flight.airline || 'Various Airlines',
    flightNumber: flight.flight_number || `FL${1000 + index}`,
    departure: {
      time: flight.departure_time || `${8 + index * 2}:00`,
      airport: `${origin} Airport`,
      airportCode: flight.departure_airport || origin.substring(0, 3).toUpperCase()
    },
    arrival: {
      time: flight.arrival_time || `${12 + index * 2}:00`,
      airport: `${destination} Airport`,
      airportCode: flight.arrival_airport || destination.substring(0, 3).toUpperCase()
    },
    duration: flight.duration || '4h 30m',
    stops: flight.stops || 0,
    price: {
      economy: flight.price?.economy || 400 + index * 100,
      business: flight.price?.business || (400 + index * 100) * 2.5,
      first: flight.price?.first || (400 + index * 100) * 4
    },
    aircraft: flight.aircraft_type || 'Commercial Aircraft',
    amenities: flight.amenities || ['Standard Service']
  }));
}

// Transform backend train data to our format
function transformTrainData(trainData: any, origin: string, destination: string): TrainOption[] {
  if (!trainData || !Array.isArray(trainData) || trainData.length === 0) {
    return []; // No fallback for trains - they're optional
  }
  
  return trainData.slice(0, 2).map((train: any, index: number) => ({
    id: `train-${index + 1}`,
    trainNumber: train.train_number || `TR${2000 + index}`,
    operator: train.operator || 'Railway Service',
    departure: {
      time: train.departure_time || `${9 + index * 3}:00`,
      station: train.from_station || `${origin} Station`,
      stationCode: train.from_station_code || origin.substring(0, 3).toUpperCase()
    },
    arrival: {
      time: train.arrival_time || `${13 + index * 3}:00`,
      station: train.to_station || `${destination} Station`,
      stationCode: train.to_station_code || destination.substring(0, 3).toUpperCase()
    },
    duration: train.duration || '4h 0m',
    price: {
      economy: train.price?.economy || 60 + index * 20,
      business: train.price?.business || (60 + index * 20) * 1.8,
      first: train.price?.first || (60 + index * 20) * 2.5
    },
    class: train.class || 'Standard',
    amenities: train.amenities || ['WiFi', 'Restaurant Car']
  }));
}

// Transform backend budget data to our format
function transformBudgetData(budgetData: any, cityName: string, budgetLevel: string): BudgetEstimate {
  if (!budgetData) {
    return getFallbackBudgetDataSync(cityName, budgetLevel as 'low' | 'medium' | 'high', 7);
  }
  
  const transport = budgetData.transport_options?.[0] || {};
  const accommodation = budgetData.accommodation_options?.[0] || {};
  
  // Estimate daily costs
  const dailyAccommodation = accommodation.cost_per_night || 80;
  const dailyFood = 45;
  const dailyTransport = 25;
  const dailyActivities = 40;
  
  const daily = {
    accommodation: dailyAccommodation,
    food: dailyFood,
    localTransport: dailyTransport,
    activities: dailyActivities,
    total: dailyAccommodation + dailyFood + dailyTransport + dailyActivities
  };
  
  const tripDays = 7; // Default
  const trip = {
    accommodation: daily.accommodation * tripDays,
    food: daily.food * tripDays,
    localTransport: daily.localTransport * tripDays,
    activities: daily.activities * tripDays,
    total: daily.total * tripDays
  };
  
  return {
    location: cityName,
    budgetLevel: budgetLevel as 'low' | 'medium' | 'high',
    daily,
    trip,
    currency: 'USD',
    recommendations: {
      accommodationType: accommodation.type || 'Hotel',
      foodTips: ['Try local cuisine', 'Visit markets', 'Look for lunch specials'],
      transportTips: ['Use public transport', 'Walk when possible', 'Consider day passes'],
      activityTips: ['Check for free museums', 'Walking tours', 'Local events']
    }
  };
}

// Create fallback city data when backend fails
function createFallbackCityData(cityName: string, formData: ComparisonFormData): CityData {
  return {
    city: cityName,
    country: getCityCountry(cityName),
    weather: getFallbackWeatherDataSync(cityName),
    flights: getFallbackFlightDataSync(formData.origin, cityName),
    trains: [], // No fallback trains
    budget: getFallbackBudgetDataSync(cityName, formData.budgetLevel as 'low' | 'medium' | 'high', 7),
    attractions: getCityAttractions(cityName),
    bestTimeToVisit: getBestTimeToVisit(cityName),
    timezone: getCityTimezone(cityName),
    currency: getCityCurrency(cityName),
    language: getCityLanguage(cityName)
  };
}

// Helper to convert budget level to amount
function getBudgetAmount(budgetLevel: string): number {
  const budgetMap = {
    'low': 1000,
    'medium': 2500,
    'high': 5000
  };
  return budgetMap[budgetLevel as keyof typeof budgetMap] || 2500;
}

// Synchronous fallback functions
function getFallbackWeatherDataSync(city: string): WeatherData {
  const weatherData: Record<string, Partial<WeatherData>> = {
    'paris': {
      condition: 'Partly Cloudy',
      temperature: { current: 18, min: 12, max: 22, feelsLike: 19 },
      humidity: 65,
      windSpeed: 15,
      description: 'Pleasant weather with occasional clouds'
    },
    'london': {
      condition: 'Light Rain',
      temperature: { current: 15, min: 9, max: 18, feelsLike: 14 },
      humidity: 78,
      windSpeed: 12,
      description: 'Typical British weather with light showers'
    },
    'tokyo': {
      condition: 'Clear',
      temperature: { current: 24, min: 18, max: 28, feelsLike: 26 },
      humidity: 55,
      windSpeed: 8,
      description: 'Clear skies with comfortable temperatures'
    },
    'rome': {
      condition: 'Sunny',
      temperature: { current: 26, min: 20, max: 30, feelsLike: 28 },
      humidity: 45,
      windSpeed: 10,
      description: 'Sunny Mediterranean weather'
    },
    'new york': {
      condition: 'Partly Cloudy',
      temperature: { current: 20, min: 15, max: 25, feelsLike: 22 },
      humidity: 60,
      windSpeed: 18,
      description: 'Variable weather with partly cloudy skies'
    }
  };

  const base = weatherData[city.toLowerCase()] || weatherData['paris'];
  
  return {
    location: city,
    temperature: base.temperature!,
    condition: base.condition!,
    humidity: base.humidity!,
    windSpeed: base.windSpeed!,
    pressure: 1013 + Math.random() * 20 - 10,
    visibility: 10 + Math.random() * 5,
    uvIndex: Math.floor(Math.random() * 10) + 1,
    precipitation: Math.random() * 30,
    description: base.description!,
    icon: base.condition!.toLowerCase().replace(' ', '_')
  };
}

function getFallbackFlightDataSync(origin: string, destination: string): FlightOption[] {
  const airlines = ['Air France', 'British Airways', 'Lufthansa', 'KLM', 'Emirates', 'Qatar Airways', 'American Airlines', 'Delta'];
  const flights: FlightOption[] = [];
  
  for (let i = 0; i < 3; i++) {
    const airline = airlines[Math.floor(Math.random() * airlines.length)];
    const basePrice = 300 + Math.random() * 800;
    
    flights.push({
      id: `flight-${i + 1}`,
      airline,
      flightNumber: `${airline.substring(0, 2).toUpperCase()}${Math.floor(Math.random() * 9000) + 1000}`,
      departure: {
        time: `${6 + i * 4}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        airport: `${origin} International Airport`,
        airportCode: origin.substring(0, 3).toUpperCase()
      },
      arrival: {
        time: `${10 + i * 4}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
        airport: `${destination} Airport`,
        airportCode: destination.substring(0, 3).toUpperCase()
      },
      duration: `${Math.floor(Math.random() * 8) + 2}h ${Math.floor(Math.random() * 60)}m`,
      stops: Math.floor(Math.random() * 2),
      price: {
        economy: Math.round(basePrice),
        business: Math.round(basePrice * 2.5),
        first: Math.round(basePrice * 4)
      },
      aircraft: 'Boeing 737-800',
      amenities: ['WiFi', 'Entertainment', 'Meals']
    });
  }
  
  return flights;
}

function getFallbackBudgetDataSync(city: string, budgetLevel: 'low' | 'medium' | 'high', days: number): BudgetEstimate {
  const multipliers = { low: 0.7, medium: 1.0, high: 1.5 };
  const multiplier = multipliers[budgetLevel];
  
  const baseBudgets: Record<string, any> = {
    'paris': { accommodation: 80, food: 50, transport: 25, activities: 40 },
    'london': { accommodation: 90, food: 45, transport: 30, activities: 45 },
    'tokyo': { accommodation: 70, food: 40, transport: 20, activities: 35 },
    'rome': { accommodation: 65, food: 35, transport: 20, activities: 30 },
    'new york': { accommodation: 100, food: 60, transport: 35, activities: 50 },
    'berlin': { accommodation: 60, food: 35, transport: 20, activities: 30 }
  };
  
  const base = baseBudgets[city.toLowerCase()] || baseBudgets['paris'];
  
  const daily = {
    accommodation: Math.round(base.accommodation * multiplier),
    food: Math.round(base.food * multiplier),
    localTransport: Math.round(base.transport * multiplier),
    activities: Math.round(base.activities * multiplier),
    total: 0
  };
  
  daily.total = daily.accommodation + daily.food + daily.localTransport + daily.activities;
  
  const trip = {
    accommodation: daily.accommodation * days,
    food: daily.food * days,
    localTransport: daily.localTransport * days,
    activities: daily.activities * days,
    total: daily.total * days
  };
  
  return {
    location: city,
    budgetLevel,
    daily,
    trip,
    currency: 'USD',
    recommendations: {
      accommodationType: budgetLevel === 'low' ? 'Hostel' : budgetLevel === 'medium' ? 'Hotel' : 'Luxury Hotel',
      foodTips: ['Try local markets', 'Cook when possible', 'Look for lunch specials'],
      transportTips: ['Use public transport', 'Walk when possible', 'Consider day passes'],
      activityTips: ['Free museums on certain days', 'City walking tours', 'Parks and free attractions']
    }
  };
}

// Helper functions for city data
function getCityCountry(city: string): string {
  const cityCountries: Record<string, string> = {
    'paris': 'France',
    'london': 'United Kingdom', 
    'tokyo': 'Japan',
    'rome': 'Italy',
    'berlin': 'Germany',
    'amsterdam': 'Netherlands',
    'madrid': 'Spain',
    'barcelona': 'Spain',
    'vienna': 'Austria',
    'zurich': 'Switzerland',
    'new york': 'United States',
    'los angeles': 'United States',
    'chicago': 'United States',
    'miami': 'United States',
    'toronto': 'Canada',
    'vancouver': 'Canada'
  };
  return cityCountries[city.toLowerCase()] || 'Unknown';
}

function getCityAttractions(city: string): string[] {
  const attractions: Record<string, string[]> = {
    'paris': ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame', 'Arc de Triomphe'],
    'london': ['Big Ben', 'London Eye', 'Tower Bridge', 'British Museum'],
    'tokyo': ['Tokyo Tower', 'Senso-ji Temple', 'Shibuya Crossing', 'Mount Fuji'],
    'rome': ['Colosseum', 'Vatican City', 'Trevi Fountain', 'Pantheon'],
    'berlin': ['Brandenburg Gate', 'Berlin Wall', 'Museum Island', 'Reichstag'],
    'amsterdam': ['Anne Frank House', 'Van Gogh Museum', 'Rijksmuseum', 'Canal Ring'],
    'madrid': ['Prado Museum', 'Royal Palace', 'Retiro Park', 'Puerta del Sol'],
    'new york': ['Statue of Liberty', 'Central Park', 'Times Square', 'Brooklyn Bridge']
  };
  return attractions[city.toLowerCase()] || ['City Center', 'Local Museum', 'Historic District'];
}

function getBestTimeToVisit(city: string): string {
  const bestTimes: Record<string, string> = {
    'paris': 'April to October',
    'london': 'May to September', 
    'tokyo': 'March to May, September to November',
    'rome': 'April to June, September to October',
    'berlin': 'May to September',
    'amsterdam': 'April to October',
    'madrid': 'March to May, September to November',
    'new york': 'April to June, September to November'
  };
  return bestTimes[city.toLowerCase()] || 'Year-round';
}

function getCityTimezone(city: string): string {
  const timezones: Record<string, string> = {
    'paris': 'CET (UTC+1)',
    'london': 'GMT (UTC+0)',
    'tokyo': 'JST (UTC+9)',
    'rome': 'CET (UTC+1)',
    'berlin': 'CET (UTC+1)',
    'amsterdam': 'CET (UTC+1)',
    'madrid': 'CET (UTC+1)',
    'new york': 'EST (UTC-5)'
  };
  return timezones[city.toLowerCase()] || 'UTC+0';
}

function getCityCurrency(city: string): string {
  const currencies: Record<string, string> = {
    'paris': 'EUR',
    'london': 'GBP',
    'tokyo': 'JPY', 
    'rome': 'EUR',
    'berlin': 'EUR',
    'amsterdam': 'EUR',
    'madrid': 'EUR',
    'new york': 'USD'
  };
  return currencies[city.toLowerCase()] || 'USD';
}

function getCityLanguage(city: string): string {
  const languages: Record<string, string> = {
    'paris': 'French',
    'london': 'English',
    'tokyo': 'Japanese',
    'rome': 'Italian',
    'berlin': 'German',
    'amsterdam': 'Dutch',
    'madrid': 'Spanish',
    'new york': 'English'
  };
  return languages[city.toLowerCase()] || 'English';
}