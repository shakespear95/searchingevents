// enhanced-search-processor-fixed.js - Background search processing Lambda with error handling
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

// Environment variables for API keys (must be set in Lambda configuration)
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SERPAPI_KEY = process.env.SERPAPI_KEY;

const SEARCH_REQUESTS_TABLE = process.env.SEARCH_REQUESTS_TABLE || 'EventFinderSearchRequests';
const USER_SEARCHES_TABLE = process.env.USER_SEARCHES_TABLE || 'EventFinderUserSearches';

exports.handler = async (event) => {
    console.log('🎯 Background search processor started:', JSON.stringify(event));
    
    const startTime = Date.now();
    let requestId, searchParams, userId;
    
    try {
        // Extract parameters from async invocation
        requestId = event.requestId;
        searchParams = event.searchParams;
        userId = event.userId;
        
        if (!requestId || !searchParams) {
            throw new Error('Missing required parameters: requestId or searchParams');
        }
        
        console.log('🔖 Processing request:', requestId);
        console.log('📝 Search parameters:', searchParams);
        
        // Update status to indicate processing has started
        await updateSearchStatus(requestId, 'processing', {
            processingStartedAt: new Date().toISOString(),
            currentStep: 'Gathering event data from multiple sources...'
        });

        // Step 1: Build search prompt
        const searchPrompt = buildSearchPrompt(searchParams);
        console.log('🔍 Search prompt built');

        // Step 2: Call Perplexity for real-time event data
        console.log('🌐 Calling Perplexity API for event data...');
        await updateSearchStatus(requestId, 'processing', {
            currentStep: 'Searching for events using AI web search...'
        });

        let eventsData;
        try {
            // Step 2a: Try SerpAPI Google Events search first
            console.log('🔍 Searching Google Events with SerpAPI...');
            await updateSearchStatus(requestId, 'processing', {
                currentStep: 'Searching Google Events...'
            });

            eventsData = await callSerpAPI(searchParams);
            console.log('✅ SerpAPI Google Events data received');
            
        } catch (serpError) {
            console.error('🔴 SerpAPI failed, trying Perplexity fallback:', serpError.message);
            
            try {
                // Fallback to Perplexity
                const perplexityResponse = await callPerplexityAPI(searchPrompt);
                
                if (!perplexityResponse || !perplexityResponse.choices?.[0]?.message?.content) {
                    throw new Error('No data received from Perplexity API');
                }
                
                eventsData = perplexityResponse.choices[0].message.content;
                console.log('✅ Perplexity API fallback successful');
                
            } catch (perplexityError) {
                console.error('🔴 Both APIs failed, using fallback event data:', perplexityError.message);
                eventsData = generateFallbackEvents(searchParams);
            }
        }

        // Step 3: Process and structure results with Claude
        console.log('🤖 Processing results with Claude AI...');
        await updateSearchStatus(requestId, 'processing', {
            currentStep: 'Processing and formatting event data...'
        });

        const structuredEvents = await processWithClaude(eventsData, searchParams);
        
        console.log('✅ Claude processing completed');

        // Step 4: Save to user search history
        console.log('💾 Saving search results...');
        await updateSearchStatus(requestId, 'processing', {
            currentStep: 'Saving search results...'
        });

        await saveSearchResults(requestId, userId, searchParams, structuredEvents);

        // Step 5: Mark as completed
        await updateSearchStatus(requestId, 'completed', {
            results: structuredEvents,
            completedAt: new Date().toISOString(),
            processingTimeMs: Date.now() - startTime
        });

        console.log(`✅ Search processing completed successfully for ${requestId}`);
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                requestId,
                eventCount: structuredEvents?.length || 0,
                processingTimeMs: Date.now() - startTime
            })
        };

    } catch (error) {
        console.error('💥 Background processing error:', error);
        
        // Update status to indicate error
        if (requestId) {
            try {
                await updateSearchStatus(requestId, 'error', {
                    error: error.message,
                    completedAt: new Date().toISOString(),
                    processingTimeMs: Date.now() - startTime
                });
            } catch (statusUpdateError) {
                console.error('Failed to update error status:', statusUpdateError);
            }
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error.message,
                requestId
            })
        };
    }
};

// Helper function to update search status with error handling
async function updateSearchStatus(requestId, status, additionalData = {}) {
    try {
        await dynamoDB.send(new UpdateCommand({
            TableName: SEARCH_REQUESTS_TABLE,
            Key: { requestId },
            UpdateExpression: 'SET #status = :status, updatedAt = :timestamp' + 
                (Object.keys(additionalData).length > 0 ? ', ' + Object.keys(additionalData).map(key => `#${key} = :${key}`).join(', ') : ''),
            ExpressionAttributeNames: {
                '#status': 'status',
                ...Object.keys(additionalData).reduce((acc, key) => ({ ...acc, [`#${key}`]: key }), {})
            },
            ExpressionAttributeValues: {
                ':status': status,
                ':timestamp': new Date().toISOString(),
                ...Object.keys(additionalData).reduce((acc, key) => ({ ...acc, [`:${key}`]: additionalData[key] }), {})
            }
        }));
    } catch (error) {
        if (error.name === 'ResourceNotFoundException') {
            console.error(`❌ DynamoDB table ${SEARCH_REQUESTS_TABLE} not found. Please create the table first.`);
            // Create a fallback response - don't crash the entire function
            console.log('⚠️ Continuing without status updates due to missing table');
            return;
        }
        throw error;
    }
}

// Build search prompt for Perplexity
function buildSearchPrompt(searchParams) {
    const { location, activity_type, timeframe, radius, keywords } = searchParams;
    
    let prompt = `Search for upcoming events in ${location}`;
    
    if (activity_type && activity_type !== 'Any') {
        prompt += ` in the ${activity_type.toLowerCase()} category`;
    }
    
    if (timeframe && timeframe !== 'Anytime') {
        prompt += ` ${timeframe.toLowerCase().replace('this ', 'this ')}`;
    }
    
    if (keywords && keywords.trim()) {
        prompt += ` matching keywords: ${keywords}`;
    }
    
    prompt += `. Please find real, currently scheduled events with:
- Event name and description
- Date and time details
- Venue name and address
- Ticket prices or "Free" if no cost
- Official website or booking links
- Event organizer information

Focus on events that are officially announced and have verified details. Include both indoor and outdoor events, concerts, festivals, workshops, exhibitions, and community events.`;
    
    console.log('🔍 Generated search prompt:', prompt);
    return prompt;
}

// Call SerpAPI for Google Events
async function callSerpAPI(searchParams) {
    try {
        const { location, activity_type, timeframe, keywords } = searchParams;
        
        // Build search query for Google Events
        let query = `events in ${location}`;
        
        if (activity_type && activity_type !== 'Any') {
            query += ` ${activity_type.toLowerCase()}`;
        }
        
        if (keywords && keywords.trim()) {
            query += ` ${keywords}`;
        }
        
        // Add time filter if specified
        let timeFilter = '';
        if (timeframe && timeframe !== 'Anytime') {
            switch(timeframe.toLowerCase()) {
                case 'today':
                    timeFilter = 'today';
                    break;
                case 'tomorrow':
                    timeFilter = 'tomorrow';
                    break;
                case 'this weekend':
                    timeFilter = 'this_weekend';
                    break;
                case 'next week':
                    timeFilter = 'next_week';
                    break;
                case 'this month':
                    timeFilter = 'this_month';
                    break;
                default:
                    timeFilter = '';
            }
        }
        
        // SerpAPI Google Events parameters
        const serpParams = new URLSearchParams({
            engine: 'google_events',
            q: query,
            location: location,
            api_key: SERPAPI_KEY,
            num: 20, // Get up to 20 events
        });
        
        if (timeFilter) {
            serpParams.append('htichips', timeFilter);
        }
        
        console.log('🔍 SerpAPI query:', query);
        console.log('🌍 Location:', location);
        
        const response = await fetch(`https://serpapi.com/search?${serpParams.toString()}`, {
            method: 'GET',
            headers: {
                'User-Agent': 'EventFinder/1.0'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('SerpAPI response error:', response.status, response.statusText, errorText);
            throw new Error(`SerpAPI error: ${response.status} ${response.statusText}. Details: ${errorText}`);
        }

        const data = await response.json();
        
        if (data.error) {
            throw new Error(`SerpAPI error: ${data.error}`);
        }
        
        if (!data.events_results || data.events_results.length === 0) {
            console.log('⚠️ No events found in SerpAPI response');
            throw new Error('No events found for the specified criteria');
        }
        
        console.log(`✅ Found ${data.events_results.length} events from Google Events`);
        
        // Format events for Claude processing
        return formatSerpAPIEvents(data.events_results, searchParams);
        
    } catch (error) {
        console.error('SerpAPI call failed:', error);
        throw new Error(`Failed to fetch events from SerpAPI: ${error.message}`);
    }
}

// Format SerpAPI events for Claude processing
function formatSerpAPIEvents(events, searchParams) {
    console.log('📝 Formatting SerpAPI events for processing...');
    
    let formattedText = `Found ${events.length} events in ${searchParams.location}:\n\n`;
    
    events.forEach((event, index) => {
        formattedText += `${index + 1}. EVENT: ${event.title || 'Untitled Event'}\n`;
        
        if (event.date) {
            formattedText += `   DATE: ${event.date.start_date}`;
            if (event.date.when) {
                formattedText += ` (${event.date.when})`;
            }
            formattedText += '\n';
        }
        
        if (event.address) {
            formattedText += `   LOCATION: ${event.address.join(', ')}\n`;
        }
        
        if (event.description) {
            formattedText += `   DESCRIPTION: ${event.description}\n`;
        }
        
        if (event.ticket_info && event.ticket_info.length > 0) {
            const ticketInfo = event.ticket_info[0];
            if (ticketInfo.source) {
                formattedText += `   BOOKING: ${ticketInfo.source}\n`;
            }
            if (ticketInfo.link) {
                formattedText += `   WEBSITE: ${ticketInfo.link}\n`;
            }
        }
        
        if (event.venue) {
            formattedText += `   VENUE: ${event.venue.name || event.venue}\n`;
            if (event.venue.reviews) {
                formattedText += `   VENUE_RATING: ${event.venue.reviews} reviews\n`;
            }
        }
        
        // Extract category from event type or description
        let category = searchParams.activity_type || 'Event';
        if (event.title) {
            const title = event.title.toLowerCase();
            if (title.includes('music') || title.includes('concert') || title.includes('band')) {
                category = 'Music';
            } else if (title.includes('food') || title.includes('restaurant') || title.includes('dining')) {
                category = 'Food';
            } else if (title.includes('sport') || title.includes('fitness') || title.includes('run')) {
                category = 'Sports';
            } else if (title.includes('art') || title.includes('museum') || title.includes('gallery')) {
                category = 'Arts';
            } else if (title.includes('business') || title.includes('networking') || title.includes('tech')) {
                category = 'Business';
            }
        }
        formattedText += `   CATEGORY: ${category}\n\n`;
    });
    
    console.log('✅ Events formatted for Claude processing');
    return formattedText;
}

// Call Perplexity API
async function callPerplexityAPI(prompt) {
    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-small-128k-online',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert event researcher. Find real, current events with complete details including dates, locations, prices, and official websites. Use web search to find official event listings and verified information.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.2,
                top_p: 0.9,
                return_citations: true,
                search_domain_filter: ["facebook.com", "eventbrite.com", "meetup.com", "ticketmaster.com"],
                return_images: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Perplexity API response error:', response.status, response.statusText, errorText);
            throw new Error(`Perplexity API error: ${response.status} ${response.statusText}. Details: ${errorText}`);
        }

        const data = await response.json();
        console.log('Perplexity API response received successfully');
        return data;
    } catch (error) {
        console.error('Perplexity API call failed:', error);
        throw new Error(`Failed to fetch events from Perplexity: ${error.message}`);
    }
}

// Process results with Claude
async function processWithClaude(rawEventData, searchParams) {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': ANTHROPIC_API_KEY,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 4000,
                messages: [
                    {
                        role: 'user',
                        content: `Parse this event data into a clean JSON array. Extract only real events with complete information:

${rawEventData}

Return ONLY a JSON array of events with this exact structure:
[
  {
    "name": "Event Name",
    "description": "Brief description",
    "date": "YYYY-MM-DD or descriptive date",
    "time": "Time if available",
    "location": "Venue name and address",
    "price": "Free, price, or price range",
    "source": "Website URL if available",
    "category": "${searchParams.activity_type || 'Event'}"
  }
]

Requirements:
- Only include events with names and locations
- Format dates consistently
- Include pricing information if available
- Add website URLs when found
- Limit to 10 best events
- Return valid JSON only, no additional text`
                    }
                ]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.content?.[0]?.text;

        if (!content) {
            throw new Error('No content received from Claude API');
        }

        // Parse JSON response
        try {
            const events = JSON.parse(content);
            return Array.isArray(events) ? events : [];
        } catch (parseError) {
            console.error('Failed to parse Claude response as JSON:', parseError);
            // Return a fallback event structure
            return [{
                name: "Events Found",
                description: "Search completed but formatting failed. Please try again.",
                date: new Date().toISOString().split('T')[0],
                location: searchParams.location || "Various locations",
                price: "Varies",
                source: "",
                category: searchParams.activity_type || "Event"
            }];
        }

    } catch (error) {
        console.error('Claude API call failed:', error);
        throw new Error(`Failed to process events with Claude: ${error.message}`);
    }
}

// Save search results to user history
async function saveSearchResults(requestId, userId, searchParams, events) {
    try {
        const searchId = `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const searchRecord = {
            searchId,
            userId: userId || 'anonymous',
            searchCriteria: searchParams,
            searchTimestamp: new Date().toISOString(),
            eventCount: events.length,
            events: events,
            requestId
        };

        await dynamoDB.send(new PutCommand({
            TableName: USER_SEARCHES_TABLE,
            Item: searchRecord
        }));

        console.log('✅ Search results saved to user history');
    } catch (error) {
        if (error.name === 'ResourceNotFoundException') {
            console.error(`❌ DynamoDB table ${USER_SEARCHES_TABLE} not found. Skipping history save.`);
            return;
        }
        console.error('Failed to save search results:', error);
        // Don't throw - this shouldn't fail the entire search
    }
}

// Generate fallback events when API fails
function generateFallbackEvents(searchParams) {
    const { location, activity_type, timeframe } = searchParams;
    
    return `Here are some general event suggestions for ${location}:

1. Local Cultural Center Events
   - Location: ${location} Cultural Center
   - Date: Weekly events throughout ${timeframe || 'the month'}
   - Description: Art exhibitions, workshops, and community gatherings
   - Price: Free to €15
   - Website: Check local cultural center websites

2. ${activity_type || 'Community'} Meetups
   - Location: Various venues in ${location}
   - Date: Regular meetups
   - Description: Local ${activity_type?.toLowerCase() || 'community'} groups and networking events
   - Price: Free to €20
   - Website: Meetup.com, Facebook Events

3. Local Restaurants and Bars
   - Location: ${location} city center
   - Date: Daily activities
   - Description: Live music, quiz nights, special dinners
   - Price: Varies by venue
   - Website: Check individual restaurant websites

Note: These are general suggestions. Please check local event listings, social media, and official websites for current specific events in ${location}.`;
}