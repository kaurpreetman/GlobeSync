'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { X, MapPin, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface Trip {
  id: string;
  location: string;
  date: string;
  budget: string;
  destination: string;
}

interface TripHistorySidebarProps {
  trips: Trip[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTrip: (trip: Trip) => void;
  selectedTripId?: string;
}

const TripHistorySidebar: React.FC<TripHistorySidebarProps> = ({
  trips,
  isOpen,
  onClose,
  onSelectTrip,
  selectedTripId,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          className="fixed right-0 top-0 h-full w-96 bg-white shadow-lg z-50"
        >
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="font-bold text-lg">Trip History</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="p-4 space-y-4 overflow-y-auto">
            {trips.map(trip => (
              <Card
                key={trip.id}
                onClick={() => onSelectTrip(trip)}
                className={`cursor-pointer ${selectedTripId === trip.id ? 'border-blue-500' : ''}`}
              >
                <CardContent className="p-4">
                  <h3 className="font-bold">{trip.location}</h3>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-1" /> {trip.date}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="w-4 h-4 mr-1" /> {trip.budget}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-1" /> {trip.destination}
                  </div>
                  {selectedTripId === trip.id && <Badge className="mt-2">Active</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="p-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TripHistorySidebar;
