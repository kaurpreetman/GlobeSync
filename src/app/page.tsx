"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import DestinationCard from "@/components/Cards/DestinationCard";
import FeatureCard from "@/components/Cards/FeatureCard";
import CalendarIntegration from "@/components/calendar/CalendarIntegration";

import parisImage from "@/assets/paris.jpg";
import tokyoImage from "@/assets/tokyo.jpg";
import newYorkImage from "@/assets/new-york.jpg";
import londonImage from "@/assets/london.jpg";
import romeImage from "@/assets/rome.jpg";
import barcelonaImage from "@/assets/barcelona.jpg";
import heroImage from "@/assets/hero-travel.jpg";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Check if calendar connection succeeded
    if (searchParams.get('calendar_connected') === 'true') {
      toast({
        title: "Calendar Connected!",
        description: "Your Google Calendar has been connected successfully. Events will be automatically added to your calendar.",
      });
      // Remove the query parameter
      window.history.replaceState({}, '', '/');
    }

    // Check if there was an error
    const error = searchParams.get('calendar_error');
    if (error) {
      toast({
        title: "Connection Failed",
        description: `Could not connect calendar: ${error}`,
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/');
    }

    // Check calendar status on load
    checkCalendarStatus();
  }, [searchParams, toast]);

  const checkCalendarStatus = async () => {
    try {
      const userId = localStorage.getItem('user_id') || 'default_user';
      const response = await fetch(`/api/calendar?action=status&userId=${userId}`);
      const data = await response.json();
      
      if (data.success && data.connected) {
        setCalendarConnected(true);
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      setIsConnecting(true);
      const userId = localStorage.getItem('user_id') || 'default_user';
      
      // Store user_id if not already stored
      if (!localStorage.getItem('user_id')) {
        localStorage.setItem('user_id', userId);
      }

      const response = await fetch(`/api/calendar?action=connect&userId=${userId}`);
      const data = await response.json();

      if (data.success && data.authorizationUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error('Failed to get authorization URL');
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast({
        title: "Connection Error",
        description: "Could not initiate calendar connection. Please try again.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    try {
      const userId = localStorage.getItem('user_id') || 'default_user';
      const response = await fetch(`/api/calendar?action=disconnect&userId=${userId}`);
      const data = await response.json();

      if (data.success) {
        setCalendarConnected(false);
        toast({
          title: "Calendar Disconnected",
          description: "Your Google Calendar has been disconnected.",
        });
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      toast({
        title: "Error",
        description: "Could not disconnect calendar. Please try again.",
        variant: "destructive",
      });
    }
  };

  const destinations = [
    { name: "Paris", image: parisImage },
    { name: "Tokyo", image: tokyoImage },
    { name: "New York", image: newYorkImage },
    { name: "London", image: londonImage },
    { name: "Rome", image: romeImage },
    { name: "Barcelona", image: barcelonaImage },
  ];

  const popularTrips = [
    {
      title: "Beach Getaway",
      description: "Relax on the sandy shores",
      image:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop",
    },
    {
      title: "Mountain Retreat",
      description: "Hike through scenic trails",
      image:
        "https://images.unsplash.com/photo-1464822759844-d150baec93d1?w=600&h=400&fit=crop",
    },
    {
      title: "City Exploration",
      description: "Discover vibrant city life",
      image:
        "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=400&fit=crop",
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroImage.src})` }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative container mx-auto text-center">
          <div className="inline-block px-4 py-2 mb-6 bg-travel-blue/20 backdrop-blur-sm rounded-full">
            <span className="text-white font-medium">GlobeSync</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Smart Travel Planner
          </h1>

          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            AI-powered itineraries with cost, weather, and events in one place.
            Your next adventure, intelligently planned.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="travel"
              size="lg"
              onClick={() => {
                if (session) router.push("/explore");
                else router.push(`/auth?callbackUrl=${encodeURIComponent("/explore")}`);
              }}
            >
              Start Planning
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Suggested Destinations */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Suggested Destinations</h2>
            <p className="text-xl text-muted-foreground">
              Discover your next adventure
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-6xl mx-auto">
            {destinations.map((destination) => (
              <DestinationCard
                key={destination.name}
                name={destination.name}
                image={destination.image.src}
                onClick={() =>
                  router.push(`/compare?destinations=${destination.name}`)
                }
              />
            ))}
          </div>
        </div>
      </section>

      {/* Popular Trips */}
      <section className="py-20 px-4 bg-gradient-subtle">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Popular Trips</h2>
            <p className="text-xl text-muted-foreground">
              Everything you need to plan the perfect trip
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {popularTrips.map((trip) => (
              <FeatureCard
                key={trip.title}
                title={trip.title}
                description={trip.description}
                image={trip.image}
                buttonText="Explore"
                onButtonClick={() => router.push("/explore")}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-travel-blue to-travel-blue-light">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {calendarConnected 
              ? "Your calendar is connected!" 
              : "Connect your calendar to receive AI-powered travel reminders and updates."}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {calendarConnected
              ? "Events will be automatically added to your Google Calendar when found."
              : "Never miss a beat. Connect your calendar to automatically sync your travel plans."}
          </p>
          {calendarConnected ? (
            <Button
              onClick={handleDisconnectCalendar}
              variant="travel-outline"
              size="lg"
              className="bg-white text-travel-blue hover:bg-white/90"
            >
              Disconnect Calendar
            </Button>
          ) : (
            <Button
              onClick={handleConnectCalendar}
              disabled={isConnecting}
              variant="travel-outline"
              size="lg"
              className="bg-white text-travel-blue hover:bg-white/90"
            >
              {isConnecting ? "Connecting..." : "Connect Calendar"}
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
