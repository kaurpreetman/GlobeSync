"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CalendarStatus {
  connected: boolean;
  email?: string;
  calendar_id?: string;
}

interface CalendarIntegrationProps {
  userId?: string;
  className?: string;
}

const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({ userId, className = "" }) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const currentUserId = userId || session?.user?.id;

  // Check calendar connection status on component mount
  useEffect(() => {
    if (currentUserId) {
      checkCalendarStatus();
    }
  }, [currentUserId]);

  // Check for callback URL parameters (from OAuth redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const calendarConnected = urlParams.get("calendar_connected");
    const calendarError = urlParams.get("calendar_error");

    if (calendarConnected === "true") {
      toast({
        title: "Calendar Connected!",
        description: "Your Google Calendar has been successfully connected.",
      });
      checkCalendarStatus(); // Refresh status
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (calendarError) {
      toast({
        title: "Calendar Connection Failed",
        description: `Error: ${calendarError.replace(/_/g, " ")}`,
        variant: "destructive",
      });
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkCalendarStatus = async () => {
    if (!currentUserId) return;

    setIsCheckingStatus(true);
    try {
      const response = await fetch(`/api/calendar/status?user_id=${currentUserId}`);
      if (response.ok) {
        const status = await response.json();
        setCalendarStatus(status);
      }
    } catch (error) {
      console.error("Failed to check calendar status:", error);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const connectCalendar = async () => {
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your calendar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/calendar/connect?user_id=${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        // Redirect to Google OAuth
        window.location.href = data.authorization_url;
      } else {
        throw new Error("Failed to initiate calendar connection");
      }
    } catch (error) {
      console.error("Calendar connection error:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to connect to Google Calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectCalendar = async () => {
    if (!currentUserId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/calendar/status?user_id=${currentUserId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setCalendarStatus({ connected: false });
        toast({
          title: "Calendar Disconnected",
          description: "Your Google Calendar has been disconnected.",
        });
      } else {
        throw new Error("Failed to disconnect calendar");
      }
    } catch (error) {
      console.error("Calendar disconnection error:", error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect calendar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Calendar Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Checking calendar status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Integration
          {calendarStatus.connected && (
            <Badge variant="secondary" className="text-green-700 bg-green-100">
              <Check className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {calendarStatus.connected
            ? "Your Google Calendar is connected. Your trips will automatically sync to your calendar."
            : "Connect your Google Calendar to automatically sync travel plans and receive reminders."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {calendarStatus.connected ? (
          <div className="space-y-4">
            {calendarStatus.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Connected to:</span>
                <span className="font-medium">{calendarStatus.email}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("https://calendar.google.com", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Calendar
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={disconnectCalendar}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Calendar Benefits:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Automatic trip synchronization</li>
                  <li>Smart reminders and notifications</li>
                  <li>Event and activity scheduling</li>
                  <li>Travel document reminders</li>
                </ul>
              </div>
            </div>
            
            <Button 
              onClick={connectCalendar} 
              disabled={isLoading || !currentUserId}
              className="w-full"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Calendar className="h-4 w-4 mr-2" />
              Connect Google Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarIntegration;