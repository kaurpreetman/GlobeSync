'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, ArrowRight, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BudgetCategory {
  name: string;
  amount: string;
  percentage: number;
}

interface BudgetOverviewProps {
  budget: {
    total: string;
    categories: BudgetCategory[];
  };
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ budget }) => {
  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
          <CardTitle className="flex items-center text-green-800">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            Budget Overview
          </CardTitle>
          <CardDescription className="text-green-600">
            {budget.total} total budget allocated
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Total Budget Display */}
          <div className="text-center p-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl text-white">
            <div className="text-3xl font-bold mb-2">{budget.total}</div>
            <div className="text-green-100">Total Trip Budget</div>
          </div>

          {/* Category Breakdown */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <PieChart className="w-4 h-4 mr-2" />
              Expense Categories
            </h3>
            
            {budget.categories.map((category, index) => (
              <motion.div
                key={category.name}
                className="space-y-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">{category.name}</span>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{category.amount}</div>
                    <Badge variant="secondary" className="text-xs">
                      {category.percentage}%
                    </Badge>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${category.percentage}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.1 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="space-y-3 pt-4 border-t">
            <Button variant="outline" className="w-full justify-between group">
              <span className="flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Spending Analysis
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button variant="outline" className="w-full justify-between group">
              <span className="flex items-center">
                <DollarSign className="w-4 h-4 mr-2" />
                Update Budget
              </span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetOverview;