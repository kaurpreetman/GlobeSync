"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign, 
  Calendar, 
  CloudRain, 
  Car, 
  Loader2, 
  Thermometer,
  Wind,
  Eye,
  Info,
  Clock,
  Plane,
  Train,
  MapPin,
  Users,
  AlertCircle,
  Check,
  X
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface FloatingToolIconsProps {
  tripContext?: {
    origin?: string;
    city?: string;
    duration?: string;
    tripType?: string;
    budget?: string;
    [key: string]: any;
  };
  sessionId?: string;
  onToolResult?: (toolType: string, result: any) => void;
}

interface ToolData {
  budget?: any;
  weather?: any;
  transportation?: any;
  calendar?: any;
}

interface ToolInputs {
  budget?: {
    destination: string;
    duration: number;
    tripType: string;
    travelers: number;
  };
  weather?: {
    destination: string;
    startDate: string;
    duration: number;
  };
  transportation?: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string;
    passengers: number;
    transportType: string;
  };
  calendar?: {
    confirmed: boolean;
  };
}

const FloatingToolIcons: React.FC<FloatingToolIconsProps> = ({ tripContext, sessionId, onToolResult }) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [loadingTool, setLoadingTool] = useState<string | null>(null);
  const [toolData, setToolData] = useState<ToolData>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInputForm, setShowInputForm] = useState(false);
  const [toolInputs, setToolInputs] = useState<ToolInputs>({});

  const tools = [
    {
      id: 'budget',
      name: 'Budget',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      description: 'Budget Analysis'
    },
    {
      id: 'weather',
      name: 'Weather',
      icon: CloudRain,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      description: 'Weather Forecast'
    },
    {
      id: 'transportation',
      name: 'Transport',
      icon: Car,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      description: 'Transport Options'
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      description: 'Sync to Calendar'
    }
  ];

  const handleToolClick = (toolId: string) => {
    setActiveModal(toolId);
    
    // Initialize form with context data if available
    const defaultInputs = {
      budget: {
        destination: tripContext?.city || '',
        duration: parseInt(tripContext?.duration || '3'),
        tripType: tripContext?.tripType || 'leisure',
        travelers: 2
      },
      weather: {
        destination: tripContext?.city || '',
        startDate: new Date().toISOString().split('T')[0],
        duration: parseInt(tripContext?.duration || '3')
      },
      transportation: {
        origin: tripContext?.origin || '',
        destination: tripContext?.city || '',
        departureDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        returnDate: '',
        passengers: 1,
        transportType: 'flight'
      },
      calendar: {
        confirmed: false
      }
    };

    setToolInputs(prev => ({
      ...prev,
      [toolId]: defaultInputs[toolId]
    }));
    
    // For calendar, if we have session data, we can proceed directly
    if (toolId === 'calendar' && sessionId && session?.user?.id) {
      setShowInputForm(false);
      handleToolSubmit(toolId, defaultInputs[toolId]);
    } else {
      setShowInputForm(true);
    }
  };

  const handleToolSubmit = async (toolId: string, inputs: any) => {
    setLoadingTool(toolId);
    setShowInputForm(false);

    try {
      let apiEndpoint = '';
      let requestBody = {};

      switch (toolId) {
        case 'budget':
          // Calculate estimated budget based on trip type and duration
          let estimatedBudget = 100; // Base budget per day
          
          const dailyRates = {
            'budget': 50,
            'backpacking': 30,
            'leisure': 100,
            'luxury': 300,
            'business': 200
          };
          
          estimatedBudget = (dailyRates[inputs.tripType] || 100) * inputs.duration * inputs.travelers;

          apiEndpoint = '/api/tools/budget';
          requestBody = {
            destination: inputs.destination,
            duration: inputs.duration,
            tripType: inputs.tripType,
            currentBudget: estimatedBudget
          };
          break;

        case 'weather':
          apiEndpoint = '/api/tools/weather';
          requestBody = {
            destination: inputs.destination,
            startDate: inputs.startDate,
            duration: inputs.duration
          };
          break;

        case 'transportation':
          apiEndpoint = '/api/tools/transportation';
          requestBody = {
            origin: inputs.origin,
            destination: inputs.destination,
            departureDate: inputs.departureDate,
            passengers: inputs.passengers,
            transportType: inputs.transportType
          };
          break;

        case 'calendar':
          if (sessionId && session?.user?.id) {
            apiEndpoint = '/api/calendar/sync-trip';
            requestBody = {
              trip_id: sessionId,
              user_id: session.user.id,
              force_resync: false
            };
          } else {
            throw new Error('Please log in to sync calendar');
          }
          break;

        default:
          throw new Error('Unknown tool type');
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `${toolId} request failed`);
      }

      const result = await response.json();
      
      // Store tool data in database
      if (sessionId && session?.user?.id) {
        try {
          await fetch('/api/chat/store-tool-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chatId: sessionId,
              toolType: toolId,
              toolData: result,
              userId: session.user.id
            })
          });
        } catch (storeError) {
          console.warn('Failed to store tool data:', storeError);
        }
      }
      
      setToolData(prev => ({
        ...prev,
        [toolId]: result
      }));

      onToolResult?.(toolId, result);

      toast({
        title: `${tools.find(t => t.id === toolId)?.name} Analysis Complete`,
        description: `Successfully retrieved ${toolId} information.`
      });

    } catch (error) {
      console.error(`${toolId} tool error:`, error);
      
      setToolData(prev => ({
        ...prev,
        [toolId]: {
          error: true,
          message: error instanceof Error ? error.message : `Failed to get ${toolId} information`
        }
      }));
      
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : `Failed to analyze ${toolId}. Please check your inputs and try again.`,
        variant: "destructive"
      });
    } finally {
      setLoadingTool(null);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setShowInputForm(false);
    setLoadingTool(null);
  };

  const updateToolInput = (toolId: string, field: string, value: any) => {
    setToolInputs(prev => ({
      ...prev,
      [toolId]: {
        ...prev[toolId],
        [field]: value
      }
    }));
  };

  const validateInputs = (toolId: string) => {
    const inputs = toolInputs[toolId];
    if (!inputs) return false;

    switch (toolId) {
      case 'budget':
        return !!(inputs.destination && inputs.duration && inputs.tripType && inputs.travelers);
      case 'weather':
        return !!(inputs.destination && inputs.startDate && inputs.duration);
      case 'transportation':
        return !!(inputs.origin && inputs.destination && inputs.departureDate && inputs.passengers && inputs.transportType);
      case 'calendar':
        return true; // Calendar doesn't need validation
      default:
        return false;
    }
  };

  const renderInputForm = (toolId: string) => {
    const inputs = toolInputs[toolId];
    if (!inputs) return null;

    switch (toolId) {
      case 'budget':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Budget Analysis</h3>
              <p className="text-sm text-gray-600">Provide details for comprehensive budget breakdown</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={inputs.destination}
                  onChange={(e) => updateToolInput(toolId, 'destination', e.target.value)}
                  placeholder="e.g. Paris, Tokyo"
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="30"
                  value={inputs.duration}
                  onChange={(e) => updateToolInput(toolId, 'duration', parseInt(e.target.value))}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tripType">Trip Type</Label>
                <Select value={inputs.tripType} onValueChange={(value) => updateToolInput(toolId, 'tripType', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top" className="z-[100000]">
                    <SelectItem value="budget">Budget Travel</SelectItem>
                    <SelectItem value="leisure">Leisure</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="backpacking">Backpacking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="travelers">Number of Travelers</Label>
                <Input
                  id="travelers"
                  type="number"
                  min="1"
                  max="10"
                  value={inputs.travelers}
                  onChange={(e) => updateToolInput(toolId, 'travelers', parseInt(e.target.value))}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 'weather':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <CloudRain className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Weather Forecast</h3>
              <p className="text-sm text-gray-600">Get accurate weather data for your trip</p>
            </div>
            
            <div>
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={inputs.destination}
                onChange={(e) => updateToolInput(toolId, 'destination', e.target.value)}
                placeholder="e.g. London, New York"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={inputs.startDate}
                  onChange={(e) => updateToolInput(toolId, 'startDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  max="14"
                  value={inputs.duration}
                  onChange={(e) => updateToolInput(toolId, 'duration', parseInt(e.target.value))}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 'transportation':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="flex justify-center gap-2 mb-2">
                <Plane className="h-6 w-6 text-blue-600" />
                <Train className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Transportation Search</h3>
              <p className="text-sm text-gray-600">Search for flights or trains between cities</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="origin">From</Label>
                <Input
                  id="origin"
                  value={inputs.origin}
                  onChange={(e) => updateToolInput(toolId, 'origin', e.target.value)}
                  placeholder="e.g. New York, London"
                  required
                />
              </div>
              <div>
                <Label htmlFor="destination">To</Label>
                <Input
                  id="destination"
                  value={inputs.destination}
                  onChange={(e) => updateToolInput(toolId, 'destination', e.target.value)}
                  placeholder="e.g. Paris, Tokyo"
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="departureDate">Departure Date</Label>
                <Input
                  id="departureDate"
                  type="date"
                  value={inputs.departureDate}
                  onChange={(e) => updateToolInput(toolId, 'departureDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <Label htmlFor="passengers">Passengers</Label>
                <Input
                  id="passengers"
                  type="number"
                  min="1"
                  max="9"
                  value={inputs.passengers}
                  onChange={(e) => updateToolInput(toolId, 'passengers', parseInt(e.target.value))}
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="transportType">Transport Type</Label>
              <Select value={inputs.transportType} onValueChange={(value) => updateToolInput(toolId, 'transportType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose transport type" />
                </SelectTrigger>
                <SelectContent side="top" className="z-[100000]">
                  <SelectItem value="flight">✈️ Flight</SelectItem>
                  <SelectItem value="train">🚄 Train</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">
                💡 Smart Search Features:
              </p>
              <ul className="text-xs text-blue-700 mt-1 list-disc list-inside space-y-1">
                <li>Auto-corrects city name spellings</li>
                <li>Searches only your selected transport type</li>
                <li>Shows detailed pricing and timing info</li>
              </ul>
            </div>
          </div>
        );

      case 'calendar':
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h3 className="text-lg font-semibold">Calendar Sync</h3>
              <p className="text-sm text-gray-600">Sync your trip to Google Calendar</p>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800 mb-2">
                This will create multiple events in your Google Calendar:
              </p>
              <ul className="text-xs text-blue-700 list-disc list-inside space-y-1">
                <li>Main trip overview</li>
                <li>Departure and return reminders</li>
                <li>Activity suggestions</li>
                <li>Packing reminders</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderModalContent = () => {
    if (!activeModal) return null;

    // Show loading state
    if (loadingTool === activeModal) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading {tools.find(t => t.id === activeModal)?.name}...</span>
        </div>
      );
    }

    // Show input form if we need inputs and don't have results yet
    if (showInputForm || !toolData[activeModal]) {
      return (
        <div>
          {renderInputForm(activeModal)}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const inputs = toolInputs[activeModal];
                if (inputs) {
                  handleToolSubmit(activeModal, inputs);
                }
              }}
              disabled={!toolInputs[activeModal] || (activeModal !== 'calendar' && !validateInputs(activeModal))}
            >
              {activeModal === 'calendar' ? 'Sync Calendar' : `Get ${tools.find(t => t.id === activeModal)?.name}`}
            </Button>
          </div>
        </div>
      );
    }

    // Show results if we have them
    const data = toolData[activeModal];
    if (data?.error) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Error</h3>
          <p className="text-red-600 mb-4">{data.message}</p>
          <Button onClick={() => setShowInputForm(true)} variant="outline">
            Try Again
          </Button>
        </div>
      );
    }

    switch (activeModal) {
      case 'budget':
        return (
          <div className="space-y-4">
            {data.total && (
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-green-700">${data.total}</h3>
                <p className="text-green-600">Total Estimated Budget</p>
              </div>
            )}
            
            {data.breakdown && (
              <div>
                <h4 className="font-semibold mb-2">Budget Breakdown</h4>
                <div className="space-y-2">
                  {data.breakdown.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-medium">{item.category}</span>
                      <div className="text-right">
                        <span className="font-bold">${item.amount}</span>
                        <Badge variant="secondary" className="ml-2">
                          {item.percentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {data.recommendations && (
              <div>
                <h4 className="font-semibold mb-2">Money-Saving Tips</h4>
                <ul className="space-y-1">
                  {data.recommendations.map((tip, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'weather':
        return (
          <div className="space-y-4">
            {data.current && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Thermometer className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="text-2xl font-bold text-blue-700">{data.current.temperature}°C</h3>
                <p className="text-blue-600">{data.current.condition}</p>
                <div className="flex justify-center gap-4 mt-2 text-sm">
                  <span className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {data.current.humidity}% humidity
                  </span>
                  <span className="flex items-center">
                    <Wind className="h-4 w-4 mr-1" />
                    {data.current.windSpeed} km/h
                  </span>
                </div>
              </div>
            )}

            {data.forecast && (
              <div>
                <h4 className="font-semibold mb-2">Forecast</h4>
                <div className="grid grid-cols-2 gap-2">
                  {data.forecast.map((day, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-center">
                      <div className="font-medium text-sm">{day.date}</div>
                      <div className="text-lg font-bold">{day.high}° / {day.low}°</div>
                      <div className="text-xs text-gray-600">{day.condition}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'transportation':
        return (
          <div className="space-y-4">
            {/* Summary Message */}
            {data.message && (
              <div className={`p-3 rounded-lg ${data.summary?.hasResults ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
                <p className="text-sm font-medium">{data.message}</p>
                <div className="text-xs mt-2 space-y-1">
                  <p className="flex items-center gap-1">
                    <span className="font-medium">Route:</span> {data.origin} → {data.destination}
                  </p>
                  <p className="flex items-center gap-1">
                    <span className="font-medium">Date:</span> {data.searchDate} • 
                    <span className="font-medium">Passengers:</span> {data.passengers} •
                    <span className="font-medium">Type:</span> {data.transportType === 'flight' ? '✈️ Flights' : '🚄 Trains'}
                  </p>
                  {(data.originalOrigin !== data.origin || data.originalDestination !== data.destination) && (
                    <p className="text-blue-600 bg-blue-100 px-2 py-1 rounded">
                      ℹ️ City names auto-corrected: {data.originalOrigin} → {data.originalDestination}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Flights Section */}
            {data.transportType === 'flight' && (
              <div>
                {data.flights && data.flights.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Plane className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold">Available Flights ({data.flights.length})</h4>
                    </div>
                    <div className="space-y-3">
                      {data.flights.map((flight, index) => (
                        <div key={index} className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-semibold text-blue-900 text-lg">{flight.airline}</h5>
                              <p className="text-sm text-blue-700 font-medium">Flight {flight.flightNumber}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-blue-800 border-blue-300 font-semibold text-sm px-3 py-1">
                                {flight.price}
                              </Badge>
                              {flight.stops > 0 && (
                                <p className="text-xs text-blue-600 mt-1 font-medium">{flight.stops} stop(s)</p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm bg-white/50 rounded p-3">
                            <div>
                              <p className="text-gray-600 font-medium">Departure</p>
                              <p className="font-semibold text-gray-900">{flight.departure}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">Arrival</p>
                              <p className="font-semibold text-gray-900">{flight.arrival}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">Duration</p>
                              <p className="font-semibold text-gray-900">{flight.duration}</p>
                            </div>
                          </div>
                          {flight.aircraft !== 'N/A' && (
                            <p className="text-xs text-gray-600 mt-2 bg-white/30 rounded px-2 py-1 inline-block">
                              Aircraft: {flight.aircraft}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <Plane className="h-16 w-16 text-gray-300 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">✈️ No Flights Found</h3>
                    <p className="text-gray-600 mb-4">Sorry, we couldn't find any flights for this route.</p>
                    <div className="text-sm text-gray-500 space-y-2 mb-6">
                      <p>• Try selecting different travel dates</p>
                      <p>• Check if city names are spelled correctly</p>
                      <p>• Consider nearby airports</p>
                      <p>• Some routes may not have direct flights</p>
                    </div>
                    <Button 
                      onClick={() => setShowInputForm(true)} 
                      variant="outline" 
                      className="bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      🔍 Search Again
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Trains Section */}
            {data.transportType === 'train' && (
              <div>
                {data.trains && data.trains.length > 0 ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Train className="h-5 w-5 text-green-600" />
                      <h4 className="font-semibold">Available Trains ({data.trains.length})</h4>
                    </div>
                    <div className="space-y-3">
                      {data.trains.map((train, index) => (
                        <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50/30 hover:bg-green-50/50 transition-colors">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-semibold text-green-900 text-lg">{train.trainName}</h5>
                              <p className="text-sm text-green-700 font-medium">Train {train.trainNumber}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline" className="text-green-800 border-green-300 font-semibold text-sm px-3 py-1">
                                {train.price}
                              </Badge>
                              <p className="text-xs text-green-600 mt-1 font-medium">{train.class}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm bg-white/50 rounded p-3">
                            <div>
                              <p className="text-gray-600 font-medium">Departure</p>
                              <p className="font-semibold text-gray-900">{train.departure}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">Arrival</p>
                              <p className="font-semibold text-gray-900">{train.arrival}</p>
                            </div>
                            <div>
                              <p className="text-gray-600 font-medium">Duration</p>
                              <p className="font-semibold text-gray-900">{train.duration}</p>
                            </div>
                          </div>
                          {train.operator !== 'N/A' && (
                            <p className="text-xs text-gray-600 mt-2 bg-white/30 rounded px-2 py-1 inline-block">
                              Operator: {train.operator}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <Train className="h-16 w-16 text-gray-300 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">🚄 No Trains Found</h3>
                    <p className="text-gray-600 mb-4">Sorry, we couldn't find any trains for this route.</p>
                    <div className="text-sm text-gray-500 space-y-2 mb-6">
                      <p>• Try selecting different travel dates</p>
                      <p>• Check if city names are spelled correctly</p>
                      <p>• Consider nearby train stations</p>
                      <p>• Some routes may require connecting trains</p>
                    </div>
                    <Button 
                      onClick={() => setShowInputForm(true)} 
                      variant="outline" 
                      className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                    >
                      🔍 Search Again
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Errors */}
            {data.errors && data.errors.length > 0 && (
              <div className="bg-red-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-1">Service Issues:</h4>
                <ul className="text-xs text-red-700 list-disc list-inside">
                  {data.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      case 'calendar':
        return (
          <div className="space-y-4">
            {data.success && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-blue-700">Calendar Sync Complete</h3>
                <p className="text-blue-600">{data.message}</p>
                {data.events_created && (
                  <Badge variant="secondary" className="mt-2">
                    {data.events_created} events created
                  </Badge>
                )}
              </div>
            )}

            {data.created_events && (
              <div>
                <h4 className="font-semibold mb-2">Synchronized Events</h4>
                <div className="space-y-2">
                  {data.created_events.map((event, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded">
                      <div className="font-medium">{event.name}</div>
                      <div className="text-sm text-gray-600">Event ID: {event.event_id}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={() => window.open('https://calendar.google.com', '_blank')}
                variant="outline"
                size="sm"
              >
                Open Google Calendar
              </Button>
            </div>
          </div>
        );

      default:
        return <div>No data available</div>;
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="relative">
          {/* Main FAB */}
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-14 h-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <motion.div
              animate={{ rotate: isExpanded ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-xl">+</span>
            </motion.div>
          </Button>

          {/* Tool Icons */}
          <AnimatePresence>
            {isExpanded && (
              <div className="absolute bottom-16 right-0 flex flex-col gap-3">
                {tools.map((tool, index) => {
                  const Icon = tool.icon;
                  const isLoading = loadingTool === tool.id;
                  
                  return (
                    <motion.div
                      key={tool.id}
                      initial={{ opacity: 0, y: 20, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.8 }}
                      transition={{ 
                        duration: 0.2, 
                        delay: index * 0.1,
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                      }}
                    >
                      <Button
                        onClick={() => handleToolClick(tool.id)}
                        disabled={isLoading}
                        className={`w-12 h-12 rounded-full shadow-lg ${tool.bgColor} ${tool.hoverColor} text-white flex items-center justify-center group relative`}
                        title={tool.description}
                      >
                        {isLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                        
                        {/* Tooltip */}
                        <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          {tool.name}
                          <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-black"></div>
                        </div>
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal with high z-index */}
      <Dialog open={!!activeModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto fixed z-[99999] bg-white shadow-2xl border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeModal && (
                <>
                  {React.createElement(tools.find(t => t.id === activeModal)?.icon || Info, {
                    className: `h-5 w-5 ${tools.find(t => t.id === activeModal)?.color}`
                  })}
                  {tools.find(t => t.id === activeModal)?.name} Analysis
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {renderModalContent()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Backdrop to close expanded menu */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-20"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingToolIcons;