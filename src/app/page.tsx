"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import DestinationCard from "@/components/Cards/DestinationCard";
import FeatureCard from "@/components/Cards/FeatureCard";
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
  const { data: session, status } = useSession();

  // Force component re-render when session changes
  useEffect(() => {
    // This effect will re-run when session state changes
  }, [session, status]);

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
