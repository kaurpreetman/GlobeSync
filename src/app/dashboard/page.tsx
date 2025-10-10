"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import ChatInterface from "@/components/dashboard/ChatInterface";

const MapComponent = dynamic(() => import("@/components/dashboard/MapComponent"), { ssr: false });

type TripContext = {
  city?: string;
  map_center?: [number, number];
  locationType?: string;
  [k: string]: any;
} | null;

export default function TravelDashboard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const querySessionId = searchParams.get("sessionId");

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tripContext, setTripContext] = useState<TripContext>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 🔹 1. Load persisted chat session from DB
  useEffect(() => {
    if (!querySessionId) return;

    const fetchChat = async () => {
      try {
        const res = await fetch(`/api/chat/${querySessionId}`);
        if (!res.ok) throw new Error("Failed to load chat");
        const data = await res.json();

        setSessionId(data._id);
        setTripContext(data.basic_info ?? null);
        setRouteData(data.route_data ?? null);

        setMessages(
          (data.messages || []).map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
            suggested_responses: m.suggested_responses || [],
          }))
        );
      } catch (err) {
        console.error("Error loading chat:", err);
      }
    };

    fetchChat();
  }, [querySessionId]);

  // 🔹 2. Setup WebSocket for real-time chat
  useEffect(() => {
    if (!sessionId || !session?.user?.id || !tripContext) return;

    const ws = new WebSocket(`ws://localhost:8000/chat/${session.user.id}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      ws.send(
        JSON.stringify({
          message: "",
          session_data: { basic_info: tripContext },
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
          return [
            ...prev,
            {
              id: Date.now().toString(),
              role: "assistant",
              content: data.message,
              timestamp: new Date(),
              suggested_responses: data.suggested_responses || [],
            },
          ];
        });

        // 🔸 If backend sends updated route data
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

    return () => ws.close();
  }, [sessionId, session?.user?.id, tripContext]);

  // 🔹 3. Send message
  const handleSendMessage = async (content: string) => {
    if (!sessionId || !wsRef.current || !tripContext) return;

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
        session_data: { basic_info: tripContext },
      })
    );
    setIsTyping(true);

    try {
      await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: sessionId, message: userMsg }),
      });
    } catch (err) {
      console.error("Error saving message:", err);
    }
  };

  // 🔹 4. Auto-fetch route data if not already loaded
   useEffect(() => {
    const fetchRoute = async () => {
      if (!sessionId || !tripContext?.city) return;
      try {
        const res = await fetch("/api/chat/map/route", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chatId: sessionId,
            origin: "Meerut, India",
            destination: tripContext.city,
            transportMode: "driving",
          }),
        });
        const json = await res.json();
        if (json.success) setRouteData(json.route_data);
      } catch (err) {
        console.error("Route fetch error:", err);
      }
    };

    if (!routeData && tripContext?.city) fetchRoute();
  }, [sessionId, tripContext, routeData]);

  // 🔹 5. Create new chat
  const createNewChat = async () => {
    if (!session?.user?.id || !tripContext) return;

    try {
      const res = await fetch("/api/chat/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id, basic_info: tripContext }),
      });

      if (!res.ok) throw new Error("Failed to initialize new chat");
      const data = await res.json();
      setSessionId(data.sessionId);

      const chatRes = await fetch(`/api/chat/${data.sessionId}`);
      const chatData = await chatRes.json();
      setMessages(
        (chatData.messages || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }))
      );
      setRouteData(chatData.route_data ?? null);

      // Fetch route for the new session
      const routeRes = await fetch("/api/chat/map/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: data.sessionId,
          origin: "Meerut, India",
          destination: tripContext.city ?? "Delhi, India",
          transportMode: "driving",
        }),
      });

      const routeJson = await routeRes.json();
      if (routeJson?.success) setRouteData(routeJson.route_data);
    } catch (err) {
      console.error("Error creating new chat:", err);
    }
  };

  // 🔹 6. Render UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 border-b">
        <div className="max-w-full mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Travel Dashboard</h1>
              <p className="text-sm text-gray-600">{tripContext?.city ?? ""}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Layout */}
      <div className="h-[calc(100vh-64px)] flex">
        {/* Left: Map */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-1/2 p-6">
          {routeData ? (
            <MapComponent routeData={routeData} />

          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">Loading map…</div>
          )}
        </motion.div>

        {/* Right: Chat */}
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-1/2 p-6">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
            onNewChat={createNewChat}
          />
        </motion.div>
      </div>
    </div>
  );
}
