"use client";

import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Star, Camera, Thermometer, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";

// Enhanced destination data
const destinationsData = {
  Paris: {
    name: "Paris",
    country: "France",
    description: "City of Light and Romance",
    longDescription: "Paris, the capital of France, is renowned for its art, fashion, gastronomy, and culture. This enchanting city is home to world-famous landmarks, museums, and a romantic atmosphere that captivates millions of visitors each year.",
    highlights: ["Eiffel Tower", "Louvre Museum", "Notre-Dame Cathedral", "Arc de Triomphe", "Montmartre", "Seine River Cruise"],
    culture: "French cuisine, art galleries, and romantic ambiance",
    bestTime: "Apr-Jun, Sep-Oct",
    famousFor: "Fashion, art, cuisine, and iconic landmarks",
    weather: "Temperate oceanic climate",
    language: "French",
    currency: "Euro (EUR)",
    photos: [
      "https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1549144511-f099e773c147?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1431274172761-fca41d930114?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=800&h=600&fit=crop"
    ],
    attractions: [
      {
        name: "Eiffel Tower",
        description: "Iconic iron lattice tower and symbol of France",
        type: "Landmark"
      },
      {
        name: "Louvre Museum",
        description: "World's largest art museum and home to the Mona Lisa",
        type: "Museum"
      },
      {
        name: "Notre-Dame Cathedral", 
        description: "Gothic cathedral and masterpiece of French architecture",
        type: "Religious Site"
      }
    ],
    tips: [
      "Learn basic French phrases",
      "Book museum tickets in advance",
      "Try authentic French pastries",
      "Walk along the Seine River at sunset"
    ]
  },
  Tokyo: {
    name: "Tokyo",
    country: "Japan",
    description: "Modern Metropolis meets Tradition",
    longDescription: "Tokyo is Japan's bustling capital, mixing modern skyscrapers with traditional temples. This vibrant metropolis offers an incredible blend of ancient traditions and cutting-edge technology, making it one of the world's most fascinating cities.",
    highlights: ["Shibuya Crossing", "Senso-ji Temple", "Tokyo Skytree", "Tsukiji Fish Market", "Harajuku", "Imperial Palace"],
    culture: "Blend of ancient traditions and cutting-edge technology",
    bestTime: "Mar-May, Sep-Nov",
    famousFor: "Sushi, technology, anime culture, and cherry blossoms",
    weather: "Humid subtropical climate",
    language: "Japanese",
    currency: "Japanese Yen (JPY)",
    photos: [
      "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?w=800&h=600&fit=crop"
    ],
    attractions: [
      {
        name: "Shibuya Crossing",
        description: "World's busiest pedestrian crossing",
        type: "Landmark"
      },
      {
        name: "Senso-ji Temple",
        description: "Ancient Buddhist temple in Asakusa",
        type: "Religious Site"
      },
      {
        name: "Tokyo Skytree",
        description: "Tallest structure in Japan with panoramic views",
        type: "Observation Tower"
      }
    ],
    tips: [
      "Get a JR Pass for train travel",
      "Try authentic sushi at Tsukiji",
      "Experience a traditional ryokan",
      "Respect local customs and bow"
    ]
  },
  "New York": {
    name: "New York",
    country: "United States",
    description: "The City That Never Sleeps",
    longDescription: "New York City is a global hub of commerce, finance, arts, and culture. With its iconic skyline, world-class museums, Broadway shows, and diverse neighborhoods, NYC offers endless experiences and attractions.",
    highlights: ["Times Square", "Central Park", "Statue of Liberty", "Empire State Building", "Brooklyn Bridge", "9/11 Memorial"],
    culture: "Melting pot of cultures, Broadway shows, and urban energy",
    bestTime: "Apr-Jun, Sep-Nov",
    famousFor: "Skyscrapers, Broadway, museums, and diverse neighborhoods",
    weather: "Humid subtropical climate",
    language: "English",
    currency: "US Dollar (USD)",
    photos: [
      "https://images.unsplash.com/photo-1546436836-07a91091f160?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1522083165195-3424ed129620?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?w=800&h=600&fit=crop"
    ],
    attractions: [
      {
        name: "Times Square",
        description: "Bright lights and Broadway shows in the heart of Manhattan",
        type: "Entertainment District"
      },
      {
        name: "Central Park",
        description: "Massive urban park perfect for recreation and relaxation",
        type: "Park"
      },
      {
        name: "Statue of Liberty",
        description: "Symbol of freedom and democracy",
        type: "Monument"
      }
    ],
    tips: [
      "Use the subway for efficient travel",
      "Book Broadway shows in advance",
      "Try pizza by the slice",
      "Walk across the Brooklyn Bridge"
    ]
  },
  London: {
    name: "London",
    country: "United Kingdom",
    description: "Historic Capital of England",
    longDescription: "London is a city where ancient history meets modern innovation. From royal palaces and historic landmarks to world-class museums and vibrant markets, London offers a perfect blend of tradition and contemporary culture.",
    highlights: ["Big Ben", "Tower of London", "British Museum", "Buckingham Palace", "London Eye", "Thames River"],
    culture: "Royal heritage, afternoon tea, and theatrical performances",
    bestTime: "May-Sep",
    famousFor: "Royal palaces, museums, pubs, and rich history",
    weather: "Temperate oceanic climate",
    language: "English",
    currency: "British Pound (GBP)",
    photos: [
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1529655683826-aba9b3e77383?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1506980595904-70325b7fdd90?w=800&h=600&fit=crop"
    ],
    attractions: [
      {
        name: "Big Ben",
        description: "Iconic clock tower and symbol of London",
        type: "Landmark"
      },
      {
        name: "Tower of London",
        description: "Historic castle housing the Crown Jewels",
        type: "Historical Site"
      },
      {
        name: "British Museum",
        description: "World's oldest national public museum",
        type: "Museum"
      }
    ],
    tips: [
      "Stand right on escalators",
      "Try traditional fish and chips",
      "Visit during summer for best weather",
      "Take advantage of free museums"
    ]
  },
  Rome: {
    name: "Rome",
    country: "Italy",
    description: "The Eternal City",
    longDescription: "Rome, the capital of Italy, is a living museum where ancient history comes alive. With its incredible architecture, world-famous cuisine, and romantic atmosphere, Rome offers an unforgettable journey through time.",
    highlights: ["Colosseum", "Vatican City", "Trevi Fountain", "Roman Forum", "Pantheon", "Spanish Steps"],
    culture: "Ancient Roman history, Italian cuisine, and religious art",
    bestTime: "Apr-Jun, Sep-Oct",
    famousFor: "Ancient ruins, Italian cuisine, Vatican art, and history",
    weather: "Mediterranean climate",
    language: "Italian",
    currency: "Euro (EUR)",
    photos: [
      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1555992457-f559d0332-394?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1529260830199-42c24126f198?w=800&h=600&fit=crop"
    ],
    attractions: [
      {
        name: "Colosseum",
        description: "Ancient amphitheater and iconic symbol of Rome",
        type: "Historical Site"
      },
      {
        name: "Vatican City",
        description: "Smallest country in the world with St. Peter's Basilica",
        type: "Religious Site"
      },
      {
        name: "Trevi Fountain",
        description: "Baroque fountain where wishes are made",
        type: "Landmark"
      }
    ],
    tips: [
      "Throw a coin in Trevi Fountain",
      "Book Vatican tickets online",
      "Try authentic gelato",
      "Learn basic Italian phrases"
    ]
  },
  Barcelona: {
    name: "Barcelona",
    country: "Spain",
    description: "Architectural Marvel of Spain",
    longDescription: "Barcelona is a vibrant Mediterranean city known for its unique architecture, beautiful beaches, and rich Catalan culture. From Gaudí's masterpieces to delicious tapas, Barcelona offers a perfect blend of art, culture, and seaside relaxation.",
    highlights: ["Sagrada Familia", "Park Güell", "Gothic Quarter", "Casa Batlló", "Las Ramblas", "Barceloneta Beach"],
    culture: "Catalan architecture, tapas culture, and Mediterranean lifestyle",
    bestTime: "May-Jul, Sep-Oct",
    famousFor: "Gaudí architecture, beaches, nightlife, and Mediterranean cuisine",
    weather: "Mediterranean climate",
    language: "Spanish, Catalan",
    currency: "Euro (EUR)",
    photos: [
      "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1469155253729-afa3d126e8c2?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1544016768-982d1802b665?w=800&h=600&fit=crop"
    ],
    attractions: [
      {
        name: "Sagrada Familia",
        description: "Gaudí's unfinished masterpiece and iconic basilica",
        type: "Religious Site"
      },
      {
        name: "Park Güell",
        description: "Colorful park designed by Antoni Gaudí",
        type: "Park"
      },
      {
        name: "Gothic Quarter",
        description: "Medieval neighborhood with narrow streets and historic buildings",
        type: "Neighborhood"
      }
    ],
    tips: [
      "Book Sagrada Familia tickets early",
      "Try tapas in local bars",
      "Stroll down Las Ramblas",
      "Enjoy the beaches in summer"
    ]
  }
};

export default function DestinationPage() {
  const params = useParams();
  const router = useRouter();
  const destinationName = params.name as string;
  
  const destination = destinationsData[destinationName as keyof typeof destinationsData];
  
  if (!destination) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Destination not found</h1>
          <Button onClick={() => router.push("/")}>Go back home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold">{destination.name}</h1>
            <Badge variant="outline" className="text-sm">
              {destination.country}
            </Badge>
          </div>
          <p className="text-xl text-gray-600 mt-2">{destination.description}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Photo Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {destination.photos.map((photo, index) => (
            <div 
              key={index} 
              className={`relative overflow-hidden rounded-lg ${index === 0 ? 'md:col-span-2 md:row-span-2' : 'aspect-square'}`}
            >
              <img 
                src={photo} 
                alt={`${destination.name} ${index + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors duration-300" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Camera className="w-6 h-6 mr-2 text-blue-600" />
                  About {destination.name}
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  {destination.longDescription}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Thermometer className="w-4 h-4 text-orange-500" />
                    <span className="font-medium">Climate:</span>
                    <span>{destination.weather}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Language:</span>
                    <span>{destination.language}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attractions */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <MapPin className="w-6 h-6 mr-2 text-red-600" />
                  Top Attractions
                </h2>
                <div className="space-y-4">
                  {destination.attractions.map((attraction, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{attraction.name}</h3>
                          <p className="text-gray-600 text-sm mb-1">{attraction.description}</p>
                          <Badge variant="secondary" className="text-xs">
                            {attraction.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Travel Tips */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Star className="w-6 h-6 mr-2 text-yellow-600" />
                  Travel Tips
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {destination.tips.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-gray-700 text-sm">{tip}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Quick Info</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-sm">Best Time to Visit</p>
                      <p className="text-gray-600 text-sm">{destination.bestTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-sm">Currency</p>
                      <p className="text-gray-600 text-sm">{destination.currency}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Star className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-sm">Famous For</p>
                      <p className="text-gray-600 text-sm">{destination.famousFor}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Highlights */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Must-See Highlights</h3>
                <div className="space-y-2">
                  {destination.highlights.map((highlight, index) => (
                    <Badge key={index} variant="outline" className="mr-2 mb-2">
                      {highlight}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Culture */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Culture & Lifestyle</h3>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {destination.culture}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}