"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, ExternalLink, Loader2 } from "lucide-react";
import { useCalendar } from "@/hooks/useCalendar";

interface CalendarStatusWidgetProps {
  tripId?: string;
  className?: string;
}

const CalendarStatusWidget: React.FC<CalendarStatusWidgetProps> = ({ tripId, className = "" }) => {
  const { 
    isConnected, 
    userEmail, 
    isLoading, 
    connectCalendar, 
    syncTripToCalendar 
  } = useCalendar();

  const handleSyncTrip = async () => {
    if (!tripId) return;
    await syncTripToCalendar({ trip_id: tripId });
  };

  return (
    <Card className={`${className} border-l-4 ${isConnected ? 'border-l-green-500 bg-green-50/30' : 'border-l-blue-500 bg-blue-50/30'} shadow-sm`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className={`h-4 w-4 ${isConnected ? 'text-green-600' : 'text-blue-600'}`} />
            <span className="font-medium text-sm">Google Calendar</span>
            {isConnected && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                <Check className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => window.open("https://calendar.google.com", "_blank")}
            disabled={!isConnected}
            title="Open Google Calendar"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        {isConnected ? (
          <div className="space-y-2">
            {userEmail && (
              <p className="text-xs text-green-700 truncate bg-green-100 px-2 py-1 rounded font-mono">
                {userEmail}
              </p>
            )}
            {tripId ? (
              <Button
                size="sm"
                variant={isConnected ? "default" : "outline"}
                onClick={handleSyncTrip}
                disabled={isLoading}
                className="w-full h-7 text-xs bg-green-600 hover:bg-green-700"
              >
                {isLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Sync This Trip
              </Button>
            ) : (
              <p className="text-xs text-green-600 text-center italic">
                Create a trip to enable sync
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-blue-700 text-center">
              Connect to sync trips & get reminders
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={connectCalendar}
              disabled={isLoading}
              className="w-full h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {isLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              <Calendar className="h-3 w-3 mr-1" />
              Connect Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarStatusWidget;