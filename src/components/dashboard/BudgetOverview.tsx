"use client";

import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, PieChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BudgetCategory {
  name: string;
  amount: string;
  percentage: number;
}

interface BudgetOverviewProps {
  budget?: {
    total?: string;
    categories?: BudgetCategory[];
  };
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ budget }) => {
  if (!budget) {
    return <div className="p-6 text-gray-500">No budget data available.</div>;
  }

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
            {budget.total ? `${budget.total} total budget` : "No total specified"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Category Breakdown */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <PieChart className="w-4 h-4 mr-2" />
              Expense Categories
            </h3>

            {budget.categories?.length ? (
              budget.categories.map((category, index) => (
                <motion.div
                  key={category.name}
                  className="space-y-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
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
                      transition={{ duration: 0.6, delay: 0.1 + index * 0.05 }}
                    />
                  </div>
                </motion.div>
              ))
            ) : (
              <p className="text-gray-500">No expense categories provided.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetOverview;
