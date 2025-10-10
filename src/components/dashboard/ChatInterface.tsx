"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { useSession } from "next-auth/react";
import { formatMessageTime } from "@/lib/utils/dateUtils";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date | string | number;
  suggested_responses?: string[];
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isTyping: boolean;
  onNewChat: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isTyping, onNewChat }) => {
  const [input, setInput] = useState("");
  const { data: session } = useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Travel Assistant</h3>
            <p className="text-xs text-gray-600">Ask about plans, transport, or budget</p>
          </div>
        </div>
        <Button onClick={onNewChat} variant="outline" size="sm">
          + New Chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex flex-col gap-2 ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
             <div className="flex gap-3">
               {msg.role === "assistant" && (
                 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                   <Bot className="w-4 h-4 text-blue-600" />
                 </div>
               )}
               {msg.role === "system" && (
                 <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                   <span className="text-xs text-gray-600">ℹ️</span>
                 </div>
               )}
               <div
                 className={`max-w-[80%] rounded-2xl p-3 ${
                   msg.role === "user"
                     ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                     : msg.role === "system"
                     ? "bg-gray-100 text-gray-600 italic text-sm"
                     : "bg-gray-100 text-gray-900"
                 }`}
               >
                <MarkdownRenderer content={msg.content} />
                <span className="text-xs opacity-70 mt-1 block">
                  {formatMessageTime(msg.timestamp)}
                </span>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              )}
            </div>
             
             {/* Suggested responses for assistant messages only */}
             {msg.role === "assistant" && msg.suggested_responses && msg.suggested_responses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {msg.suggested_responses.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ))}

        {isTyping && (
          <div className="flex gap-3 items-center">
            <Bot className="w-4 h-4 text-blue-600" />
            <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            <span className="text-sm text-gray-500">AI is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50 rounded-b-xl">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about flights, weather, or budget..."
            disabled={isTyping}
          />
          <Button type="submit" disabled={!input.trim() || isTyping}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
