"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  GitCompareArrows, 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign,
  Loader2,
  AlertCircle,
  CheckCircle,
  Cloud,
  Plane,
  Train,
  TrendingUp,
  ArrowLeft,
  Sparkles
} from "lucide-react";
import { useRouter } from "next/navigation";
import BudgetOverview from "@/components/dashboard/BudgetOverview";
import WeatherPanel from "@/components/dashboard/WeatherPanel";
import TransportationPanel from "@/components/dashboard/TransportationPanel";
import { fetchCityComparisonData } from "@/services/cityComparisonAPI";
import { CityData, ComparisonFormData } from "@/types/cityComparison";

const formSchema = z.object({
  origin: z.string().min(1, "Origin city is required"),
  destinationCity1: z.string().min(1, "First destination is required"),
  destinationCity2: z.string().min(1, "Second destination is required"),
  travelDate: z.string().min(1, "Travel date is required"),
  returnDate: z.string().min(1, "Return date is required"),
  passengers: z.number().min(1, "At least 1 passenger is required").max(20, "Maximum 20 passengers"),
  budgetLevel: z.enum(['low', 'medium', 'high']),
}).refine((data) => {
  const travelDate = new Date(data.travelDate);
  const returnDate = new Date(data.returnDate);
  return returnDate > travelDate;
}, {
  message: "Return date must be after travel date",
  path: ["returnDate"],
}).refine((data) => {
  return data.destinationCity1.toLowerCase() !== data.destinationCity2.toLowerCase();
}, {
  message: "Destination cities must be different",
  path: ["destinationCity2"],
});

type FormData = z.infer<typeof formSchema>;

interface TransformedBudgetData {
  total: string;
  categories: {
    name: string;
    amount: string;
    percentage: number;
  }[];
}

interface TransformedWeatherData {
  current: {
    day: string;
    temp: string;
    condition: string;
  };
  forecast: {
    day: string;
    temp: string;
    condition: string;
  }[];
}

interface TransformedTransportData {
  flights: {
    airline?: string;
    status: string;
    gate?: string;
    departure?: string;
  }[];
  trains: {
    line?: string;
    status: string;
    nextTrain?: string;
    destination?: string;
  }[];
}

export default function ComparePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<{
    city1Data: CityData | null;
    city2Data: CityData | null;
    errors: string[];
  } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      origin: "",
      destinationCity1: "",
      destinationCity2: "",
      travelDate: "",
      returnDate: "",
      passengers: 2,
      budgetLevel: "medium",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setErrors([]);
    setProgress(0);
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => prev < 90 ? prev + 10 : prev);
      }, 500);

      const result = await fetchCityComparisonData(data);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setComparisonResult(result);
      setErrors(result.errors);
      
    } catch (error) {
      console.error("Error comparing cities:", error);
      setErrors(["An unexpected error occurred while comparing cities"]);
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  const transformBudgetData = (cityData: CityData): TransformedBudgetData => {
    const budget = cityData.budget;
    const total = budget.trip.total;
    
    const categories = [
      {
        name: "Accommodation",
        amount: `$${budget.trip.accommodation}`,
        percentage: Math.round((budget.trip.accommodation / total) * 100)
      },
      {
        name: "Food & Dining",
        amount: `$${budget.trip.food}`,
        percentage: Math.round((budget.trip.food / total) * 100)
      },
      {
        name: "Local Transport",
        amount: `$${budget.trip.localTransport}`,
        percentage: Math.round((budget.trip.localTransport / total) * 100)
      },
      {
        name: "Activities",
        amount: `$${budget.trip.activities}`,
        percentage: Math.round((budget.trip.activities / total) * 100)
      }
    ];

    return {
      total: `$${total}`,
      categories
    };
  };

  const transformWeatherData = (cityData: CityData): TransformedWeatherData => {
    const weather = cityData.weather;
    
    return {
      current: {
        day: "Today",
        temp: `${weather.temperature.current}°C`,
        condition: weather.condition
      },
      forecast: [
        {
          day: "Today",
          temp: `${weather.temperature.current}°C`,
          condition: weather.condition
        },
        {
          day: "Tomorrow",
          temp: `${weather.temperature.max}°C`,
          condition: weather.condition
        },
        {
          day: "Day 3",
          temp: `${Math.round((weather.temperature.min + weather.temperature.max) / 2)}°C`,
          condition: weather.condition
        }
      ]
    };
  };

  const transformTransportData = (cityData: CityData): TransformedTransportData => {
    return {
      flights: cityData.flights.slice(0, 3).map(flight => ({
        airline: flight.airline,
        status: "Available",
        gate: flight.departure.airportCode,
        departure: flight.departure.time
      })),
      trains: cityData.trains.slice(0, 3).map(train => ({
        line: train.trainNumber,
        status: "On Time",
        nextTrain: train.departure.time,
        destination: train.arrival.station
      }))
    };
  };

  const renderAnalysisCard = () => {
    if (!comparisonResult?.city1Data || !comparisonResult?.city2Data) return null;

    const { city1Data, city2Data } = comparisonResult;
    
    // Simple analysis
    const city1Budget = city1Data.budget.trip.total;
    const city2Budget = city2Data.budget.trip.total;
    const cheaperCity = city1Budget < city2Budget ? city1Data.city : city2Data.city;
    
    const city1Temp = city1Data.weather.temperature.current;
    const city2Temp = city2Data.weather.temperature.current;
    const warmerCity = city1Temp > city2Temp ? city1Data.city : city2Data.city;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="col-span-full"
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
            <CardTitle className="flex items-center text-purple-800">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              AI Analysis & Recommendations
            </CardTitle>
            <CardDescription className="text-purple-600">
              Smart insights based on your comparison data
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <span className="font-medium text-green-800">💰 More Budget Friendly</span>
                  <Badge className="bg-green-100 text-green-800">{cheaperCity}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                  <span className="font-medium text-orange-800">🌡️ Warmer Weather</span>
                  <Badge className="bg-orange-100 text-orange-800">{warmerCity}</Badge>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <span className="font-medium text-blue-800">✈️ Flight Options</span>
                  <Badge className="bg-blue-100 text-blue-800">
                    {city1Data.flights.length > city2Data.flights.length ? city1Data.city : city2Data.city}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Key Recommendations:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mt-0.5 mr-2 text-green-500" />
                    Consider {cheaperCity} for budget-conscious travel
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mt-0.5 mr-2 text-green-500" />
                    {warmerCity} offers more comfortable weather conditions
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mt-0.5 mr-2 text-green-500" />
                    Both cities offer unique cultural experiences
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mt-0.5 mr-2 text-green-500" />
                    Book accommodations early for better rates
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <GitCompareArrows className="w-6 h-6 mr-2 text-blue-600" />
                  Compare Cities
                </h1>
                <p className="text-gray-600">Get real-time comparisons with AI insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!comparisonResult ? (
          /* Comparison Form */
          <div className="max-w-4xl mx-auto">
            <Card className="shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50">
                <CardTitle className="text-2xl">Compare Two Destinations</CardTitle>
                <CardDescription>
                  Enter your travel details to get comprehensive comparisons
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <FormField
                        control={form.control}
                        name="origin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Origin City
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. New York" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="destinationCity1"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destination City 1</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Paris" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="destinationCity2"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Destination City 2</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. London" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="travelDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Travel Date
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="returnDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Return Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="passengers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Number of Passengers
                            </FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="1" 
                                max="20"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="budgetLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Budget Level
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select budget level" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low Budget</SelectItem>
                                <SelectItem value="medium">Medium Budget</SelectItem>
                                <SelectItem value="high">High Budget</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="space-y-1">
                            {errors.map((error, index) => (
                              <li key={index}>• {error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {isLoading && progress > 0 && (
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Processing comparison...</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={isLoading}
                      size="lg"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Comparing Cities...
                        </>
                      ) : (
                        <>
                          <GitCompareArrows className="h-4 w-4 mr-2" />
                          Compare Cities
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Comparison Results */
          <div className="space-y-8">
            {/* Results Header */}
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">
                {comparisonResult.city1Data?.city} vs {comparisonResult.city2Data?.city}
              </h2>
              <p className="text-gray-600">
                Comprehensive comparison based on real-time data
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setComparisonResult(null);
                  setErrors([]);
                }}
                className="mt-4"
              >
                New Comparison
              </Button>
            </div>

            {/* Dashboard Cards */}
            {comparisonResult.city1Data && comparisonResult.city2Data && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* City 1 Cards */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-center text-blue-600 mb-4">
                      {comparisonResult.city1Data.city}
                    </h3>
                    
                    {/* Budget Card */}
                    <BudgetOverview budget={transformBudgetData(comparisonResult.city1Data)} />
                    
                    {/* Weather Card */}
                    <WeatherPanel weather={transformWeatherData(comparisonResult.city1Data)} />
                    
                    {/* Transportation Card */}
                    <TransportationPanel
                      title="Flight Options"
                      data={transformTransportData(comparisonResult.city1Data).flights}
                      type="airport"
                    />
                  </div>

                  {/* City 2 Cards */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-center text-purple-600 mb-4">
                      {comparisonResult.city2Data.city}
                    </h3>
                    
                    {/* Budget Card */}
                    <BudgetOverview budget={transformBudgetData(comparisonResult.city2Data)} />
                    
                    {/* Weather Card */}
                    <WeatherPanel weather={transformWeatherData(comparisonResult.city2Data)} />
                    
                    {/* Transportation Card */}
                    <TransportationPanel
                      title="Flight Options"
                      data={transformTransportData(comparisonResult.city2Data).flights}
                      type="airport"
                    />
                  </div>
                </div>

                {/* Analysis Card */}
                {renderAnalysisCard()}
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div>Some data may be limited due to API constraints:</div>
                  <ul className="mt-2 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index} className="text-sm">• {error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
