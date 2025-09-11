# SerpAPI Integration for Real Google Events

## Overview
SerpAPI has been integrated as the primary data source for real Google Events data, with Perplexity as a fallback. This provides access to current, verified events from Google's events database.

## API Key Setup
- **SerpAPI Key**: Get your key from https://serpapi.com/
- **Storage**: Secure environment variables in AWS Lambda (not hardcoded)
- **Monthly Quota**: 100 free searches, then $50/month for 5,000 searches
- **Coverage**: Global Google Events data with location filtering

## Features Implemented

### 🔍 **Lambda Function Integration**
- **Primary Search Source**: SerpAPI Google Events engine
- **Fallback Chain**: SerpAPI → Perplexity → Generated Events
- **Smart Categorization**: Auto-categorizes events based on titles
- **Location Filtering**: Uses user's specified location
- **Time Filtering**: Today, Tomorrow, This Weekend, Next Week, This Month

### 🗺️ **Map Integration**
- **Real Nearby Events**: Fetches actual events around user's location
- **Reverse Geocoding**: Converts coordinates to city names
- **Smart Fallbacks**: Uses generated events if API fails
- **Category-based Pins**: Color-coded markers based on event type

## SerpAPI Request Format

### Search Parameters:
```javascript
{
    engine: 'google_events',
    q: 'events in [location] [category] [keywords]',
    location: '[city/location]',
    api_key: '[your-key]',
    num: 20, // Max events to return
    htichips: '[time_filter]' // today, tomorrow, this_weekend, etc.
}
```

### Response Format:
```javascript
{
    events_results: [
        {
            title: "Event Name",
            date: {
                start_date: "2025-09-15",
                when: "Sat, Sep 15, 7:00 PM"
            },
            address: ["123 Main St", "City, State"],
            venue: {
                name: "Venue Name",
                reviews: "4.5 stars"
            },
            ticket_info: [{
                source: "Eventbrite",
                link: "https://eventbrite.com/...",
                price: "$25"
            }],
            description: "Event description..."
        }
    ]
}
```

## Deployment Steps

### Step 1: Update Lambda Environment Variables
```bash
# In AWS Lambda Console, set these environment variables:
SERPAPI_KEY = [your-serpapi-key]
PERPLEXITY_API_KEY = [your-perplexity-key] 
ANTHROPIC_API_KEY = [your-claude-key]

# IMPORTANT: Keys are stored as environment variables for security
# They are NOT hardcoded in the Lambda function code
# Replace [your-*-key] with actual API keys from respective services
```

### Step 2: Upload Updated Lambda Function
1. **Upload**: `enhanced-search-processor-fixed.js` to your Lambda function
2. **Test**: Run a search to verify SerpAPI integration
3. **Monitor**: Check CloudWatch logs for successful API calls

### Step 3: Frontend Testing
1. **Search Function**: Test location-based searches
2. **Map Function**: Test "Browse Events" with location permission
3. **Verify Results**: Check that real events appear in both search and map

## Benefits of SerpAPI Integration

### ✅ **Real Event Data**
- Actual Google Events instead of generated content
- Current, up-to-date event listings
- Official venue information and ticket links

### ✅ **Better User Experience**
- Accurate event dates and times
- Real venue addresses and contact info
- Direct links to ticket purchasing

### ✅ **Location Intelligence**
- Precise location-based filtering
- Support for any city/location worldwide
- Time-based event filtering

### ✅ **Reliability**
- Fallback chain ensures results even if APIs fail
- Error handling for API rate limits
- Smart categorization of events

## API Usage Monitoring

### Current Limits:
- **Free Tier**: 100 searches/month
- **After Free Tier**: $50/month for 5,000 searches
- **Cost per Search**: ~$0.01 per search after free tier

### Optimization Strategies:
1. **Cache Results**: Cache search results for 1 hour to reduce API calls
2. **Location Grouping**: Group nearby searches to same city
3. **Smart Fallbacks**: Use generated events for common locations

## Testing Commands

### Test SerpAPI directly:
```bash
curl "https://serpapi.com/search?engine=google_events&q=events+in+berlin&location=berlin&api_key=[your-serpapi-key]"
```

### Test Lambda function:
```bash
# Should now return real Google Events
curl -X POST https://your-api-url/search-events \
  -H "Content-Type: application/json" \
  -d '{"searchParams":{"location":"berlin","activity_type":"Music"},"userId":"test"}'
```

## Expected Results
✅ **Real Google Events** in search results  
✅ **Location-specific events** on the map  
✅ **Accurate event details** with dates, venues, prices  
✅ **Direct booking links** for tickets  
✅ **Fallback functionality** if API fails  

Your EventFinder now has access to Google's comprehensive events database! 🎉