'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Train, Plane, Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TransportData {
  line?: string;
  airport?: string;
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
      case 'on time':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'delayed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'on time':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'delayed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600" />;
    }
  };

  const HeaderIcon = type === 'train' ? Train : Plane;
  const headerGradient = type === 'train' 
    ? 'from-purple-50 to-violet-50' 
    : 'from-orange-50 to-red-50';
  const headerTextColor = type === 'train' ? 'text-purple-800' : 'text-orange-800';
  const headerIconGradient = type === 'train' 
    ? 'from-purple-500 to-violet-500' 
    : 'from-orange-500 to-red-500';

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 border-0 shadow-lg">
        <CardHeader className={`bg-gradient-to-r ${headerGradient} rounded-t-lg`}>
          <CardTitle className={`flex items-center ${headerTextColor}`}>
            <div className={`w-10 h-10 bg-gradient-to-r ${headerIconGradient} rounded-lg flex items-center justify-center mr-3`}>
              <HeaderIcon className="w-5 h-5 text-white" />
            </div>
            {title}
          </CardTitle>
          <CardDescription className={headerTextColor.replace('800', '600')}>
            Real-time {type} information
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Live Status Header */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-sm font-medium text-gray-700">Live Updates</span>
            </div>
            <Badge variant="outline" className="text-xs">
              Last updated: Now
            </Badge>
          </div>

          {data.map((item, index) => (
            <motion.div
              key={index}
              className="p-4 rounded-lg bg-gradient-to-r from-white to-gray-50 border border-gray-200 hover:shadow-md transition-all duration-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="space-y-3">
                {/* Line/Airport Name */}
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center">
                    {type === 'train' ? (
                      <Train className="w-4 h-4 mr-2 text-purple-600" />
                    ) : (
                      <Plane className="w-4 h-4 mr-2 text-orange-600" />
                    )}
                    {item.line || item.airport}
                  </h3>
                  <Badge className={`border ${getStatusColor(item.status)}`}>
                    {getStatusIcon(item.status)}
                    <span className="ml-1">{item.status}</span>
                  </Badge>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {type === 'train' ? (
                    <>
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-2 text-blue-500" />
                        <div>
                          <div className="text-xs opacity-75">Next train</div>
                          <div className="font-semibold">{item.nextTrain}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-red-500" />
                        <div>
                          <div className="text-xs opacity-75">Destination</div>
                          <div className="font-semibold">{item.destination}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                        <div>
                          <div className="text-xs opacity-75">Gate</div>
                          <div className="font-semibold">{item.gate}</div>
                        </div>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-2 text-orange-500" />
                        <div>
                          <div className="text-xs opacity-75">Departure</div>
                          <div className="font-semibold">{item.departure}</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Status Bar */}
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-1000 ${
                      item.status === 'On Time' ? 'bg-green-500 w-full' : 
                      item.status === 'Delayed' ? 'bg-red-500 w-3/4' : 'bg-gray-400 w-0'
                    }`}
                  />
                </div>
              </div>
            </motion.div>
          ))}

          {/* Quick Actions */}
          <div className="space-y-3 pt-4 border-t">
            <Button 
              variant="outline" 
              className={`w-full ${type === 'train' ? 'hover:border-purple-500' : 'hover:border-orange-500'}`}
            >
              <HeaderIcon className="w-4 h-4 mr-2" />
              View Full Schedule
            </Button>
            
            <Button 
              variant="outline" 
              className={`w-full ${type === 'train' ? 'hover:border-purple-500' : 'hover:border-orange-500'}`}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Nearby Stations
            </Button>
          </div>

          {/* Tips */}
          <div className={`p-4 rounded-lg ${type === 'train' ? 'bg-purple-50' : 'bg-orange-50'}`}>
            <h4 className={`font-semibold mb-2 ${type === 'train' ? 'text-purple-800' : 'text-orange-800'}`}>
              {type === 'train' ? 'Train Tips' : 'Airport Tips'}
            </h4>
            <ul className={`text-sm space-y-1 ${type === 'train' ? 'text-purple-600' : 'text-orange-600'}`}>
              {type === 'train' ? (
                <>
                  <li>• JR Pass covers most major lines</li>
                  <li>• Rush hours: 7-9 AM, 5-7 PM</li>
                  <li>• Download Google Translate for signs</li>
                </>
              ) : (
                <>
                  <li>• Arrive 2 hours before international flights</li>
                  <li>• Check-in online to save time</li>
                  <li>• Free WiFi available throughout terminals</li>
                </>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransportationPanel;