"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import DestinationCard from "@/components/Cards/DestinationCard";
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
  const { data: session, status } = useSession();

  // Force component re-render when session changes
  useEffect(() => {
    // This effect will re-run when session state changes
  }, [session, status]);

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
            
            <Button
              variant="outline"
              size="lg"
              className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20"
              onClick={() => router.push("/compare")}
            >
              Compare Cities
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
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
            
            <Button 
              size="lg" 
              className="px-8"
              onClick={() => router.push("/compare")}
            >
              Compare Cities Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <div className="text-center max-w-2xl">
              <p className="text-sm text-muted-foreground">
                Simply enter your origin city, two destination cities, travel dates, and budget level. 
                Our system will fetch live data and provide detailed comparisons to help you decide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Calendar Integration Section */}
      <section className="py-20 px-4 bg-gradient-subtle">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Connect Your Calendar
            </h2>
            <p className="text-xl text-muted-foreground">
              Sync your travel plans automatically and never miss important travel updates
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <CalendarIntegration />
          </div>
        </div>
      </section>
    </div>
  );
}
