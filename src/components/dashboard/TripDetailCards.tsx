'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Cloud, Plane, TrendingUp, ArrowRight, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface BudgetCategory {
  name: string;
  amount: string;
  percentage: number;
}

export interface WeatherDay {
  day: string;
  temp: string;
  condition: string;
  icon: string;
}

export interface TravelOption {
  type: string;
  provider: string;
  duration: string;
  price: string;
}

interface TripDetailCardsProps {
  budget: { total: string; categories: BudgetCategory[] };
  weather: WeatherDay[];
  travelOptions: TravelOption[];
}

const TripDetailCards: React.FC<TripDetailCardsProps> = ({ budget, weather, travelOptions }) => {
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
    }),
  };

  return (
    <div className="space-y-4">
      {/* Budget */}
      <motion.div custom={0} initial="hidden" animate="visible" variants={cardVariants}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <DollarSign className="w-5 h-5 mr-2" />
              Budget
            </CardTitle>
            <CardDescription>{budget.total} allocated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budget.categories.map((cat, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm">
                  <span>{cat.name}</span>
                  <span>{cat.amount}</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full">
                  <motion.div
                    className="bg-green-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.percentage}%` }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Weather */}
      <motion.div custom={1} initial="hidden" animate="visible" variants={cardVariants}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Cloud className="w-5 h-5 mr-2" />
              Weather
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weather.map((w, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between">
                  <span>{w.day} - {w.condition}</span>
                  <span>{w.temp}</span>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Travel */}
      <motion.div custom={2} initial="hidden" animate="visible" variants={cardVariants}>
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-purple-800">
              <Plane className="w-5 h-5 mr-2" />
              Travel Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {travelOptions.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between">
                  <span>{t.type} - {t.provider}</span>
                  <span>{t.price}</span>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default TripDetailCards;
