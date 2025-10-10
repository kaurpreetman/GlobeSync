# API Setup Instructions for City Comparison Feature

The city comparison feature now integrates with real APIs to provide live data for weather, flights, trains, and budget information. Follow these steps to set up the required API keys.

## Required APIs

### 1. Weather Data - OpenWeatherMap
- **Website**: https://openweathermap.org/api
- **Cost**: Free tier available (1000 calls/day)
- **Setup**:
  1. Sign up for a free account
  2. Generate an API key from the dashboard
  3. Add to `.env.local`: `NEXT_PUBLIC_OPENWEATHER_API_KEY=your_key_here`

### 2. Flight Data - RapidAPI (Skyscanner Alternative)
- **Website**: https://rapidapi.com/
- **API**: Sky Scanner API or similar flight search APIs
- **Cost**: Free tier available (limited requests)
- **Setup**:
  1. Sign up for RapidAPI account
  2. Subscribe to a flight search API
  3. Get your RapidAPI key
  4. Add to `.env.local`: `NEXT_PUBLIC_RAPIDAPI_KEY=your_key_here`

### 3. Budget Data - Cost of Living API
- **Website**: https://rapidapi.com/
- **API**: Cost of Living and Prices API
- **Cost**: Free tier available
- **Setup**: Uses the same RapidAPI key as above

### 4. Train Data - European Train APIs
- **Website**: https://rapidapi.com/
- **API**: Trainline or European Rail APIs
- **Cost**: Free tier available
- **Setup**: Uses the same RapidAPI key as above

## Environment Variables Setup

Create a `.env.local` file in your project root:

```env
# Weather API (Required)
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweathermap_api_key

# RapidAPI Key (Required for flights, trains, budget)
NEXT_PUBLIC_RAPIDAPI_KEY=your_rapidapi_key

# Alternative APIs (Optional)
NEXT_PUBLIC_AMADEUS_API_KEY=your_amadeus_api_key
NEXT_PUBLIC_AMADEUS_API_SECRET=your_amadeus_api_secret
NEXT_PUBLIC_WEATHERAPI_KEY=your_weatherapi_key
```

## API Endpoints Used

### Weather (OpenWeatherMap)
```
GET https://api.openweathermap.org/data/2.5/weather
Parameters: q (city), appid (key), units (metric)
```

### Flights (RapidAPI - Skyscanner)
```
GET https://sky-scanner3.p.rapidapi.com/flights/search-one-way
Parameters: fromEntityId, toEntityId, departDate, adults
Headers: X-RapidAPI-Key, X-RapidAPI-Host
```

### Budget (RapidAPI - Cost of Living)
```
GET https://cost-of-living-and-prices.p.rapidapi.com/prices
Parameters: city_name
Headers: X-RapidAPI-Key, X-RapidAPI-Host
```

### Trains (RapidAPI - Trainline)
```
GET https://trainline-eu.p.rapidapi.com/search
Parameters: from, to, date, passengers
Headers: X-RapidAPI-Key, X-RapidAPI-Host
```

## Fallback System

If APIs fail or keys are missing, the system automatically falls back to intelligent mock data that:
- Uses realistic prices and weather patterns
- Varies based on city and season
- Provides consistent user experience
- Shows a message indicating fallback data is being used

## API Rate Limits & Costs

### Free Tiers Available:
- **OpenWeatherMap**: 1,000 calls/day
- **RapidAPI APIs**: Usually 100-1000 calls/month per API

### Recommendations:
- Start with free tiers to test
- Monitor usage in API dashboards  
- Upgrade to paid plans for production
- Implement caching to reduce API calls

## Testing Without API Keys

The system works without API keys by using fallback data. For development:

1. Clone the repository
2. Run `npm install`
3. Run `npm run dev`
4. The comparison feature will work with mock data
5. Add API keys gradually as needed

## Production Deployment

For production deployment:

1. Set all environment variables in your hosting platform
2. Monitor API usage and costs
3. Implement proper error handling
4. Consider adding API response caching
5. Set up monitoring for API failures

## Supported Cities

The system works best with these cities (more can be added):
- **Europe**: Paris, London, Rome, Berlin, Amsterdam, Madrid, Barcelona
- **Asia**: Tokyo
- **North America**: New York, Los Angeles, Toronto
- **Others**: Any city supported by the weather API

## Troubleshooting

### Common Issues:
1. **API key not working**: Check the key is correct and active
2. **Rate limit exceeded**: Wait for reset or upgrade plan
3. **City not found**: Try different city name formats
4. **CORS errors**: API keys should be server-side in production

### Debug Mode:
Check browser console for detailed error messages and API responses.

## Support

For API-specific issues:
- OpenWeatherMap: https://openweathermap.org/faq
- RapidAPI: https://rapidapi.com/support

For integration issues, check the browser console and ensure all environment variables are properly set.