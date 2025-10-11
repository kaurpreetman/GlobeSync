"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, MapPin, Clock, Plus, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProtectedRoute from "@/components/ProtectedRoute";
import Link from "next/link";
import { formatTripDate } from "@/lib/utils/dateUtils";

interface TripCard {
  _id: string;
  title: string;
  basic_info: {
    origin?: string;
    city?: string;
    duration?: string;
    month?: string;
    tripType?: string;
    budget?: string;
  };
  messages: any[];
  createdAt: string;
  updatedAt: string;
  route_data?: any;
}

export default function TripsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [trips, setTrips] = useState<TripCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user?.id) {
      console.log("User session found, fetching trips for:", session.user.id);
      fetchTrips();
    } else {
      console.log("No user session found");
    }
  }, [session?.user?.id]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError("");
      
      console.log("Fetching trips for user:", session?.user?.id);
      const res = await fetch(`/api/chat/user/${session?.user?.id}`);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("API Error:", res.status, errorText);
        throw new Error(`Failed to fetch trips: ${res.status}`);
      }
      
      const data = await res.json();
      console.log("Trips data received:", data);
      
      // Ensure data is an array
      const tripsArray = Array.isArray(data) ? data : [];
      setTrips(tripsArray);
      
      console.log(`Found ${tripsArray.length} trips`);
    } catch (err: any) {
      console.error("Error fetching trips:", err);
      setError(err.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  const deleteTrip = async (tripId: string) => {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    
    try {
      const res = await fetch(`/api/chat/${tripId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete trip");
      
      // Remove from local state
      setTrips(trips.filter(trip => trip._id !== tripId));
    } catch (err: any) {
      alert("Failed to delete trip: " + err.message);
    }
  };

  const formatDate = (dateString: string) => {
    return formatTripDate(dateString);
  };

  const getTripSummary = (trip: TripCard) => {
    const { basic_info, title } = trip;
    
    // Use title if available and not generic
    if (title && title !== "New Trip" && title !== "Trip") {
      return title;
    }
    
    if (!basic_info) {
      return title || "Untitled Trip";
    }
    
    const parts = [];
    if (basic_info.origin && basic_info.city) {
      parts.push(`${basic_info.origin} → ${basic_info.city}`);
    } else if (basic_info.city) {
      parts.push(`Trip to ${basic_info.city}`);
    } else if (basic_info.origin) {
      parts.push(`From ${basic_info.origin}`);
    }
    
    if (basic_info.duration) {
      parts.push(`${basic_info.duration} days`);
    }
    
    const summary = parts.join(" • ");
    return summary || title || "Untitled Trip";
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg font-medium text-gray-600">Loading your trips...</div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
              <p className="text-gray-600 mt-1">
                {trips.length === 0 
                  ? "No trips yet. Start planning your first adventure!" 
                  : `${trips.length} trip${trips.length > 1 ? 's' : ''} planned`
                }
              </p>
            </div>
            
            <Button
              onClick={() => router.push("/explore")}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              size="lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Plan New Trip
            </Button>
          </motion.div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 mb-2">{error}</p>
              <div className="text-sm text-red-600">
                <p>Debug info:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>User ID: {session?.user?.id || "Not found"}</li>
                  <li>Session status: {session ? "Active" : "No session"}</li>
                </ul>
              </div>
            </div>
          )}
          
          {/* Debug Section - Only show if no trips and user is logged in */}


          {/* Empty State */}
          {trips.length === 0 && !error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
              <p className="text-gray-600 mb-6">Start planning your first adventure with our AI-powered travel assistant</p>
              <Button
                onClick={() => router.push("/explore")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Plan Your First Trip
              </Button>
            </motion.div>
          ) : (
            /* Trip Cards Grid */
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {trips.map((trip, index) => (
                <motion.div
                  key={trip._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                            {getTripSummary(trip)}
                          </CardTitle>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            {formatDate(trip.createdAt)}
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/trips/${trip._id}`)}
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteTrip(trip._id)}
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {/* Trip Details */}
                      <div className="space-y-3">
                        {trip.basic_info?.origin && trip.basic_info?.city && (
                          <div className="flex items-center text-sm text-gray-600">
                            <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                            <span className="truncate">{trip.basic_info.origin} → {trip.basic_info.city}</span>
                          </div>
                        )}
                        
                        {trip.basic_info?.duration && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="w-4 h-4 mr-2 text-green-500" />
                            <span>{trip.basic_info.duration} days</span>
                          </div>
                        )}
                        
                        {/* Trip Tags */}
                        <div className="flex flex-wrap gap-2">
                          {trip.basic_info?.month && (
                            <Badge variant="secondary" className="text-xs">
                              {trip.basic_info.month}
                            </Badge>
                          )}
                          {trip.basic_info?.tripType && (
                            <Badge variant="outline" className="text-xs">
                              {trip.basic_info.tripType}
                            </Badge>
                          )}
                          {trip.basic_info?.budget && (
                            <Badge variant="outline" className="text-xs">
                              {trip.basic_info.budget} Budget
                            </Badge>
                          )}
                        </div>
                        
                        {/* Messages Count */}
                        <div className="text-xs text-gray-500">
                          {trip.messages?.length || 0} message{(trip.messages?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="mt-4 pt-3 border-t">
                        <Button
                          onClick={() => router.push(`/trips/${trip._id}`)}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                          size="sm"
                        >
                          Open Trip
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}