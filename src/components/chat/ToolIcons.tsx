"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  DollarSign, 
  Calendar, 
  CloudRain, 
  Car, 
  Loader2, 
  MapPin,
  Users,
  Clock,
  Thermometer,
  Wind,
  Eye,
  Info
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";

interface ToolIconsProps {
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
  budget?: {
    total: number;
    breakdown: Array<{ category: string; amount: number; percentage: number }>;
    recommendations: string[];
  };
  weather?: {
    current: {
      temperature: number;
      condition: string;
      humidity: number;
      windSpeed: number;
    };
    forecast: Array<{
      date: string;
      high: number;
      low: number;
      condition: string;
    }>;
  };
  transportation?: {
    options: Array<{
      mode: string;
      duration: string;
      cost: string;
      description: string;
    }>;
  };
  calendar?: {
    events: Array<{
      name: string;
      date: string;
      time: string;
    }>;
    syncStatus: string;
  };
}

const ToolIcons: React.FC<ToolIconsProps> = ({ tripContext, sessionId, onToolResult }) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [loadingTool, setLoadingTool] = useState<string | null>(null);
  const [toolData, setToolData] = useState<ToolData>({});
  const [toolInputs, setToolInputs] = useState<{[key: string]: any}>({});

  const tools = [
    {
      id: 'budget',
      name: 'Budget Overview',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      description: 'Get detailed budget breakdown and cost optimization suggestions'
    },
    {
      id: 'calendar',
      name: 'Calendar Sync',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      description: 'Sync trip events to your Google Calendar'
    },
    {
      id: 'weather',
      name: 'Weather Forecast',
      icon: CloudRain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      description: 'Get weather forecast and packing recommendations'
    },
    {
      id: 'transportation',
      name: 'Transport Options',
      icon: Car,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100',
      description: 'Compare transportation options and routes'
    }
  ];

  const handleToolClick = async (toolId: string) => {
    setLoadingTool(toolId);
    setActiveModal(toolId);

    try {
      let apiEndpoint = '';
      let requestBody = {};

      switch (toolId) {
        case 'budget':
          apiEndpoint = '/api/tools/budget';
          requestBody = {
            destination: tripContext?.city || 'Unknown',
            duration: parseInt(tripContext?.duration || '3'),
            tripType: tripContext?.tripType || 'leisure',
            currentBudget: tripContext?.budget ? parseFloat(tripContext.budget.replace(/[^0-9.]/g, '')) : 1000
          };
          break;

        case 'weather':
          apiEndpoint = '/api/tools/weather';
          requestBody = {
            destination: tripContext?.city || 'Unknown',
            startDate: new Date().toISOString().split('T')[0],
            duration: parseInt(tripContext?.duration || '3')
          };
          break;

        case 'transportation':
          apiEndpoint = '/api/tools/transportation';
          requestBody = {
            origin: tripContext?.origin || 'Unknown',
            destination: tripContext?.city || 'Unknown',
            tripType: tripContext?.tripType || 'leisure'
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
            toast({
              title: "Calendar Sync Unavailable",
              description: "Please ensure you're logged in and have an active trip session.",
              variant: "destructive"
            });
            setLoadingTool(null);
            setActiveModal(null);
            return;
          }
          break;

        default:
          setLoadingTool(null);
          return;
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`${toolId} request failed`);
      }

      const result = await response.json();
      
      // Update tool data
      setToolData(prev => ({
        ...prev,
        [toolId]: result
      }));

      // Notify parent component
      onToolResult?.(toolId, result);

      toast({
        title: `${tools.find(t => t.id === toolId)?.name} Updated`,
        description: `Successfully fetched ${toolId} information.`
      });

    } catch (error) {
      console.error(`${toolId} tool error:`, error);
      toast({
        title: "Tool Error",
        description: `Failed to fetch ${toolId} information. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setLoadingTool(null);
    }
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  const renderModalContent = () => {
    if (!activeModal || !toolData[activeModal]) {
      return (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading...</span>
        </div>
      );
    }

    const data = toolData[activeModal];

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
            {data.options && (
              <div>
                <h4 className="font-semibold mb-2">Transportation Options</h4>
                <div className="space-y-3">
                  {data.options.map((option, index) => (
                    <div key={index} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium flex items-center">
                          <Car className="h-4 w-4 mr-2" />
                          {option.mode}
                        </span>
                        <Badge variant="outline">{option.cost}</Badge>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <Clock className="h-4 w-4 mr-1" />
                        {option.duration}
                      </div>
                      <p className="text-sm">{option.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'calendar':
        return (
          <div className="space-y-4">
            {data.syncStatus && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h3 className="text-lg font-bold text-blue-700">Calendar Sync Complete</h3>
                <p className="text-blue-600">{data.syncStatus}</p>
                {data.events_created && (
                  <Badge variant="secondary" className="mt-2">
                    {data.events_created} events created
                  </Badge>
                )}
              </div>
            )}

            {data.events && (
              <div>
                <h4 className="font-semibold mb-2">Synchronized Events</h4>
                <div className="space-y-2">
                  {data.events.map((event, index) => (
                    <div key={index} className="p-2 bg-gray-50 rounded">
                      <div className="font-medium">{event.name}</div>
                      <div className="text-sm text-gray-600">{event.date} at {event.time}</div>
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
      {/* Tool Icons */}
      <div className="flex justify-center gap-2 p-3 bg-white border-t">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isLoading = loadingTool === tool.id;
          
          return (
            <Button
              key={tool.id}
              variant="ghost"
              size="sm"
              className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${tool.hoverColor}`}
              onClick={() => handleToolClick(tool.id)}
              disabled={isLoading}
              title={tool.description}
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Icon className={`h-5 w-5 ${tool.color}`} />
              )}
              <span className="text-xs font-medium">{tool.name.split(' ')[0]}</span>
            </Button>
          );
        })}
      </div>

      {/* Modal */}
      <Dialog open={!!activeModal} onOpenChange={closeModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeModal && (
                <>
                  {React.createElement(tools.find(t => t.id === activeModal)?.icon || Info, {
                    className: `h-5 w-5 ${tools.find(t => t.id === activeModal)?.color}`
                  })}
                  {tools.find(t => t.id === activeModal)?.name}
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            {renderModalContent()}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ToolIcons;