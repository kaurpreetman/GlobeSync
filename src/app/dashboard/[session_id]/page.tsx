"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import ChatInterface from "@/components/dashboard/ChatInterface";
import dynamic from "next/dynamic";

const MapComponent = dynamic(
  () => import("@/components/dashboard/MapComponent").then((mod) => mod.default),
  { ssr: false }
);

export default function TravelDashboard() {
  const params = useParams();
  const session_id = params?.session_id as string;

  const [tripContext, setTripContext] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // --- Load welcome message from initialize API ---
  useEffect(() => {
    if (!session_id || messages.length > 0) return;

    const storedData = localStorage.getItem(`trip_${session_id}`);
    const basic_info = storedData ? JSON.parse(storedData).basic_info : {};

    fetch(`http://localhost:8000/trip/initialize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: session_id, basic_info }),
    })
      .then((res) => res.json())
      .then((data) => {
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
  }, [session_id]);

  // --- WebSocket setup for chat ---
  useEffect(() => {
    if (!session_id) return;

    const ws = new WebSocket(`ws://localhost:8000/chat/${session_id}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "typing") {
          setIsTyping(true);
          return;
        }

        if (data.type === "error") {
          setMessages((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              role: "system",
              content: data.message || "An error occurred",
              timestamp: new Date(),
            },
          ]);
          setIsTyping(false);
          return;
        }

        // Normal AI message
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

    return () => {
      ws.close();
    };
  }, [session_id]);

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

  // --- Get trip context (city, basic info) ---
  useEffect(() => {
    if (!session_id) return;
    fetch(`http://localhost:8000/trip/context/${session_id}`)
      .then((r) => r.json())
      .then((ctx) => setTripContext(ctx))
      .catch((err) => console.error("Error fetching context:", err));
  }, [session_id]);

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
              center={tripContext?.map_center || [0, 0]}
              locationName={tripContext?.basic_info?.city || ""}
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
