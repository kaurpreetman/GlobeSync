'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Cloud, Plane, TrendingUp, Eye, ArrowRight, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BudgetCategory {
  name: string;
  amount: string;
  percentage: number;
}

interface WeatherDay {
  day: string;
  temp: string;
  condition: string;
  icon: string;
}

interface TravelOption {
  type: string;
  provider: string;
  duration: string;
  price: string;
}

interface TripDetailCardsProps {
  budget: {
    total: string;
    categories: BudgetCategory[];
  };
  weather: WeatherDay[];
  travelOptions: TravelOption[];
}

const TripDetailCards: React.FC<TripDetailCardsProps> = ({ budget, weather, travelOptions }) => {
  // Define card animation variants
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
    }),
  };

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

  return (
    <div className="space-y-4">
      {/* Budget Overview */}
      <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants}>
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
            <CardTitle className="flex items-center text-green-800">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              Budget Overview
            </CardTitle>
            <CardDescription className="text-green-600">{budget.total} total budget allocated</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {budget.categories.map((category, index) => (
              <motion.div
                key={category.name}
                className="space-y-2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">{category.name}</span>
                  <span className="font-bold text-gray-900">{category.amount}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${category.percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                  />
                </div>
                <div className="flex justify-end">
                  <Badge variant="secondary" className="text-xs">
                    {category.percentage}%
                  </Badge>
                </div>
              </motion.div>
            ))}
            <Button variant="outline" className="w-full mt-6 group-hover:border-green-500 transition-colors">
              <TrendingUp className="w-4 h-4 mr-2" />
              Detailed Breakdown
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Weather Forecast */}
      <motion.div custom={1} initial="hidden" animate="visible" variants={cardVariants}>
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-t-lg">
            <CardTitle className="flex items-center text-blue-800">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-sky-500 rounded-lg flex items-center justify-center mr-3">
                <Cloud className="w-5 h-5 text-white" />
              </div>
              Weather Forecast
            </CardTitle>
            <CardDescription className="text-blue-600">5-day weather outlook</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {weather.map((day, index) => (
              <motion.div
                key={day.day}
                className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-white border border-gray-100 hover:shadow-md transition-all duration-200"
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-r ${getWeatherGradient(
                      day.condition
                    )} flex items-center justify-center text-2xl`}
                  >
                    {day.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{day.day}</div>
                    <div className="text-sm text-gray-600">{day.condition}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xl text-gray-900">{day.temp}</div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Travel Options */}
      <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants}>
        <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-lg">
            <CardTitle className="flex items-center text-purple-800">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center mr-3">
                <Plane className="w-5 h-5 text-white" />
              </div>
              Travel Options
            </CardTitle>
            <CardDescription className="text-purple-600">Available transportation</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {travelOptions.map((option, index) => (
              <motion.div
                key={index}
                className="p-4 rounded-lg bg-gradient-to-r from-white to-gray-50 border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                whileHover={{ scale: 1.02, y: -2 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant="outline" className="text-purple-600 border-purple-200">
                        {option.type}
                      </Badge>
                    </div>
                    <div className="font-semibold text-gray-900 mb-1">{option.provider}</div>
                    <div className="text-sm text-gray-600">{option.duration}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-purple-600">{option.price}</div>
                    <Button size="sm" variant="ghost" className="mt-2 flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-blue-800">AI Suggestions</h4>
                  <p className="text-sm text-blue-600">Get personalized activity recommendations</p>
                </div>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 flex items-center">
                  <Bot className="w-4 h-4 mr-2" />
                  Get Ideas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default TripDetailCards;
