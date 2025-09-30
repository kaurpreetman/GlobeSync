"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, Bot, Sparkles, DollarSign, Cloud, Train, Plane, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatInterface from "@/components/dashboard/ChatInterface";
// Removed unused imports: TripDetailCards, BudgetOverview, WeatherPanel, TransportationPanel
import BudgetOverview from "@/components/dashboard/BudgetOverview";
import WeatherPanel from "@/components/dashboard/WeatherPanel";
import TransportationPanel from "@/components/dashboard/TransportationPanel";
import dynamic from 'next/dynamic';
import TripHistorySidebar, { Trip } from "@/components/dashboard/TripHistorySidebar";

// ⚠️ FIX IS HERE: Use .then((mod) => mod.default) to correctly import the default export
const MapComponent = dynamic(
  () => import("@/components/dashboard/MapComponent").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

type PanelType = 'chat' | 'budget' | 'weather' | 'trains' | 'airport';

export default function Dashboard() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Welcome to your Tokyo trip dashboard! I've prepared your itinerary and travel details. How can I help you today?",
      timestamp: new Date(Date.now() - 5 * 60000),
    },
    {
      id: "2",
      role: "user",
      content: "Can you suggest some must-visit temples in Tokyo?",
      timestamp: new Date(Date.now() - 3 * 60000),
    },
    {
      id: "3",
      role: "assistant",
      content: "Absolutely! I recommend visiting Senso-ji Temple in Asakusa, Meiji Shrine in Shibuya, and Zojo-ji Temple near Tokyo Tower.",
      timestamp: new Date(Date.now() - 1 * 60000),
    },
  ]);

  const [activePanel, setActivePanel] = useState<PanelType>('chat');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const currentTripData = {
    location: "Tokyo, Japan",
    coordinates: [35.6762, 139.6503] as [number, number],
    budget: {
      total: "$3,500",
      categories: [
        { name: "Accommodation", amount: "$1,200", percentage: 34 },
        { name: "Food & Dining", amount: "$800", percentage: 23 },
        { name: "Transportation", amount: "$600", percentage: 17 },
        { name: "Activities", amount: "$500", percentage: 14 },
        { name: "Shopping", amount: "$400", percentage: 12 },
      ],
    },
    weather: [
      { day: "Today", temp: "22°C", condition: "Partly Cloudy", icon: "⛅" },
      { day: "Tomorrow", temp: "24°C", condition: "Sunny", icon: "☀️" },
      { day: "Wed", temp: "20°C", condition: "Rainy", icon: "🌧️" },
      { day: "Thu", temp: "23°C", condition: "Cloudy", icon: "☁️" },
      { day: "Fri", temp: "25°C", condition: "Sunny", icon: "☀️" },
    ],
    trainInfo: [
      { line: "JR Yamanote", status: "On Time", nextTrain: "2 min", destination: "Shibuya" },
      { line: "JR Chuo", status: "Delayed", nextTrain: "7 min", destination: "Shinjuku" },
      { line: "Tokyo Metro", status: "On Time", nextTrain: "4 min", destination: "Ginza" },
    ],
    airportInfo: [
      { airport: "Haneda (HND)", status: "On Time", gate: "A12", departure: "14:30" },
      { airport: "Narita (NRT)", status: "Delayed", gate: "B7", departure: "16:45" },
    ],
  };

  const previousTrips: Trip[] = [
    { id: "1", location: "Paris, France", date: "March 2024", budget: "$2,800", destination: "Paris" },
    { id: "2", location: "Bali, Indonesia", date: "January 2024", budget: "$1,900", destination: "Bali" },
    { id: "3", location: "New York, USA", date: "November 2023", budget: "$3,200", destination: "New York" },
  ];

  const floatingIcons = [
    { id: 'chat', icon: MessageCircle, label: 'Chat', color: 'from-blue-500 to-indigo-500', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { id: 'budget', icon: DollarSign, label: 'Budget', color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { id: 'weather', icon: Cloud, label: 'Weather', color: 'from-sky-500 to-blue-500', bgColor: 'bg-sky-50', textColor: 'text-sky-600' },
    { id: 'trains', icon: Train, label: 'Trains', color: 'from-purple-500 to-violet-500', bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
    { id: 'airport', icon: Plane, label: 'Airport', color: 'from-orange-500 to-red-500', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
  ];

  const handleSendMessage = (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I'd be happy to help with that! Based on your Tokyo itinerary, I can provide recommendations for "${content}".`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleSelectTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: `Welcome back to your ${trip.location} trip! Here are your saved details from ${trip.date}.`,
        timestamp: new Date(),
      },
    ]);
    setIsHistoryOpen(false);
  };

  const renderActivePanel = () => {
    switch (activePanel) {
      case 'chat': return <ChatInterface messages={messages} onSendMessage={handleSendMessage} />;
      case 'budget': return <BudgetOverview budget={currentTripData.budget} />;
      case 'weather': return <WeatherPanel weather={currentTripData.weather} />;
      case 'trains': return <TransportationPanel title="Train Information" data={currentTripData.trainInfo as any[]} type="train" />;
      case 'airport': return <TransportationPanel title="Airport Information" data={currentTripData.airportInfo as any[]} type="airport" />;
      default: return <ChatInterface messages={messages} onSendMessage={handleSendMessage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-30">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Travel Dashboard</h1>
                <p className="text-sm text-gray-600">{selectedTrip ? selectedTrip.location : currentTripData.location}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Sparkles className="w-4 h-4 mr-2" /> AI Suggestions
              </Button>
              <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(true)}>
                <History className="w-4 h-4 mr-2" /> Trip History
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating Icons */}
      <div className="fixed top-20 right-6 z-40 flex flex-col space-y-3">
        {floatingIcons.map((item, index) => {
          const Icon = item.icon;
          const isActive = activePanel === item.id;
          return (
            <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={isActive ? "default" : "outline"}
                size="icon"
                onClick={() => setActivePanel(item.id as PanelType)}
                className={`w-12 h-12 rounded-full shadow-lg transition-all duration-300 ${
                  isActive ? `bg-gradient-to-r ${item.color} text-white border-0 shadow-xl` : `${item.bgColor} ${item.textColor} border-2 hover:shadow-xl hover:scale-110`
                }`}
                title={item.label}
              >
                <Icon className="w-5 h-5" />
              </Button>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="h-[calc(100vh-64px)] flex">
        {/* Left - Map 50% */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="w-1/2 p-6">
          <div className="h-full bg-white rounded-xl shadow-lg overflow-hidden">
            <MapComponent center={currentTripData.coordinates} locationName={currentTripData.location} />
          </div>
        </motion.div>

        {/* Right - Panel 50% */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="w-1/2 p-6">
          <div className="h-full relative">
            <AnimatePresence mode="wait">
              <motion.div key={activePanel} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="h-full">
                {renderActivePanel()}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Trip History Sidebar */}
      <TripHistorySidebar trips={previousTrips} isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} onSelectTrip={handleSelectTrip} selectedTripId={selectedTrip?.id} />
    </div>
  );
}