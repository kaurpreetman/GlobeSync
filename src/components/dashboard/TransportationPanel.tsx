'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Train, Plane, Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface TransportData {
  line?: string;       // For trains
  airport?: string;    // For flights
  airline?: string;    // For flights
  status: string;
  nextTrain?: string;
  destination?: string;
  gate?: string;
  departure?: string;
}

interface TransportationPanelProps {
  title: string;
  data: TransportData[];
  type: 'train' | 'airport';
}

const TransportationPanel: React.FC<TransportationPanelProps> = ({ title, data, type }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on time': return 'text-green-600 bg-green-50 border-green-200';
      case 'delayed': return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on time': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'delayed': return <AlertCircle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const HeaderIcon = type === 'train' ? Train : Plane;

  return (
    <Card className="border-0 shadow-lg h-fit max-h-[500px]">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg pb-4">
        <CardTitle className="flex items-center text-lg">
          <HeaderIcon className="w-5 h-5 mr-2" />
          {title}
        </CardTitle>
        <CardDescription>Real-time {type} information</CardDescription>
      </CardHeader>

      <CardContent className="p-4 space-y-3 overflow-y-auto max-h-[350px]">
          {data.length === 0 ? (
            <p className="text-gray-500 text-sm">No live data available</p>
          ) : (
            data.map((item, index) => (
              <motion.div
                key={index}
                className="p-3 rounded-lg bg-white border border-gray-200 hover:shadow-md transition-all duration-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    {item.line || item.airline || item.airport}
                  </h3>
                  <Badge className={`border ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    <span className="ml-1">{item.status}</span>
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                  {type === 'train' ? (
                    <>
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-2 text-blue-500" />
                        Next: {item.nextTrain || 'N/A'}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-red-500" />
                        To: {item.destination || 'N/A'}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                        Gate: {item.gate || 'N/A'}
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-2 text-orange-500" />
                        Departs: {item.departure || 'N/A'}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            ))
          )}
      </CardContent>
    </Card>
  );
};

export default TransportationPanel;
