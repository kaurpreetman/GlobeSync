"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Thermometer, 
  Plane, 
  Train, 
  DollarSign, 
  Clock, 
  Users, 
  Star,
  Wind,
  Droplets,
  Eye,
  Sun,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { CityData, ComparisonResult } from "@/types/cityComparison";

interface ComparisonCardsProps {
  result: ComparisonResult;
  onNewComparison: () => void;
}

export default function ComparisonCards({ result, onNewComparison }: ComparisonCardsProps) {
  const { city1Data, city2Data, analysis } = result;

  return (
    <div className="space-y-6">
      {/* Header with Analysis */}
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Trip Comparison Results</h2>
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {analysis.cheaperCity !== 'similar' && (
            <Badge variant="secondary" className="bg-green-50 text-green-700">
              💰 {analysis.cheaperCity === 'city1' ? city1Data.city : city2Data.city} is cheaper
            </Badge>
          )}
          {analysis.betterWeather !== 'similar' && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700">
              🌤️ {analysis.betterWeather === 'city1' ? city1Data.city : city2Data.city} has better weather
            </Badge>
          )}
          {analysis.betterFlights !== 'similar' && (
            <Badge variant="secondary" className="bg-purple-50 text-purple-700">
              ✈️ {analysis.betterFlights === 'city1' ? city1Data.city : city2Data.city} has better flights
            </Badge>
          )}
        </div>
        <Button variant="outline" onClick={onNewComparison}>
          Compare Different Cities
        </Button>
      </div>

      {/* Weather Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WeatherCard city={city1Data} isWinner={analysis.betterWeather === 'city1'} />
        <WeatherCard city={city2Data} isWinner={analysis.betterWeather === 'city2'} />
      </div>

      {/* Flight Comparison */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-center">Flight Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FlightCard city={city1Data} isWinner={analysis.betterFlights === 'city1'} />
          <FlightCard city={city2Data} isWinner={analysis.betterFlights === 'city2'} />
        </div>
      </div>

      {/* Train Comparison */}
      {(city1Data.trains.length > 0 || city2Data.trains.length > 0) && (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-center">Train Options</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TrainCard city={city1Data} isWinner={analysis.betterTrains === 'city1'} />
            <TrainCard city={city2Data} isWinner={analysis.betterTrains === 'city2'} />
          </div>
        </div>
      )}

      {/* Budget Comparison */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-center">Budget Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BudgetCard city={city1Data} isWinner={analysis.cheaperCity === 'city1'} />
          <BudgetCard city={city2Data} isWinner={analysis.cheaperCity === 'city2'} />
        </div>
      </div>

      {/* AI Recommendations */}
      {analysis.recommendations.length > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WeatherCard({ city, isWinner }: { city: CityData; isWinner: boolean }) {
  const { weather } = city;

  return (
    <Card className={`relative ${isWinner ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}>
      {isWinner && (
        <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
          Best Weather
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Thermometer className="h-5 w-5" />
          {city.city} Weather
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-4xl font-bold">{weather.temperature.current}°C</div>
          <div className="text-sm text-muted-foreground">
            Feels like {weather.temperature.feelsLike}°C
          </div>
          <div className="text-lg font-medium mt-2">{weather.condition}</div>
          <div className="text-sm text-muted-foreground">{weather.description}</div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-red-500" />
            <div>
              <div>High: {weather.temperature.max}°C</div>
              <div>Low: {weather.temperature.min}°C</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            <div>
              <div>Humidity: {weather.humidity}%</div>
              <div>Rain: {Math.round(weather.precipitation)}%</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-gray-500" />
            <div>Wind: {weather.windSpeed} km/h</div>
          </div>
          
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-yellow-500" />
            <div>UV Index: {weather.uvIndex}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FlightCard({ city, isWinner }: { city: CityData; isWinner: boolean }) {
  const cheapestFlight = city.flights.sort((a, b) => a.price.economy - b.price.economy)[0];

  return (
    <Card className={`relative ${isWinner ? 'ring-2 ring-purple-500 ring-offset-2' : ''}`}>
      {isWinner && (
        <div className="absolute top-0 right-0 bg-purple-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
          Best Flights
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Flights to {city.city}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {city.flights.length > 0 ? (
          <>
            {/* Best Deal */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">{cheapestFlight.airline}</div>
                <div className="text-lg font-bold text-green-600">
                  ${cheapestFlight.price.economy}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {cheapestFlight.departure.time} → {cheapestFlight.arrival.time}
              </div>
              <div className="text-sm text-muted-foreground">
                Duration: {cheapestFlight.duration} • {cheapestFlight.stops === 0 ? 'Direct' : `${cheapestFlight.stops} stop(s)`}
              </div>
            </div>
            
            {/* All Options */}
            <div className="space-y-2">
              <div className="font-medium">All Options ({city.flights.length})</div>
              {city.flights.slice(0, 3).map((flight) => (
                <div key={flight.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <div className="font-medium text-sm">{flight.airline}</div>
                    <div className="text-xs text-muted-foreground">{flight.duration}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${flight.price.economy}</div>
                    <div className="text-xs text-muted-foreground">Economy</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            No flight options found
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrainCard({ city, isWinner }: { city: CityData; isWinner: boolean }) {
  const cheapestTrain = city.trains.length > 0 ? 
    city.trains.sort((a, b) => a.price.economy - b.price.economy)[0] : null;

  return (
    <Card className={`relative ${isWinner ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}>
      {isWinner && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
          Best Trains
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Train className="h-5 w-5" />
          Trains to {city.city}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {city.trains.length > 0 && cheapestTrain ? (
          <>
            {/* Best Deal */}
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">{cheapestTrain.operator}</div>
                <div className="text-lg font-bold text-green-600">
                  ${cheapestTrain.price.economy}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {cheapestTrain.departure.time} → {cheapestTrain.arrival.time}
              </div>
              <div className="text-sm text-muted-foreground">
                Duration: {cheapestTrain.duration} • {cheapestTrain.class}
              </div>
            </div>
            
            {/* All Options */}
            <div className="space-y-2">
              <div className="font-medium">All Options ({city.trains.length})</div>
              {city.trains.map((train) => (
                <div key={train.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <div className="font-medium text-sm">{train.operator}</div>
                    <div className="text-xs text-muted-foreground">{train.duration}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${train.price.economy}</div>
                    <div className="text-xs text-muted-foreground">Economy</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            No train options available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BudgetCard({ city, isWinner }: { city: CityData; isWinner: boolean }) {
  const { budget } = city;

  return (
    <Card className={`relative ${isWinner ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}>
      {isWinner && (
        <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-xs font-medium rounded-bl-lg">
          More Affordable
        </div>
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {city.city} Budget ({budget.budgetLevel})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <div className="text-3xl font-bold">${budget.trip.total}</div>
          <div className="text-sm text-muted-foreground">Total Trip Cost</div>
          <div className="text-lg font-medium mt-2">${budget.daily.total}/day</div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="font-medium">Daily Breakdown</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span>🏨 Stay:</span>
              <span>${budget.daily.accommodation}</span>
            </div>
            <div className="flex justify-between">
              <span>🍽️ Food:</span>
              <span>${budget.daily.food}</span>
            </div>
            <div className="flex justify-between">
              <span>🚌 Transport:</span>
              <span>${budget.daily.localTransport}</span>
            </div>
            <div className="flex justify-between">
              <span>🎯 Activities:</span>
              <span>${budget.daily.activities}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div className="space-y-2">
          <div className="font-medium">Recommendations</div>
          <div className="text-xs space-y-1">
            <div>🏨 {budget.recommendations.accommodationType}</div>
            {budget.recommendations.foodTips.slice(0, 2).map((tip, index) => (
              <div key={index}>🍽️ {tip}</div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}