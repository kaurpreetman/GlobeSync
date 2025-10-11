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
    <Card className="border-0 shadow-lg h-fit max-h-[500px]">
      <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-t-lg pb-4">
        <CardTitle className="flex items-center text-sky-800 text-lg">
          <div className="w-8 h-8 bg-gradient-to-r from-sky-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
            <Cloud className="w-4 h-4 text-white" />
          </div>
          Weather Forecast
        </CardTitle>
        <CardDescription className="text-sky-600">
          {weather.forecast?.length ?? 0}-day outlook
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 space-y-4 overflow-y-auto max-h-[350px]">
          {/* Current Weather */}
          {current && (
            <div className="p-4 bg-gradient-to-r from-sky-500 to-blue-500 rounded-xl text-white mb-4">
              <div className="text-xl font-bold">{current.temp}</div>
              <div className="text-sky-100 text-sm">{current.condition}</div>
              <div className="text-xs text-sky-200 mt-1">Current</div>
            </div>
          )}

          {/* Forecast */}
          <div className="space-y-2">
            {weather.forecast?.map((day, index) => (
              <motion.div
                key={day.day}
                className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:shadow-md transition-all duration-200"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="flex items-center space-x-3">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{day.day}</div>
                    <div className="text-xs text-gray-600">{day.condition}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg text-gray-900">{day.temp}</div>
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
  );
};

export default WeatherPanel;
