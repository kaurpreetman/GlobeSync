"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plane, MapPin, Calendar, Users, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { cityResolver, type CityResolution } from "@/lib/services/cityResolver";
import { useToast } from "@/components/ui/use-toast";

interface FlightSearchProps {
  onSearchResults?: (results: any) => void;
  defaultOrigin?: string;
  defaultDestination?: string;
}

interface FlightSearchData {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
}

const SmartFlightSearch: React.FC<FlightSearchProps> = ({
  onSearchResults,
  defaultOrigin = "",
  defaultDestination = ""
}) => {
  const { toast } = useToast();
  
  const [searchData, setSearchData] = useState<FlightSearchData>({
    origin: defaultOrigin,
    destination: defaultDestination,
    departureDate: "",
    returnDate: "",
    passengers: 1
  });
  
  const [cityResolutions, setCityResolutions] = useState<{
    origin?: CityResolution;
    destination?: CityResolution;
  }>({});
  
  const [isResolving, setIsResolving] = useState<{
    origin: boolean;
    destination: boolean;
  }>({ origin: false, destination: false });
  
  const [isSearching, setIsSearching] = useState(false);
  
  // Debounced city resolution
  const resolveCityName = useCallback(async (
    cityInput: string, 
    field: 'origin' | 'destination'
  ) => {
    if (!cityInput.trim() || cityInput.length < 3) {
      setCityResolutions(prev => ({ ...prev, [field]: undefined }));
      return;
    }

    setIsResolving(prev => ({ ...prev, [field]: true }));
    
    try {
      const resolution = await cityResolver.resolveCityName(cityInput);
      setCityResolutions(prev => ({ ...prev, [field]: resolution }));
      
      if (resolution.confidence < 0.7) {
        toast({
          title: "City Name Suggestion",
          description: `Did you mean "${resolution.resolved}" in ${resolution.country}?`,
          duration: 3000
        });
      }
    } catch (error) {
      console.error(`Error resolving ${field} city:`, error);
    } finally {
      setIsResolving(prev => ({ ...prev, [field]: false }));
    }
  }, [toast]);

  // Debounce city resolution
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      resolveCityName(searchData.origin, 'origin');
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchData.origin, resolveCityName]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      resolveCityName(searchData.destination, 'destination');
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchData.destination, resolveCityName]);

  const handleInputChange = (field: keyof FlightSearchData, value: string | number) => {
    setSearchData(prev => ({ ...prev, [field]: value }));
  };

  const handleSearchFlights = async () => {
    if (!searchData.origin.trim() || !searchData.destination.trim() || !searchData.departureDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in origin, destination, and departure date.",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    
    try {
      // Use resolved city names for the search
      const originCity = cityResolutions.origin?.resolved || searchData.origin;
      const destinationCity = cityResolutions.destination?.resolved || searchData.destination;
      
      const searchParams = new URLSearchParams({
        origin: originCity,
        destination: destinationCity,
        departure_date: searchData.departureDate,
        passengers: searchData.passengers.toString()
      });

      if (searchData.returnDate) {
        searchParams.append('return_date', searchData.returnDate);
      }

      const response = await fetch(`/api/flights/search?${searchParams}`);
      
      if (!response.ok) {
        throw new Error('Flight search failed');
      }

      const results = await response.json();
      
      toast({
        title: "Flights Found!",
        description: `Found ${results.data?.flights?.length || 0} flight options.`
      });
      
      onSearchResults?.(results);

    } catch (error) {
      console.error('Flight search error:', error);
      toast({
        title: "Search Failed",
        description: "Unable to search flights. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getCityStatusIcon = (field: 'origin' | 'destination') => {
    if (isResolving[field]) {
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    }
    
    const resolution = cityResolutions[field];
    if (!resolution) return null;
    
    if (resolution.confidence >= 0.8) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else if (resolution.confidence >= 0.5) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5" />
          Smart Flight Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Origin and Destination */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              From
              {getCityStatusIcon('origin')}
            </label>
            <Input
              placeholder="Enter origin city (e.g., New York, Deli, Mumbay)"
              value={searchData.origin}
              onChange={(e) => handleInputChange('origin', e.target.value)}
              className="w-full"
            />
            {cityResolutions.origin && (
              <div className="flex items-center gap-2 text-xs">
                <Badge 
                  variant={cityResolutions.origin.confidence >= 0.8 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {cityResolutions.origin.resolved}, {cityResolutions.origin.country}
                </Badge>
                <span className="text-muted-foreground">
                  Confidence: {Math.round(cityResolutions.origin.confidence * 100)}%
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              To
              {getCityStatusIcon('destination')}
            </label>
            <Input
              placeholder="Enter destination city (e.g., Paris, Londen, Tokyo)"
              value={searchData.destination}
              onChange={(e) => handleInputChange('destination', e.target.value)}
              className="w-full"
            />
            {cityResolutions.destination && (
              <div className="flex items-center gap-2 text-xs">
                <Badge 
                  variant={cityResolutions.destination.confidence >= 0.8 ? "default" : "secondary"}
                  className="text-xs"
                >
                  {cityResolutions.destination.resolved}, {cityResolutions.destination.country}
                </Badge>
                <span className="text-muted-foreground">
                  Confidence: {Math.round(cityResolutions.destination.confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Dates and Passengers */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Departure Date
            </label>
            <Input
              type="date"
              value={searchData.departureDate}
              onChange={(e) => handleInputChange('departureDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Return Date (Optional)
            </label>
            <Input
              type="date"
              value={searchData.returnDate}
              onChange={(e) => handleInputChange('returnDate', e.target.value)}
              min={searchData.departureDate || new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Passengers
            </label>
            <Input
              type="number"
              min="1"
              max="9"
              value={searchData.passengers}
              onChange={(e) => handleInputChange('passengers', parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        {/* City Resolution Warnings */}
        {(cityResolutions.origin?.confidence && cityResolutions.origin.confidence < 0.7) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Origin city "{searchData.origin}" was auto-corrected to "{cityResolutions.origin.resolved}". 
              {cityResolutions.origin.alternatives && cityResolutions.origin.alternatives.length > 0 && (
                <span> Alternatives: {cityResolutions.origin.alternatives.join(', ')}</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {(cityResolutions.destination?.confidence && cityResolutions.destination.confidence < 0.7) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Destination city "{searchData.destination}" was auto-corrected to "{cityResolutions.destination.resolved}". 
              {cityResolutions.destination.alternatives && cityResolutions.destination.alternatives.length > 0 && (
                <span> Alternatives: {cityResolutions.destination.alternatives.join(', ')}</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Search Button */}
        <Button 
          onClick={handleSearchFlights} 
          disabled={isSearching || isResolving.origin || isResolving.destination}
          className="w-full"
          size="lg"
        >
          {isSearching && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Search Flights
        </Button>
      </CardContent>
    </Card>
  );
};

export default SmartFlightSearch;