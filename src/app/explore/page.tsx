"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { motion } from "framer-motion";

export default function Explore() {
  const router = useRouter();

  const questions = [
    { key: "country", label: "🌍 Which country are you planning to visit?", type: "text" },
    { key: "location", label: "📍 Any specific location inside that country? (Optional)", type: "text" },
    { key: "month", label: "🗓 When are you planning your trip? (Month)", type: "month" },
    { key: "people", label: "👥 How many people are going on this trip?", type: "number" },
    { key: "tripType", label: "🏖 What type of trip is it?", type: "select" },
    { key: "budget", label: "💰 What is your budget (in USD)?", type: "number" },
  ];

  const [step, setStep] = useState(0);
  const [messages, setMessages] = useState<{ sender: "bot" | "user"; text: string }[]>([
    { sender: "bot", text: questions[0].label },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [formData, setFormData] = useState<any>({
    country: "",
    location: "",
    month: "",
    people: "1",
    tripType: "",
    budget: "",
  });
  const [showSummary, setShowSummary] = useState(false);
  const [botTyping, setBotTyping] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping]);

  const handleUserResponse = () => {
    if (!inputValue && questions[step].key !== "location") return;

    // Save answer
    setFormData((prev: any) => ({ ...prev, [questions[step].key]: inputValue }));

    // Add user message
    setMessages((prev) => [...prev, { sender: "user", text: inputValue || "No specific location" }]);
    setInputValue("");

    // Bot typing delay
    setBotTyping(true);

    // Move to next step
    if (step < questions.length - 1) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { sender: "bot", text: questions[step + 1].label }]);
        setStep(step + 1);
        setBotTyping(false);
      }, 1200);
    } else {
      setTimeout(() => {
        setMessages((prev) => [...prev, { sender: "bot", text: "🎉 Great! Here’s your trip summary:" }]);
        setShowSummary(true);
        setBotTyping(false);
      }, 1200);
    }
  };

  const handleConfirm = () => {
    console.log("Trip Confirmed:", formData);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-indigo-50 to-purple-100 flex flex-col items-center justify-center p-4">
      {/* Heading */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold text-indigo-700 mb-2">
          🌏 Plan Your Trip with GlobeSync
        </h1>
        <p className="text-gray-600 text-lg">
          Your personal travel assistant is ready to craft the perfect journey
        </p>
      </div>

      {/* Chat Container */}
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-2xl p-6 flex flex-col h-[80vh] border">
        {/* Chat Window */}
        <div className="flex-1 overflow-y-auto space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className="flex items-end gap-2 max-w-[75%]">
                {msg.sender === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm">
                    🤖
                  </div>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl shadow-md ${
                    msg.sender === "bot"
                      ? "bg-gray-200 text-gray-800"
                      : "bg-indigo-600 text-white"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.sender === "user" && (
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
                    🙋
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Bot Typing */}
          {botTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-2xl flex items-center space-x-2">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-300"></span>
              </div>
            </div>
          )}

          {/* Summary */}
          {showSummary && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="bg-gradient-to-r from-indigo-50 to-blue-100 p-4 rounded-2xl shadow mt-2 space-y-2"
            >
              <p>🌍 Country: {formData.country}</p>
              {formData.location && <p>📍 Location: {formData.location}</p>}
              <p>🗓 Month: {formData.month}</p>
              <p>👥 People: {formData.people}</p>
              <p>🏖 Trip Type: {formData.tripType}</p>
              <p>💰 Budget: ${formData.budget}</p>
              <Button
                onClick={handleConfirm}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white"
              >
                ✅ Confirm & Go to Dashboard
              </Button>
            </motion.div>
          )}

          <div ref={chatEndRef}></div>
        </div>

        {/* Input Area */}
        {!showSummary && (
          <div className="mt-4 flex gap-2 items-center bg-gray-100 p-2 rounded-xl">
            {questions[step].type === "select" ? (
              <Select onValueChange={(value) => setInputValue(value)}>
                <SelectTrigger className="flex-1 rounded-lg">
                  <SelectValue placeholder="Select trip type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="friends">Friends</SelectItem>
                  <SelectItem value="couples">Couples</SelectItem>
                  <SelectItem value="solo">Solo</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={questions[step].type}
                placeholder="Type your answer..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="flex-1 rounded-lg"
              />
            )}
            <Button
              onClick={handleUserResponse}
              className="bg-indigo-600 text-white rounded-lg"
            >
              Send
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
