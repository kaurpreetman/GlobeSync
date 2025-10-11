"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";

interface CalendarStatus {
  connected: boolean;
  email?: string;
  calendar_id?: string;
}

interface CalendarEvent {
  summary: string;
  location: string;
  description: string;
  start_time: string;
  end_time: string;
  user_id: string;
}

interface TripCalendarSync {
  trip_id: string;
  force_resync?: boolean;
}

export const useCalendar = (userId?: string) => {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ connected: false });
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  const currentUserId = userId || session?.user?.id;

  const checkCalendarStatus = useCallback(async () => {
    if (!currentUserId) return;

    setIsCheckingStatus(true);
    try {
      const response = await fetch(`/api/calendar/status?user_id=${currentUserId}`);
      if (response.ok) {
        const status = await response.json();
        setCalendarStatus(status);
        return status;
      }
    } catch (error) {
      console.error("Failed to check calendar status:", error);
      return { connected: false };
    } finally {
      setIsCheckingStatus(false);
    }
  }, [currentUserId]);

  const connectCalendar = useCallback(async () => {
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to connect your calendar.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/calendar/connect?user_id=${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authorization_url;
        return true;
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
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, toast]);

  const disconnectCalendar = useCallback(async () => {
    if (!currentUserId) return false;

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
        return true;
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
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, toast]);

  const addEventToCalendar = useCallback(async (event: CalendarEvent) => {
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add events to calendar.",
        variant: "destructive",
      });
      return null;
    }

    if (!calendarStatus.connected) {
      toast({
        title: "Calendar Not Connected",
        description: "Please connect your Google Calendar first.",
        variant: "destructive",
      });
      return null;
    }

    try {
      const response = await fetch("http://localhost:8000/api/calendar/add-event", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...event,
          user_id: currentUserId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Event Added",
          description: `"${event.summary}" has been added to your calendar.`,
        });
        return result;
      } else {
        throw new Error("Failed to add event");
      }
    } catch (error) {
      console.error("Add event error:", error);
      toast({
        title: "Failed to Add Event",
        description: "Could not add event to calendar. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [currentUserId, calendarStatus.connected, toast]);

  const syncTripToCalendar = useCallback(async (syncData: TripCalendarSync) => {
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to sync trips to calendar.",
        variant: "destructive",
      });
      return null;
    }

    if (!calendarStatus.connected) {
      toast({
        title: "Calendar Not Connected",
        description: "Please connect your Google Calendar first.",
        variant: "destructive",
      });
      return null;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/calendar/sync-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trip_id: syncData.trip_id,
          user_id: currentUserId,
          force_resync: syncData.force_resync || false,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Trip Synced",
          description: `Trip has been synced to your calendar with ${result.events_created} events.`,
        });
        return result;
      } else {
        throw new Error("Failed to sync trip");
      }
    } catch (error) {
      console.error("Trip sync error:", error);
      toast({
        title: "Sync Failed",
        description: "Could not sync trip to calendar. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, calendarStatus.connected, toast]);

  // Auto-check status when user changes
  useEffect(() => {
    if (currentUserId) {
      checkCalendarStatus();
    }
  }, [currentUserId, checkCalendarStatus]);

  return {
    calendarStatus,
    isLoading,
    isCheckingStatus,
    checkCalendarStatus,
    connectCalendar,
    disconnectCalendar,
    addEventToCalendar,
    syncTripToCalendar,
    isConnected: calendarStatus.connected,
    userEmail: calendarStatus.email,
  };
};