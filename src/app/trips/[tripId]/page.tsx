"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, MapPin, Calendar, Clock, Users, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ProtectedRoute from "@/components/ProtectedRoute";
import ChatInterface from "@/components/dashboard/ChatInterface";
import CalendarStatusWidget from "@/components/dashboard/CalendarStatusWidget";
import FloatingToolIcons from "@/components/dashboard/FloatingToolIcons";
import dynamic from "next/dynamic";
import { formatDetailedDate } from "@/lib/utils/dateUtils";

const MapComponent = dynamic(() => import("@/components/dashboard/MapComponent"), { ssr: false });

type TripContext = {
  origin?: string;
  city?: string;
  duration?: string;
  month?: string;
  tripType?: string;
  budget?: string;
  [k: string]: any;
} | null;

interface TripData {
  _id: string;
  title: string;
  basic_info: TripContext;
  messages: any[];
  route_data?: any;
  createdAt: string;
  updatedAt: string;
}

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const tripId = params.tripId as string;
  
  const [tripData, setTripData] = useState<TripData | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (tripId) {
      fetchTripData();
    }
  }, [tripId]);

  useEffect(() => {
    if (tripData && session?.user?.id) {
      setupWebSocket();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [tripData, session?.user?.id]);

  const fetchTripData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/chat/${tripId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error("Trip not found");
        }
        throw new Error("Failed to fetch trip data");
      }
      
      const data = await res.json();
      setTripData(data);
      
      // Ensure timestamps are Date objects
      const messagesWithDates = (data.messages || []).map((msg: any) => ({
        ...msg,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        id: msg.id || Date.now().toString() + Math.random()
      }));
      
      setMessages(messagesWithDates);
      setRouteData(data.route_data || null);
      
      // Fetch route data if not available
      if (!data.route_data && data.basic_info?.origin && data.basic_info?.city) {
        fetchRouteData(data.basic_info.origin, data.basic_info.city);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load trip data");
    } finally {
      setLoading(false);
    }
  };

  const fetchRouteData = async (origin: string, destination: string) => {
    try {
      const res = await fetch("/api/chat/map/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: tripId,
          origin,
          destination,
          transportMode: "driving",
        }),
      });
      
      const json = await res.json();
      if (json.success) {
        console.log("🗺️ Route data received for trip:", json.route_data);
        setRouteData(json.route_data);
      } else {
        console.error("Route fetch failed for trip:", json.error);
        setRouteData(null);
      }
    } catch (err) {
      console.error("Route fetch error:", err);
      setRouteData(null);
    }
  };

  const setupWebSocket = () => {
    if (!session?.user?.id || !tripData) return;

    const ws = new WebSocket(`ws://localhost:8000/chat/${session.user.id}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket connected for trip", tripId);
      ws.send(
        JSON.stringify({
          message: "",
          session_data: { basic_info: tripData.basic_info },
        })
      );
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === "typing") {
          setIsTyping(true);
          return;
        }

        setIsTyping(false);

        // Prevent duplicate messages
        setMessages((prev) => {
          const exists = prev.some((m) => m.content === data.message && m.role === "assistant");
          if (exists) return prev;
          
          const assistantMessage = {
            id: Date.now().toString(),
            role: "assistant",
            content: data.message,
            timestamp: new Date(),
            suggested_responses: data.suggested_responses || [],
          };
          
          // Store assistant message in database
          if (session?.user?.id) {
            fetch('/api/chat/store-assistant-message', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                chatId: tripId,
                message: assistantMessage,
                userId: session.user.id
              })
            }).catch(error => {
              console.warn('Failed to store assistant message:', error);
            });
          }
          
          return [
            ...prev,
            assistantMessage
          ];
        });

        // Update route data if provided
        if (data.route_data) {
          setRouteData(data.route_data);
        }
      } catch (err) {
        console.error("Invalid WS message", err);
      }
    };

    ws.onclose = () => {
      console.log("⚠️ WebSocket disconnected");
      setIsTyping(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setIsTyping(false);
    };
  };

  const handleSendMessage = async (content: string) => {
    if (!tripId || !wsRef.current || !tripData) return;

    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);

    wsRef.current.send(
      JSON.stringify({
        message: content,
        session_data: { basic_info: tripData.basic_info },
      })
    );
    setIsTyping(true);

    try {
      await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: tripId, message: userMsg }),
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  };

  const createNewChat = () => {
  router.push("/explore");
};


  const formatDate = (dateString: string) => {
    return formatDetailedDate(dateString);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-lg font-medium text-gray-600">Loading trip...</div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => router.push("/trips")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Trips
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!tripData) return null;

  const getTripTitle = () => {
    const { basic_info } = tripData;
    if (!basic_info) return "Trip";
    
    if (basic_info.origin && basic_info.city) {
      return `${basic_info.origin} to ${basic_info.city}`;
    } else if (basic_info.city) {
      return `Trip to ${basic_info.city}`;
    }
    
    return "Trip";
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 border-b backdrop-blur-sm"
        >
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/trips")}
                className="p-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Trips
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{getTripTitle()}</h1>
                  <p className="text-sm text-gray-600">
                    Created {formatDate(tripData.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-48 relative z-50">
                <CalendarStatusWidget tripId={tripId} />
              </div>
              <Button
                onClick={createNewChat}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                New Trip
              </Button>
            </div>
          </div>
        </motion.div>
{/* 
        Trip Info Cards */}
        {/* {tripData.basic_info && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="container mx-auto px-4 py-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {tripData.basic_info.origin && tripData.basic_info.city && (
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="text-xs text-gray-500">Route</p>
                        <p className="text-sm font-medium truncate">
                          {tripData.basic_info.origin} → {tripData.basic_info.city}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {tripData.basic_info.duration && (
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="text-sm font-medium">{tripData.basic_info.duration} days</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {tripData.basic_info.month && (
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-xs text-gray-500">Month</p>
                        <p className="text-sm font-medium">{tripData.basic_info.month}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {tripData.basic_info.tripType && (
                <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="text-xs text-gray-500">Type</p>
                        <p className="text-sm font-medium">{tripData.basic_info.tripType}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        )} */}

        {/* Main Content */}
        <div className="h-[calc(100vh-200px)] flex">
          {/* Left: Map - Full Left Side */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            className="w-1/2 p-4"
          >
            {routeData ? (
              <MapComponent routeData={routeData} />
            ) : tripData.basic_info?.origin && tripData.basic_info?.city ? (
              <div className="relative h-[500px] w-full rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <div className="text-lg font-medium mb-2">Loading Route</div>
                  <div className="text-sm">Fetching route from {tripData.basic_info.origin} to {tripData.basic_info.city}...</div>
                </div>
              </div>
            ) : (
              <div className="relative h-[500px] w-full rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-lg font-medium mb-2">No Route Available</div>
                  <div className="text-sm">
                    {tripData.basic_info?.city 
                      ? `Missing origin for trip to ${tripData.basic_info.city}`
                      : "Origin and destination needed to display map"
                    }
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right: Chat */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }} 
            className="w-1/2 p-4"
          >
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isTyping={isTyping}
              onNewChat={createNewChat}
            />
          </motion.div>
        </div>
        
        {/* Floating Tool Icons */}
        <FloatingToolIcons
          tripContext={tripData?.basic_info}
          sessionId={tripId}
          onToolResult={(toolType, result) => {
            console.log(`Trip detail tool ${toolType} result:`, result);
          }}
        />
      </div>
    </ProtectedRoute>
  );
}