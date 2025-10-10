// Geocoding utility to get coordinates for cities
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodingResult {
  coordinates: Coordinates;
  formatted_address: string;
  city: string;
  country: string;
}

// Using OpenCage Geocoding API (free tier available)
const GEOCODING_API_KEY = process.env.OPENCAGE_API_KEY || 'your-opencage-api-key';
const GEOCODING_BASE_URL = 'https://api.opencagedata.com/geocode/v1/json';

export async function geocodeCity(cityName: string): Promise<GeocodingResult | null> {
  try {
    const response = await fetch(
      `${GEOCODING_BASE_URL}?q=${encodeURIComponent(cityName)}&key=${GEOCODING_API_KEY}&limit=1&no_annotations=1`
    );
    
    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      const coords = result.geometry;
      const components = result.components;
      
      return {
        coordinates: {
          lat: coords.lat,
          lng: coords.lng
        },
        formatted_address: result.formatted,
        city: components.city || components.town || components.village || cityName,
        country: components.country || 'Unknown'
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Fallback coordinates for major cities
const FALLBACK_COORDINATES: Record<string, Coordinates> = {
  'delhi': { lat: 28.6139, lng: 77.2090 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'bangalore': { lat: 12.9716, lng: 77.5946 },
  'chennai': { lat: 13.0827, lng: 80.2707 },
  'kolkata': { lat: 22.5726, lng: 88.3639 },
  'hyderabad': { lat: 17.3850, lng: 78.4867 },
  'pune': { lat: 18.5204, lng: 73.8567 },
  'ahmedabad': { lat: 23.0225, lng: 72.5714 },
  'jaipur': { lat: 26.9124, lng: 75.7873 },
  'surat': { lat: 21.1702, lng: 72.8311 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'melbourne': { lat: -37.8136, lng: 144.9631 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'rome': { lat: 41.9028, lng: 12.4964 },
  'madrid': { lat: 40.4168, lng: -3.7038 },
  'barcelona': { lat: 41.3851, lng: 2.1734 },
  'amsterdam': { lat: 52.3676, lng: 4.9041 },
  'vienna': { lat: 48.2082, lng: 16.3738 },
  'prague': { lat: 50.0755, lng: 14.4378 },
  'budapest': { lat: 47.4979, lng: 19.0402 },
  'warsaw': { lat: 52.2297, lng: 21.0122 },
  'moscow': { lat: 55.7558, lng: 37.6176 },
  'istanbul': { lat: 41.0082, lng: 28.9784 },
  'cairo': { lat: 30.0444, lng: 31.2357 },
  'johannesburg': { lat: -26.2041, lng: 28.0473 },
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'nairobi': { lat: -1.2921, lng: 36.8219 },
  'lagos': { lat: 6.5244, lng: 3.3792 },
  'casablanca': { lat: 33.5731, lng: -7.5898 },
  'tunis': { lat: 36.8065, lng: 10.1815 },
  'algiers': { lat: 36.7538, lng: 3.0588 },
  'beijing': { lat: 39.9042, lng: 116.4074 },
  'shanghai': { lat: 31.2304, lng: 121.4737 },
  'hong kong': { lat: 22.3193, lng: 114.1694 },
  'taipei': { lat: 25.0330, lng: 121.5654 },
  'seoul': { lat: 37.5665, lng: 126.9780 },
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'jakarta': { lat: -6.2088, lng: 106.8456 },
  'manila': { lat: 14.5995, lng: 120.9842 },
  'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
  'ho chi minh city': { lat: 10.8231, lng: 106.6297 },
  'hanoi': { lat: 21.0285, lng: 105.8542 },
  'phnom penh': { lat: 11.5564, lng: 104.9282 },
  'vientiane': { lat: 17.9757, lng: 102.6331 },
  'yangon': { lat: 16.8661, lng: 96.1951 },
  'dhaka': { lat: 23.8103, lng: 90.4125 },
  'karachi': { lat: 24.8607, lng: 67.0011 },
  'lahore': { lat: 31.5204, lng: 74.3587 },
  'islamabad': { lat: 33.6844, lng: 73.0479 },
  'kabul': { lat: 34.5553, lng: 69.2075 },
  'tehran': { lat: 35.6892, lng: 51.3890 },
  'baghdad': { lat: 33.3152, lng: 44.3661 },
  'riyadh': { lat: 24.7136, lng: 46.6753 },
  'jeddah': { lat: 21.4858, lng: 39.1925 },
  'doha': { lat: 25.2854, lng: 51.5310 },
  'kuwait city': { lat: 29.3759, lng: 47.9774 },
  'manama': { lat: 26.0667, lng: 50.5577 },
  'muscat': { lat: 23.5880, lng: 58.3829 },
  'abu dhabi': { lat: 24.2992, lng: 54.6973 },
  'tel aviv': { lat: 32.0853, lng: 34.7818 },
  'jerusalem': { lat: 31.7683, lng: 35.2137 },
  'beirut': { lat: 33.8938, lng: 35.5018 },
  'damascus': { lat: 33.5138, lng: 36.2765 },
  'amman': { lat: 31.9454, lng: 35.9284 },
  'riyadh': { lat: 24.7136, lng: 46.6753 },
  'ankara': { lat: 39.9334, lng: 32.8597 },
  'athens': { lat: 37.9838, lng: 23.7275 },
  'lisbon': { lat: 38.7223, lng: -9.1393 },
  'dublin': { lat: 53.3498, lng: -6.2603 },
  'edinburgh': { lat: 55.9533, lng: -3.1883 },
  'glasgow': { lat: 55.8642, lng: -4.2518 },
  'cardiff': { lat: 51.4816, lng: -3.1791 },
  'belfast': { lat: 54.5973, lng: -5.9301 },
  'oslo': { lat: 59.9139, lng: 10.7522 },
  'stockholm': { lat: 59.3293, lng: 18.0686 },
  'copenhagen': { lat: 55.6761, lng: 12.5683 },
  'helsinki': { lat: 60.1699, lng: 24.9384 },
  'tallinn': { lat: 59.4370, lng: 24.7536 },
  'riga': { lat: 56.9496, lng: 24.1052 },
  'vilnius': { lat: 54.6872, lng: 25.2797 },
  'brussels': { lat: 50.8503, lng: 4.3517 },
  'luxembourg': { lat: 49.6116, lng: 6.1319 },
  'zurich': { lat: 47.3769, lng: 8.5417 },
  'geneva': { lat: 46.2044, lng: 6.1432 },
  'bern': { lat: 46.9481, lng: 7.4474 },
  'monaco': { lat: 43.7384, lng: 7.4246 },
  'andorra': { lat: 42.5063, lng: 1.5218 },
  'san marino': { lat: 43.9424, lng: 12.4578 },
  'vatican city': { lat: 41.9029, lng: 12.4534 },
  'valletta': { lat: 35.8989, lng: 14.5146 },
  'nicosia': { lat: 35.1856, lng: 33.3823 },
  'reykjavik': { lat: 64.1466, lng: -21.9426 },
  'torshavn': { lat: 62.0079, lng: -6.7909 },
  'longyearbyen': { lat: 78.2186, lng: 15.6401 },
  'nuuk': { lat: 64.1814, lng: -51.6941 },
  'ottawa': { lat: 45.4215, lng: -75.6972 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'vancouver': { lat: 49.2827, lng: -123.1207 },
  'montreal': { lat: 45.5017, lng: -73.5673 },
  'calgary': { lat: 51.0447, lng: -114.0719 },
  'edmonton': { lat: 53.5461, lng: -113.4938 },
  'winnipeg': { lat: 49.8951, lng: -97.1384 },
  'quebec city': { lat: 46.8139, lng: -71.2080 },
  'halifax': { lat: 44.6488, lng: -63.5752 },
  'st johns': { lat: 47.5615, lng: -52.7126 },
  'washington': { lat: 38.9072, lng: -77.0369 },
  'boston': { lat: 42.3601, lng: -71.0589 },
  'philadelphia': { lat: 39.9526, lng: -75.1652 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'detroit': { lat: 42.3314, lng: -83.0458 },
  'minneapolis': { lat: 44.9778, lng: -93.2650 },
  'denver': { lat: 39.7392, lng: -104.9903 },
  'dallas': { lat: 32.7767, lng: -96.7970 },
  'houston': { lat: 29.7604, lng: -95.3698 },
  'austin': { lat: 30.2672, lng: -97.7431 },
  'san antonio': { lat: 29.4241, lng: -98.4936 },
  'phoenix': { lat: 33.4484, lng: -112.0740 },
  'las vegas': { lat: 36.1699, lng: -115.1398 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'san diego': { lat: 32.7157, lng: -117.1611 },
  'san francisco': { lat: 37.7749, lng: -122.4194 },
  'seattle': { lat: 47.6062, lng: -122.3321 },
  'portland': { lat: 45.5152, lng: -122.6784 },
  'salt lake city': { lat: 40.7608, lng: -111.8910 },
  'albuquerque': { lat: 35.0844, lng: -106.6504 },
  'oklahoma city': { lat: 35.4676, lng: -97.5164 },
  'kansas city': { lat: 39.0997, lng: -94.5786 },
  'omaha': { lat: 41.2565, lng: -95.9345 },
  'des moines': { lat: 41.5868, lng: -93.6250 },
  'milwaukee': { lat: 43.0389, lng: -87.9065 },
  'indianapolis': { lat: 39.7684, lng: -86.1581 },
  'columbus': { lat: 39.9612, lng: -82.9988 },
  'cincinnati': { lat: 39.1031, lng: -84.5120 },
  'cleveland': { lat: 41.4993, lng: -81.6944 },
  'pittsburgh': { lat: 40.4406, lng: -79.9959 },
  'buffalo': { lat: 42.8864, lng: -78.8784 },
  'rochester': { lat: 43.1566, lng: -77.6088 },
  'syracuse': { lat: 43.0481, lng: -76.1474 },
  'albany': { lat: 42.6526, lng: -73.7562 },
  'hartford': { lat: 41.7658, lng: -72.6734 },
  'providence': { lat: 41.8240, lng: -71.4128 },
  'burlington': { lat: 44.4759, lng: -73.2121 },
  'concord': { lat: 43.2081, lng: -71.5376 },
  'augusta': { lat: 44.3106, lng: -69.7795 },
  'montpelier': { lat: 44.2601, lng: -72.5754 },
  'bismarck': { lat: 46.8083, lng: -100.7837 },
  'fargo': { lat: 46.8772, lng: -96.7898 },
  'rapid city': { lat: 43.0755, lng: -103.2020 },
  'sioux falls': { lat: 43.5446, lng: -96.7311 },
  'cheyenne': { lat: 41.1399, lng: -104.8192 },
  'billings': { lat: 45.7833, lng: -108.5007 },
  'boise': { lat: 43.6150, lng: -116.2023 },
  'spokane': { lat: 47.6588, lng: -117.4260 },
  'anchorage': { lat: 61.2181, lng: -149.9003 },
  'honolulu': { lat: 21.3099, lng: -157.8581 },
  'mexico city': { lat: 19.4326, lng: -99.1332 },
  'guadalajara': { lat: 20.6597, lng: -103.3496 },
  'monterrey': { lat: 25.6866, lng: -100.3161 },
  'puebla': { lat: 19.0414, lng: -98.2063 },
  'tijuana': { lat: 32.5149, lng: -117.0382 },
  'merida': { lat: 20.9674, lng: -89.5926 },
  'leon': { lat: 21.1223, lng: -101.6869 },
  'juarez': { lat: 31.6904, lng: -106.4244 },
  'torreon': { lat: 25.5431, lng: -103.4180 },
  'queretaro': { lat: 20.5881, lng: -100.3899 },
  'san luis potosi': { lat: 22.1565, lng: -100.9855 },
  'aguascalientes': { lat: 21.8853, lng: -102.2916 },
  'zacatecas': { lat: 22.7709, lng: -102.5832 },
  'durango': { lat: 24.0227, lng: -104.6708 },
  'chihuahua': { lat: 28.6329, lng: -106.0691 },
  'hermosillo': { lat: 29.0892, lng: -110.9613 },
  'culiacan': { lat: 24.8069, lng: -107.3942 },
  'mazatlan': { lat: 23.2494, lng: -106.4110 },
  'tampico': { lat: 22.2554, lng: -97.8675 },
  'veracruz': { lat: 19.1738, lng: -96.1342 },
  'villahermosa': { lat: 17.9876, lng: -92.9291 },
  'tuxtla gutierrez': { lat: 16.7519, lng: -93.1177 },
  'oaxaca': { lat: 17.0732, lng: -96.7266 },
  'acapulco': { lat: 16.8531, lng: -99.8237 },
  'chilpancingo': { lat: 17.5506, lng: -99.5058 },
  'cuernavaca': { lat: 18.9341, lng: -99.2307 },
  'toluca': { lat: 19.2925, lng: -99.6532 },
  'tlaxcala': { lat: 19.3185, lng: -98.2374 },
  'pachuca': { lat: 20.1109, lng: -98.7524 },
  'xalapa': { lat: 19.5312, lng: -96.9159 },
  'campeche': { lat: 19.8301, lng: -90.5349 },
  'chetumal': { lat: 18.5141, lng: -88.3038 },
  'cancun': { lat: 21.1619, lng: -86.8515 },
  'merida': { lat: 20.9674, lng: -89.5926 },
  'villahermosa': { lat: 17.9876, lng: -92.9291 },
  'tuxtla gutierrez': { lat: 16.7519, lng: -93.1177 },
  'oaxaca': { lat: 17.0732, lng: -96.7266 },
  'acapulco': { lat: 16.8531, lng: -99.8237 },
  'chilpancingo': { lat: 17.5506, lng: -99.5058 },
  'cuernavaca': { lat: 18.9341, lng: -99.2307 },
  'toluca': { lat: 19.2925, lng: -99.6532 },
  'tlaxcala': { lat: 19.3185, lng: -98.2374 },
  'pachuca': { lat: 20.1109, lng: -98.7524 },
  'xalapa': { lat: 19.5312, lng: -96.9159 },
  'campeche': { lat: 19.8301, lng: -90.5349 },
  'chetumal': { lat: 18.5141, lng: -88.3038 },
  'cancun': { lat: 21.1619, lng: -86.8515 }
};

export async function getCityCoordinates(cityName: string): Promise<Coordinates | null> {
  // First try geocoding API
  const geocodingResult = await geocodeCity(cityName);
  if (geocodingResult) {
    return geocodingResult.coordinates;
  }
  
  // Fallback to predefined coordinates
  const normalizedCityName = cityName.toLowerCase().trim();
  const coordinates = FALLBACK_COORDINATES[normalizedCityName];
  
  if (coordinates) {
    return coordinates;
  }
  
  // If no coordinates found, return null
  console.warn(`No coordinates found for city: ${cityName}`);
  return null;
}
