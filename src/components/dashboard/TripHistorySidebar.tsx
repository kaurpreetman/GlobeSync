'use client';

import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { X, MapPin, Calendar, DollarSign, Clock, Star } from 'lucide-react';
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
  const sidebarVariants: Variants = {
    closed: { x: '100%', opacity: 0 },
    open: {
      x: 0,
      opacity: 1,
      transition: { type: 'spring', damping: 25, stiffness: 200 },
    },
  };

  const backdropVariants: Variants = {
    closed: { opacity: 0 },
    open: { opacity: 1 },
  };

  const tripCardVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.3, ease: 'easeOut' },
    }),
  };

  const getLocationIcon = (location: string) => {
    if (location.includes('Paris')) return '🗼';
    if (location.includes('Tokyo')) return '🏯';
    if (location.includes('Bali')) return '🏝️';
    if (location.includes('New York')) return '🗽';
    return '📍';
  };

  const getLocationColor = (location: string) => {
    if (location.includes('Paris')) return 'from-pink-500 to-rose-500';
    if (location.includes('Tokyo')) return 'from-red-500 to-orange-500';
    if (location.includes('Bali')) return 'from-green-500 to-teal-500';
    if (location.includes('New York')) return 'from-blue-500 to-indigo-500';
    return 'from-gray-500 to-slate-500';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="closed"
            animate="open"
            exit="closed"
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Trip History</h2>
                  <p className="text-blue-100">Your travel memories</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex items-center space-x-4 text-blue-100">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{trips.length} trips</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4" />
                  <span className="text-sm">All adventures</span>
                </div>
              </div>
            </div>

            {/* Trips List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {trips.length > 0 ? (
                trips.map((trip, index) => (
                  <motion.div
                    key={trip.id}
                    custom={index}
                    variants={tripCardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all duration-300 ${
                        selectedTripId === trip.id
                          ? 'border-blue-500 shadow-lg bg-blue-50'
                          : 'hover:shadow-lg border-gray-200'
                      }`}
                      onClick={() => onSelectTrip(trip)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getLocationColor(
                              trip.location
                            )} flex items-center justify-center flex-shrink-0 text-2xl`}
                          >
                            {getLocationIcon(trip.location)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="font-bold text-lg text-gray-900 truncate">
                                {trip.location}
                              </h3>
                              {selectedTripId === trip.id && (
                                <Badge variant="default" className="ml-2">
                                  Active
                                </Badge>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                <span>{trip.date}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <DollarSign className="w-4 h-4 text-green-500" />
                                <span className="font-semibold">{trip.budget}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="w-4 h-4 text-red-500" />
                                <span>{trip.destination}</span>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <Badge variant="secondary" className="text-xs">
                                Completed
                              </Badge>
                              <div className="flex -space-x-1">
                                {[1, 2, 3].map((i) => (
                                  <div
                                    key={i}
                                    className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white"
                                  />
                                ))}
                                <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                                  <span className="text-xs font-bold text-gray-600">+</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`mt-3 opacity-0 transition-opacity duration-200 ${
                            selectedTripId === trip.id ? 'opacity-100' : ''
                          }`}
                        >
                          <div className="w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips yet</h3>
                  <p className="text-gray-600">Your travel history will appear here</p>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 border-t">
              <Button variant="outline" className="w-full" onClick={onClose}>
                Close History
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TripHistorySidebar;
