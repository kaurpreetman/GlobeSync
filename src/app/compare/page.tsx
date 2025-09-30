"use client";

import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X, Thermometer, DollarSign, Calendar } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import parisImage from "@/assets/paris.jpg";
import romeImage from "@/assets/rome.jpg";

export default function ComparePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  if (!session) {
    return <div className="min-h-screen flex items-center justify-center">Please login to access this page.</div>;
  }

  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("Paris vs. Rome");
  const [selectedCities, setSelectedCities] = useState([
    { name: "Paris", dates: "June 10 - June 15", image: parisImage },
    { name: "Rome", dates: "June 10 - June 15", image: romeImage },
  ]);

  useEffect(() => {
    const destinations = searchParams.get("destinations");
    if (destinations) setSearchQuery(destinations);
  }, [searchParams]);

  const weatherData = [
    { city: "Paris", temp: "22°C", condition: "Sunny", image: parisImage },
    { city: "Rome", temp: "25°C", condition: "Sunny", image: romeImage },
  ];

  const costData = [
    { city: "Paris", amount: "$1,500", description: "Avg. cost per person", image: parisImage },
    { city: "Rome", amount: "$1,200", description: "Avg. cost per person", image: romeImage },
  ];

  const eventsData = [
    { city: "Paris", event: "Music Festival", date: "June 12", image: parisImage },
    { city: "Rome", event: "Food Festival", date: "June 14", image: romeImage },
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-1/4">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search destinations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Selected Cities */}
              <div className="space-y-3">
                {selectedCities.map((city) => (
                  <Card key={city.name} className="border-2 border-travel-blue bg-travel-blue/5">
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <Image
                          src={city.image}
                          alt={city.name}
                          className="rounded-lg object-cover"
                          width={48}
                          height={48}
                        />
                        <div>
                          <h3 className="font-semibold">{city.name}</h3>
                          <p className="text-sm text-muted-foreground">{city.dates}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:w-3/4">
            <h1 className="text-4xl font-bold mb-8">{searchQuery}</h1>

            {/* Weather Comparison */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <Thermometer className="h-5 w-5 text-travel-blue mr-2" />
                <h2 className="text-2xl font-bold">Weather</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {weatherData.map((data) => (
                  <Card key={data.city} className="shadow-card">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold">{data.city}</h3>
                          <p className="text-3xl font-bold text-travel-blue">{data.temp}</p>
                          <p className="text-muted-foreground">{data.condition}</p>
                        </div>
                        <Image
                          src={data.image}
                          alt={data.city}
                          className="rounded-xl object-cover"
                          width={80}
                          height={80}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Cost Comparison */}
            <section className="mb-8">
              <div className="flex items-center mb-4">
                <DollarSign className="h-5 w-5 text-travel-blue mr-2" />
                <h2 className="text-2xl font-bold">Cost</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {costData.map((data) => (
                  <Card key={data.city} className="shadow-card">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold">{data.city}</h3>
                          <p className="text-3xl font-bold text-travel-blue">{data.amount}</p>
                          <p className="text-muted-foreground">{data.description}</p>
                        </div>
                        <Image
                          src={data.image}
                          alt={data.city}
                          className="rounded-xl object-cover"
                          width={80}
                          height={80}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Events Comparison */}
            <section>
              <div className="flex items-center mb-4">
                <Calendar className="h-5 w-5 text-travel-blue mr-2" />
                <h2 className="text-2xl font-bold">Events</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {eventsData.map((data) => (
                  <Card key={data.city} className="shadow-card">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold">{data.city}</h3>
                          <p className="text-lg font-medium">{data.event}</p>
                          <p className="text-muted-foreground">{data.date}</p>
                        </div>
                        <Image
                          src={data.image}
                          alt={data.city}
                          className="rounded-xl object-cover"
                          width={80}
                          height={80}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
