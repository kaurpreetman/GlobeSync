"use client";

interface CityResolution {
  original: string;
  resolved: string;
  confidence: number;
  country: string;
  alternatives?: string[];
}

interface FlightCityData {
  cityName: string;
  airportCode: string;
  country: string;
  fullName: string;
}

class CityResolverService {
  private cache: Map<string, CityResolution> = new Map();

  async resolveCityName(cityInput: string): Promise<CityResolution> {
    // Check cache first
    const cacheKey = cityInput.toLowerCase().trim();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const response = await fetch('/api/city/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityInput: cityInput.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('City resolution failed');
      }

      const resolution = await response.json();
      
      // Cache the result
      this.cache.set(cacheKey, resolution);
      
      return resolution;
    } catch (error) {
      console.error('City resolution error:', error);
      
      // Fallback resolution
      const fallback: CityResolution = {
        original: cityInput,
        resolved: this.basicCityNormalization(cityInput),
        confidence: 0.3,
        country: 'Unknown',
        alternatives: []
      };
      
      return fallback;
    }
  }

  async getFlightCityData(cityInput: string): Promise<FlightCityData | null> {
    try {
      const response = await fetch('/api/flights/city-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cityInput: cityInput.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Flight city data fetch failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Flight city data error:', error);
      return null;
    }
  }

  private basicCityNormalization(cityInput: string): string {
    // Basic normalization as fallback
    return cityInput
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Clear cache when needed
  clearCache(): void {
    this.cache.clear();
  }
}

export const cityResolver = new CityResolverService();
export type { CityResolution, FlightCityData };