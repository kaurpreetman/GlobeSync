"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, Sun, Droplets, Thermometer, Wind } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WeatherDay {
  day: string;
  temp: string;
  condition: string;
}

interface WeatherPanelProps {
  weather?: {
    current?: WeatherDay;
    forecast?: WeatherDay[];
  };
}

const WeatherPanel: React.FC<WeatherPanelProps> = ({ weather }) => {
  if (!weather) return <div className="p-6 text-gray-500">No weather data available.</div>;

  const current = weather.current || weather.forecast?.[0];

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
            {weather.forecast?.length ?? 0}-day outlook
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Current Weather */}
          {current && (
            <div className="p-6 bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl text-white mb-6">
              <div className="text-2xl font-bold">{current.temp}</div>
              <div className="text-sky-100">{current.condition}</div>
              <div className="text-sm text-sky-200 mt-1">Current</div>
            </div>
          )}

          {/* Forecast */}
          <div className="space-y-3">
            {weather.forecast?.map((day, index) => (
              <motion.div
                key={day.day}
                className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:shadow-md transition-all duration-200"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="flex items-center space-x-4">
                  <div>
                    <div className="font-semibold text-gray-900">{day.day}</div>
                    <div className="text-sm text-gray-600 flex items-center">{day.condition}</div>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherPanel;
