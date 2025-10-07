"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import ChatInterface from "@/components/dashboard/ChatInterface";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
const MapComponent = dynamic(
  () => import("@/components/dashboard/MapComponent").then((mod) => mod.default),
  { ssr: false }
);

export default function TravelDashboard() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const [tripContext, setTripContext] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // --- Initialize trip when dashboard loads ---
  useEffect(() => {
    if (sessionId) return; // already initialized

    const storedData = localStorage.getItem("trip_basic_info");
    if (!storedData) return;

    const basic_info = JSON.parse(storedData);

    fetch("http://localhost:8000/trip/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: session?.user?.id,
         basic_info }),
    })
      .then((res) => res.json())
      .then((data) => {
        setSessionId(data.session_id);

        const welcomeMsg = {
          id: "welcome",
          role: "assistant",
          content: data.welcome_message,
          timestamp: new Date(),
          suggested_responses: data.suggested_responses || []
        };
        setMessages([welcomeMsg]);
      })
      .catch(console.error);
  }, [sessionId]);

  // --- WebSocket setup ---
  useEffect(() => {
    if (!sessionId) return;

    const ws = new WebSocket(`ws://localhost:8000/chat/${sessionId}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "typing") {
          setIsTyping(true);
          return;
        }

        const aiMessage = {
          id: Date.now().toString(),
          role: "assistant",
          content: data.message || data.content || "Response received",
          timestamp: new Date(),
          suggested_responses: data.suggested_responses || []
        };

        setMessages((prev) => [...prev, aiMessage]);
        setIsTyping(false);
      } catch (err) {
        console.error("Error parsing WS message:", err);
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      setIsTyping(false);
    };

    return () => ws.close();
  }, [sessionId]);

  // --- Trip context ---
  useEffect(() => {
    if (!sessionId) return;
    fetch(`http://localhost:8000/trip/context/${sessionId}`)
      .then((r) => r.json())
      .then((ctx) => {
        // Validate and format map coordinates
        let mapCenter = [0, 0];
        if (ctx.map_center && 
            Array.isArray(ctx.map_center) && 
            ctx.map_center.length === 2 && 
            !isNaN(Number(ctx.map_center[0])) && 
            !isNaN(Number(ctx.map_center[1]))) {
          mapCenter = [Number(ctx.map_center[0]), Number(ctx.map_center[1])];
        }
        setTripContext({
          ...ctx,
          map_center: mapCenter
        });
      })
      .catch((error) => {
        console.error("Error fetching trip context:", error);
        setTripContext(prev => ({
          ...prev,
          map_center: [0, 0]
        }));
      });
  }, [sessionId]);

  const handleSendMessage = (content: string) => {
    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    wsRef.current?.send(JSON.stringify({ message: content }));
    setIsTyping(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30"
      >
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Travel Dashboard</h1>
                <p className="text-sm text-gray-600">
                  {tripContext?.basic_info?.city ?? ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="h-[calc(100vh-64px)] flex">
        {/* Left - Map */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="w-1/2 p-6"
        >
          <div className="h-full bg-white rounded-xl shadow-lg overflow-hidden">
            <MapComponent
              center={[0, 0]}
              locationName={tripContext?.basic_info?.city || ""}
              destinationCoords={tripContext?.map_center}
              locationType={tripContext?.basic_info?.locationType || 'city'}
              customZoom={tripContext?.basic_info?.customZoom}
              countryName={tripContext?.basic_info?.country}
              region={tripContext?.basic_info?.region}
            />
          </div>
        </motion.div>

        {/* Right - Chat */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="w-1/2 p-6"
        >
          <div className="h-full relative">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isTyping={isTyping}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
