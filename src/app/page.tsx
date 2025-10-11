"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import DestinationCard from "@/components/Cards/DestinationCard";
import CalendarIntegration from "@/components/calendar/CalendarIntegration";
import CityComparisonModal from "@/components/travel/CityComparisonModal";

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
    {
      name: "Paris",
      image: parisImage,
      description: "City of Light and Romance",
      highlights: ["Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral"],
      culture: "French cuisine, art galleries, and romantic ambiance",
      bestTime: "Apr-Jun, Sep-Oct",
      famousFor: "Fashion, art, cuisine, and iconic landmarks"
    },
    {
      name: "Tokyo",
      image: tokyoImage,
      description: "Modern Metropolis meets Tradition",
      highlights: ["Shibuya Crossing", "Senso-ji Temple", "Tokyo Skytree"],
      culture: "Blend of ancient traditions and cutting-edge technology",
      bestTime: "Mar-May, Sep-Nov",
      famousFor: "Sushi, technology, anime culture, and cherry blossoms"
    },
    {
      name: "New York",
      image: newYorkImage,
      description: "The City That Never Sleeps",
      highlights: ["Times Square", "Central Park", "Statue of Liberty"],
      culture: "Melting pot of cultures, Broadway shows, and urban energy",
      bestTime: "Apr-Jun, Sep-Nov",
      famousFor: "Skyscrapers, Broadway, museums, and diverse neighborhoods"
    },
    {
      name: "London",
      image: londonImage,
      description: "Historic Capital of England",
      highlights: ["Big Ben", "Tower of London", "British Museum"],
      culture: "Royal heritage, afternoon tea, and theatrical performances",
      bestTime: "May-Sep",
      famousFor: "Royal palaces, museums, pubs, and rich history"
    },
    {
      name: "Rome",
      image: romeImage,
      description: "The Eternal City",
      highlights: ["Colosseum", "Vatican City", "Trevi Fountain"],
      culture: "Ancient Roman history, Italian cuisine, and religious art",
      bestTime: "Apr-Jun, Sep-Oct",
      famousFor: "Ancient ruins, Italian cuisine, Vatican art, and history"
    },
    {
      name: "Barcelona",
      image: barcelonaImage,
      description: "Architectural Marvel of Spain",
      highlights: ["Sagrada Familia", "Park Güell", "Gothic Quarter"],
      culture: "Catalan architecture, tapas culture, and Mediterranean lifestyle",
      bestTime: "May-Jul, Sep-Oct",
      famousFor: "Gaudí architecture, beaches, nightlife, and Mediterranean cuisine"
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
            
            <CityComparisonModal>
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20"
              >
                Compare Cities
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CityComparisonModal>
          </div>
        </div>
      </section>

      {/* Suggested Destinations */}
      <section className="py-24 px-4 bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <div className="container mx-auto">
          <div className="text-center mb-20">
            <div className="inline-block px-4 py-2 mb-6 bg-blue-100 rounded-full">
              <span className="text-blue-800 font-medium text-sm">✈️ Popular Destinations</span>
            </div>
            <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Discover Amazing Places
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Explore these incredible destinations with detailed insights about their famous landmarks, 
              cultural highlights, and the best times to visit. Each location offers unique experiences 
              waiting to be discovered.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Enhanced destination cards with detailed information */}
            {destinations.map((destination) => (
              <DestinationCard
                key={destination.name}
                name={destination.name}
                image={destination.image.src}
                description={destination.description}
                highlights={destination.highlights}
                culture={destination.culture}
                bestTime={destination.bestTime}
                famousFor={destination.famousFor}
                onClick={() =>
                  router.push(`/destination/${encodeURIComponent(destination.name)}`)
                }
              />
            ))}
          </div>
        </div>
      </section>

      {/* City Comparison Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Compare Two Cities
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Can't decide between destinations? Get real-time comparisons of weather, flights, 
              trains, and budgets to help you choose the perfect destination for your trip.
            </p>
          </div>
          
          <div className="flex flex-col items-center space-y-8">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl">
              <div className="text-center p-6 bg-gradient-to-b from-blue-50 to-white rounded-lg border">
                <div className="text-4xl mb-4">🌤️</div>
                <h3 className="font-semibold mb-2">Real-time Weather</h3>
                <p className="text-sm text-muted-foreground">
                  Current conditions, temperature, humidity, and precipitation for both cities
                </p>
              </div>
              <div className="text-center p-6 bg-gradient-to-b from-purple-50 to-white rounded-lg border">
                <div className="text-4xl mb-4">✈️🚆</div>
                <h3 className="font-semibold mb-2">Travel Options</h3>
                <p className="text-sm text-muted-foreground">
                  Compare flights, trains, prices, and travel times for both destinations
                </p>
              </div>
              <div className="text-center p-6 bg-gradient-to-b from-green-50 to-white rounded-lg border">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="font-semibold mb-2">Budget Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Detailed cost breakdown with accommodation, food, and activity estimates
                </p>
              </div>
            </div>
            
            <CityComparisonModal>
              <Button size="lg" className="px-8">
                Compare Cities Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CityComparisonModal>
            
            <div className="text-center max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Simply enter your origin city, two destination cities, travel dates, and budget level. 
                Our system will fetch live data and provide detailed comparisons to help you decide.
              </p>
            </div>
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
