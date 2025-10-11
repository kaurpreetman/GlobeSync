export interface ComparisonFormData {
  origin: string;
  destinationCity1: string;
  destinationCity2: string;
  travelDate: string;
  returnDate: string;
  passengers: number;
  budgetLevel: 'low' | 'medium' | 'high';
}

export interface WeatherData {
  location: string;
  temperature: {
    current: number;
    min: number;
    max: number;
    feelsLike: number;
  };
  condition: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  precipitation: number;
  description: string;
  icon: string;
}

export interface FlightOption {
  id: string;
  airline: string;
  flightNumber: string;
  departure: {
    time: string;
    airport: string;
    airportCode: string;
  };
  arrival: {
    time: string;
    airport: string;
    airportCode: string;
  };
  duration: string;
  stops: number;
  price: {
    economy: number;
    business?: number;
    first?: number;
  };
  aircraft: string;
  amenities: string[];
}

export interface TrainOption {
  id: string;
  trainNumber: string;
  operator: string;
  departure: {
    time: string;
    station: string;
    stationCode: string;
  };
  arrival: {
    time: string;
    station: string;
    stationCode: string;
  };
  duration: string;
  price: {
    economy: number;
    business?: number;
    first?: number;
  };
  class: string;
  amenities: string[];
}

export interface BudgetEstimate {
  location: string;
  budgetLevel: 'low' | 'medium' | 'high';
  daily: {
    accommodation: number;
    food: number;
    localTransport: number;
    activities: number;
    total: number;
  };
  trip: {
    accommodation: number;
    food: number;
    localTransport: number;
    activities: number;
    total: number;
  };
  currency: string;
  recommendations: {
    accommodationType: string;
    foodTips: string[];
    transportTips: string[];
    activityTips: string[];
  };
}

export interface CityData {
  city: string;
  country: string;
  weather: WeatherData;
  flights: FlightOption[];
  trains: TrainOption[];
  budget: BudgetEstimate;
  attractions: string[];
  bestTimeToVisit: string;
  timezone: string;
  currency: string;
  language: string;
}

export interface ComparisonResult {
  formData: ComparisonFormData;
  city1Data: CityData;
  city2Data: CityData;
  analysis: {
    cheaperCity: 'city1' | 'city2' | 'similar';
    betterWeather: 'city1' | 'city2' | 'similar';
    betterFlights: 'city1' | 'city2' | 'similar';
    betterTrains: 'city1' | 'city2' | 'similar';
    recommendations: string[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Backend Integration Types
export interface TripPlanningProgress {
  trip_id: string;
  status: 'started' | 'processing' | 'completed' | 'failed' | 'cancelled';
  current_step: string;
  completed_agents: string[];
  progress_percentage: number;
  estimated_completion_time?: string;
  error_message?: string;
}

export interface BackendTripResult {
  trip_id: string;
  status: string;
  result: {
    weather_data?: any;
    flights?: any[];
    trains?: any[];
    budget?: any;
    itinerary?: any;
    events?: any[];
    completed_agents: string[];
  };
  processing_time: number;
  completed_agents: string[];
}

export interface ComparisonProgressCallback {
  (progress: {
    city1Progress?: TripPlanningProgress;
    city2Progress?: TripPlanningProgress;
    overallProgress: number;
    currentStep: string;
    isCompleted: boolean;
    errors?: string[];
  }): void;
}
