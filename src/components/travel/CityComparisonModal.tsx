"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
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
  Clock,
  Zap
} from "lucide-react";
import ComparisonCards from "./ComparisonCards";
import { 
  ComparisonFormData, 
  ComparisonResult, 
  TripPlanningProgress,
  ComparisonProgressCallback 
} from "@/types/cityComparison";
import { fetchCityComparisonData } from "@/services/cityComparisonAPI";

interface CityComparisonModalProps {
  children: React.ReactNode;
}

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

export default function CityComparisonModal({ children }: CityComparisonModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [progressData, setProgressData] = useState<{
    city1Progress?: TripPlanningProgress;
    city2Progress?: TripPlanningProgress;
    overallProgress: number;
    currentStep: string;
    isCompleted: boolean;
  } | null>(null);

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
    setProgressData({
      overallProgress: 0,
      currentStep: "Initializing trip planning...",
      isCompleted: false
    });
    
    try {
      // Create progress callback to track backend processing
      const progressCallback: ComparisonProgressCallback = (progress) => {
        setProgressData(progress);
        
        // Show detailed progress in console for debugging
        console.log('Progress update:', {
          overall: progress.overallProgress,
          step: progress.currentStep,
          city1: progress.city1Progress?.current_step,
          city2: progress.city2Progress?.current_step,
          completed: progress.isCompleted
        });
      };
      
      const { city1Data, city2Data, errors: fetchErrors } = await fetchCityComparisonData(data);
      
      if (fetchErrors.length > 0) {
        setErrors(fetchErrors);
        setProgressData(prev => prev ? { ...prev, errors: fetchErrors } : null);
        return;
      }
      
      if (!city1Data || !city2Data) {
        const errorMsg = "Failed to fetch data for one or both cities";
        setErrors([errorMsg]);
        setProgressData({
          overallProgress: 100,
          currentStep: "Failed to complete comparison",
          isCompleted: false,
          errors: [errorMsg]
        });
        return;
      }
      
      // Generate comparison analysis
      const analysis = generateAnalysis(city1Data, city2Data);
      
      const result: ComparisonResult = {
        formData: data,
        city1Data,
        city2Data,
        analysis
      };
      
      setComparisonResult(result);
      setProgressData({
        overallProgress: 100,
        currentStep: "Comparison completed successfully!",
        isCompleted: true
      });
      
    } catch (error) {
      console.error("Error comparing cities:", error);
      const errorMsg = "An unexpected error occurred while comparing cities";
      setErrors([errorMsg]);
      setProgressData({
        overallProgress: 0,
        currentStep: "Trip planning failed",
        isCompleted: false,
        errors: [errorMsg]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewComparison = () => {
    setComparisonResult(null);
    setErrors([]);
    setProgressData(null);
    form.reset();
  };

  const handleClose = () => {
    setIsOpen(false);
    setComparisonResult(null);
    setErrors([]);
    setProgressData(null);
    form.reset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-6 w-6" />
            Compare Cities
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!comparisonResult ? (
            <>
              {/* Comparison Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {progressData?.currentStep || "Starting comparison..."}
                      </>
                    ) : (
                      "Compare Cities"
                    )}
                  </Button>
                </form>
              </Form>

              {/* Enhanced Loading State with Progress */}
              {isLoading && progressData && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="text-lg font-medium mb-2">AI-Powered Trip Analysis in Progress</div>
                    <div className="text-sm text-muted-foreground mb-4">
                      Our specialized agents are analyzing weather, flights, trains, and budget data for both cities
                    </div>
                    
                    {/* Overall Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{progressData.currentStep}</span>
                        <span className="text-muted-foreground">{Math.round(progressData.overallProgress)}%</span>
                      </div>
                      <Progress value={progressData.overallProgress} className="h-2" />
                    </div>
                  </div>
                  
                  {/* City Progress Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* City 1 Progress */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{form.getValues('destinationCity1')}</h4>
                        {progressData.city1Progress ? (
                          <Badge 
                            variant={progressData.city1Progress.status === 'completed' ? 'default' : 'secondary'}
                            className="flex items-center gap-1"
                          >
                            {progressData.city1Progress.status === 'completed' ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : progressData.city1Progress.status === 'processing' ? (
                              <Zap className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {progressData.city1Progress.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Starting...</Badge>
                        )}
                      </div>
                      
                      {progressData.city1Progress && (
                        <>
                          <Progress value={progressData.city1Progress.progress_percentage} className="h-1" />
                          <div className="text-sm text-muted-foreground">
                            {progressData.city1Progress.current_step}
                          </div>
                          
                          {/* Completed Agents */}
                          <div className="flex flex-wrap gap-1">
                            {progressData.city1Progress.completed_agents.map((agent) => (
                              <Badge key={agent} variant="outline" className="text-xs flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {agent.replace('_agent', '').replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}
                      
                      {!progressData.city1Progress && (
                        <div className="space-y-2">
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      )}
                    </div>
                    
                    {/* City 2 Progress */}
                    <div className="space-y-3 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{form.getValues('destinationCity2')}</h4>
                        {progressData.city2Progress ? (
                          <Badge 
                            variant={progressData.city2Progress.status === 'completed' ? 'default' : 'secondary'}
                            className="flex items-center gap-1"
                          >
                            {progressData.city2Progress.status === 'completed' ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : progressData.city2Progress.status === 'processing' ? (
                              <Zap className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {progressData.city2Progress.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Starting...</Badge>
                        )}
                      </div>
                      
                      {progressData.city2Progress && (
                        <>
                          <Progress value={progressData.city2Progress.progress_percentage} className="h-1" />
                          <div className="text-sm text-muted-foreground">
                            {progressData.city2Progress.current_step}
                          </div>
                          
                          {/* Completed Agents */}
                          <div className="flex flex-wrap gap-1">
                            {progressData.city2Progress.completed_agents.map((agent) => (
                              <Badge key={agent} variant="outline" className="text-xs flex items-center gap-1">
                                <CheckCircle className="h-3 w-3 text-green-500" />
                                {agent.replace('_agent', '').replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </>
                      )}
                      
                      {!progressData.city2Progress && (
                        <div className="space-y-2">
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Processing Time Estimate */}
                  <div className="text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Estimated completion: 2-5 minutes</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Comparison Results */
            <ComparisonCards 
              result={comparisonResult} 
              onNewComparison={handleNewComparison}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to generate comparison analysis
function generateAnalysis(city1Data: any, city2Data: any) {
  const recommendations: string[] = [];
  
  // Budget comparison with null checks
  const city1Budget = city1Data.budget?.trip?.total || city1Data.budget?.daily?.total * 7 || 1000;
  const city2Budget = city2Data.budget?.trip?.total || city2Data.budget?.daily?.total * 7 || 1000;
  let cheaperCity: 'city1' | 'city2' | 'similar' = 'similar';
  
  if (city1Budget < city2Budget * 0.9) {
    cheaperCity = 'city1';
    recommendations.push(`${city1Data.city} is significantly more budget-friendly than ${city2Data.city}`);
  } else if (city2Budget < city1Budget * 0.9) {
    cheaperCity = 'city2';
    recommendations.push(`${city2Data.city} is significantly more budget-friendly than ${city1Data.city}`);
  }
  
  // Weather comparison with null checks
  const city1Temp = city1Data.weather?.temperature?.current || 20;
  const city2Temp = city2Data.weather?.temperature?.current || 20;
  let betterWeather: 'city1' | 'city2' | 'similar' = 'similar';
  
  // Consider temperature preference (18-25°C ideal)
  const idealTempMin = 18;
  const idealTempMax = 25;
  
  const city1TempScore = Math.abs(city1Temp - ((idealTempMin + idealTempMax) / 2));
  const city2TempScore = Math.abs(city2Temp - ((idealTempMin + idealTempMax) / 2));
  
  if (city1TempScore < city2TempScore * 0.8) {
    betterWeather = 'city1';
    recommendations.push(`${city1Data.city} has more comfortable weather conditions`);
  } else if (city2TempScore < city1TempScore * 0.8) {
    betterWeather = 'city2';
    recommendations.push(`${city2Data.city} has more comfortable weather conditions`);
  }
  
  // Flight comparison with null checks
  let betterFlights: 'city1' | 'city2' | 'similar' = 'similar';
  
  if (city1Data.flights?.length > 0 && city2Data.flights?.length > 0) {
    const city1MinFlight = Math.min(...city1Data.flights.map((f: any) => f.price?.economy || 500));
    const city2MinFlight = Math.min(...city2Data.flights.map((f: any) => f.price?.economy || 500));
    
    if (city1MinFlight < city2MinFlight * 0.9) {
      betterFlights = 'city1';
    } else if (city2MinFlight < city1MinFlight * 0.9) {
      betterFlights = 'city2';
    }
  }
  
  // Train comparison with null checks
  const city1HasTrains = city1Data.trains?.length > 0;
  const city2HasTrains = city2Data.trains?.length > 0;
  let betterTrains: 'city1' | 'city2' | 'similar' = 'similar';
  
  if (city1HasTrains && !city2HasTrains) {
    betterTrains = 'city1';
    recommendations.push(`Train travel is available to ${city1Data.city}, offering an eco-friendly alternative`);
  } else if (city2HasTrains && !city1HasTrains) {
    betterTrains = 'city2';
    recommendations.push(`Train travel is available to ${city2Data.city}, offering an eco-friendly alternative`);
  } else if (city1HasTrains && city2HasTrains) {
    const city1MinTrain = Math.min(...city1Data.trains.map((t: any) => t.price?.economy || 100));
    const city2MinTrain = Math.min(...city2Data.trains.map((t: any) => t.price?.economy || 100));
    
    if (city1MinTrain < city2MinTrain * 0.9) {
      betterTrains = 'city1';
    } else if (city2MinTrain < city1MinTrain * 0.9) {
      betterTrains = 'city2';
    }
  }
  
  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push("Both cities offer great travel experiences with similar overall value");
  }
  
  recommendations.push("Consider your personal preferences for weather, culture, and activities when making your final decision");
  
  console.log('Analysis debug info:', {
    city1Budget,
    city2Budget,
    city1Temp,
    city2Temp,
    city1FlightCount: city1Data.flights?.length || 0,
    city2FlightCount: city2Data.flights?.length || 0,
    city1TrainCount: city1Data.trains?.length || 0,
    city2TrainCount: city2Data.trains?.length || 0
  });
  
  return {
    cheaperCity,
    betterWeather,
    betterFlights,
    betterTrains,
    recommendations
  };
}
