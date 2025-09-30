'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, Thermometer, Wind, Droplets, Sun } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WeatherDay {
  day: string;
  temp: string;
  condition: string;
  icon: string;
}

interface WeatherPanelProps {
  weather: WeatherDay[];
}

const WeatherPanel: React.FC<WeatherPanelProps> = ({ weather }) => {
  const getWeatherGradient = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
        return 'from-yellow-400 to-orange-400';
      case 'partly cloudy':
        return 'from-blue-400 to-gray-400';
      case 'rainy':
        return 'from-blue-600 to-indigo-600';
      case 'cloudy':
        return 'from-gray-400 to-gray-600';
      default:
        return 'from-blue-400 to-indigo-400';
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
        return <Sun className="w-5 h-5 text-yellow-500" />;
      case 'partly cloudy':
        return <Cloud className="w-5 h-5 text-blue-500" />;
      case 'rainy':
        return <Droplets className="w-5 h-5 text-blue-600" />;
      case 'cloudy':
        return <Cloud className="w-5 h-5 text-gray-500" />;
      default:
        return <Cloud className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-t-lg">
          <CardTitle className="flex items-center text-sky-800">
            <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            Weather Forecast
          </CardTitle>
          <CardDescription className="text-sky-600">
            5-day weather outlook for your trip
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Current Weather Highlight */}
          <div className="p-6 bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl text-white mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{weather[0]?.temp}</div>
                <div className="text-sky-100">{weather[0]?.condition}</div>
                <div className="text-sm text-sky-200 mt-1">Right now in Tokyo</div>
              </div>
              <div className="text-4xl">{weather[0]?.icon}</div>
            </div>
            
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="text-sky-100">
                <Wind className="w-4 h-4 mx-auto mb-1" />
                <div className="text-xs">Wind</div>
                <div className="text-sm font-semibold">12 km/h</div>
              </div>
              <div className="text-sky-100">
                <Droplets className="w-4 h-4 mx-auto mb-1" />
                <div className="text-xs">Humidity</div>
                <div className="text-sm font-semibold">65%</div>
              </div>
              <div className="text-sky-100">
                <Thermometer className="w-4 h-4 mx-auto mb-1" />
                <div className="text-xs">Feels like</div>
                <div className="text-sm font-semibold">25°C</div>
              </div>
            </div>
          </div>

          {/* 5-Day Forecast */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Cloud className="w-4 h-4 mr-2" />
              5-Day Forecast
            </h3>
            
            {weather.map((day, index) => (
              <motion.div
                key={day.day}
                className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:shadow-md transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-r ${getWeatherGradient(
                      day.condition
                    )} flex items-center justify-center text-2xl shadow-md`}
                  >
                    {day.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{day.day}</div>
                    <div className="text-sm text-gray-600 flex items-center">
                      {getWeatherIcon(day.condition)}
                      <span className="ml-1">{day.condition}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl text-gray-900">{day.temp}</div>
                  {index === 0 && (
                    <Badge variant="default" className="text-xs mt-1">
                      Today
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Weather Tips */}
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Weather Tips</h4>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• Pack an umbrella for Wednesday</li>
              <li>• Perfect weather for outdoor activities Thu-Fri</li>
              <li>• Light jacket recommended for evenings</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherPanel;