// search-events-fixed-final.js - Returns JSON events + saves to database
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
let clients;

const EVENTS_TABLE = process.env.EVENTS_TABLE || 'EventFinderUserSearches';

// Function to fetch all API keys from Secrets Manager  
async function getApiKeys() {
    // TEMPORARY: Hardcoded keys for testing (REMOVE BEFORE PRODUCTION!)
    const testKeys = {
        claude: 'sk-ant-api03-ysqnMYPy3pGEZMGfE7fR1lxF8x3n0Aox7-6JUILnJnp8Qe5_pRGq9X0VjWAuL50Kp0BKRP1XnG-A7aw6Rn2rBFYMiTfXew-CAAACAA',
        perplexity: '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'
    };
    
    console.log('Using hardcoded test keys');
    console.log('Test keys loaded:', {
        claude: testKeys.claude ? `${testKeys.claude.substring(0, 10)}...` : 'MISSING',
        perplexity: testKeys.perplexity ? `${testKeys.perplexity.substring(0, 10)}...` : 'MISSING'
    });
    
    return testKeys;
}

// Function to initialize API clients
async function initializeClients(keys) {
    try {
        console.log('Initializing API clients...');
        
        return {
            anthropic: new Anthropic({ apiKey: keys.claude }),
            perplexityKey: keys.perplexity
        };
    } catch (error) {
        console.error('Failed to initialize clients:', error);
        throw error;
    }
}

// Function to call Perplexity API
async function getRawEventsFromPerplexity(apiKey, prompt) {
    try {
        console.log('Making Perplexity API call...');
        const startTime = Date.now();
        
        const response = await axios.post('https://api.perplexity.ai/chat/completions', {
            model: 'sonar-pro',
            messages: [{ 
                role: 'user', 
                content: prompt 
            }],
            max_tokens: 800,
            temperature: 0.2
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 25000
        });

        const duration = Date.now() - startTime;
        console.log(`Perplexity API call completed in ${duration}ms`);
        
        const content = response.data.choices[0]?.message?.content;
        console.log('Raw Perplexity response:', content);
        
        return content;
    } catch (error) {
        console.error('Perplexity API error:', error.message);
        return null;
    }
}

// NEW: Function to parse Perplexity response into structured events
function parseEventsFromText(text, searchLocation) {
    console.log('Parsing events from text...');
    console.log('Search location:', searchLocation);
    
    const events = [];
    
    // Split by lines and look for event patterns
    const lines = text.split('\n');
    let currentEvent = null;
    let linesSinceNewEvent = 0; // Track how many lines since we started a new event
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for event titles (usually marked with ** or - **)
        if (line.match(/^\*\*.*\*\*$/) || line.match(/^-\s*\*\*.*\*\*$/)) {
            // Save previous event if exists
            if (currentEvent && currentEvent.name) {
                // Clean up the previous event before saving
                currentEvent = cleanupEventData(currentEvent, searchLocation);
                events.push(currentEvent);
            }
            
            // Start new event
            currentEvent = {
                name: line.replace(/^\*\*|\*\*$|^-\s*\*\*|\*\*$/g, '').trim(),
                description: '',
                date: 'Date TBA',
                location: searchLocation || 'Location TBA',
                price: 'Price TBA',
                source: ''
            };
            linesSinceNewEvent = 0;
        }
        // Look for location info - but only in the first 3 lines after event title to avoid picking up location references from descriptions
        else if (line.match(/^(location:|where:|venue:)/i) && currentEvent && linesSinceNewEvent < 3) {
            const locationMatch = line.match(/^(?:location:|where:|venue:)\s*(.+)/i);
            if (locationMatch) {
                const parsedLocation = locationMatch[1].trim();
                // Only update location if it seems to be in the same city/region as search
                if (isLocationRelevant(parsedLocation, searchLocation)) {
                    currentEvent.location = parsedLocation;
                }
            }
        }
        // Look for date info - only in first few lines after title
        else if (line.match(/^(date:|when:|time:)/i) && currentEvent && linesSinceNewEvent < 4) {
            const dateMatch = line.match(/^(?:date:|when:|time:)\s*(.+)/i);
            if (dateMatch) {
                currentEvent.date = dateMatch[1].trim();
            }
        }
        // Look for price info - only in first few lines after title
        else if (line.match(/^(price:|cost:|entry:|admission:)/i) && currentEvent && linesSinceNewEvent < 4) {
            if (line.toLowerCase().includes('free')) {
                currentEvent.price = 'Free';
            } else {
                const priceMatch = line.match(/(€|£|\$|¥|₹)?\d+(?:\.\d{2})?(?:\s*-\s*(?:€|£|\$|¥|₹)?\d+(?:\.\d{2})?)?/);
                if (priceMatch) {
                    currentEvent.price = priceMatch[0];
                }
            }
        }
        // Collect description lines - but avoid lines that look like metadata
        else if (line && currentEvent && !line.match(/^-\s/) && line.length > 10 && 
                 !line.match(/^(location:|where:|venue:|date:|when:|time:|price:|cost:|entry:|admission:|source:|website:)/i)) {
            currentEvent.description += (currentEvent.description ? ' ' : '') + line;
        }
        
        if (currentEvent) {
            linesSinceNewEvent++;
        }
    }
    
    // Add the last event
    if (currentEvent && currentEvent.name) {
        currentEvent = cleanupEventData(currentEvent, searchLocation);
        events.push(currentEvent);
    }
    
    // If no structured events found, create one general event from the text
    if (events.length === 0 && text.length > 50) {
        events.push({
            name: `Events in ${searchLocation}`,
            description: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            date: 'Various dates',
            location: searchLocation || 'Various locations',
            price: 'Varies',
            source: ''
        });
    }
    
    console.log(`Parsed ${events.length} events from text`);
    return events;
}

// Helper function to check if a parsed location is relevant to the search location
function isLocationRelevant(parsedLocation, searchLocation) {
    if (!parsedLocation || !searchLocation) return false;
    
    const searchLower = searchLocation.toLowerCase();
    const parsedLower = parsedLocation.toLowerCase();
    
    // If the parsed location contains the search location, it's probably relevant
    if (parsedLower.includes(searchLower)) return true;
    
    // If the search location contains the parsed location, it's probably relevant
    if (searchLower.includes(parsedLower)) return true;
    
    // Check for common abbreviations and variations
    const commonVariations = {
        'nyc': 'new york',
        'ny': 'new york', 
        'la': 'los angeles',
        'sf': 'san francisco',
        'london': 'uk',
        'paris': 'france'
    };
    
    const searchVariation = commonVariations[searchLower];
    const parsedVariation = commonVariations[parsedLower];
    
    if (searchVariation && parsedLower.includes(searchVariation)) return true;
    if (parsedVariation && searchLower.includes(parsedVariation)) return true;
    
    // If locations seem completely different, return false to use original search location
    return false;
}

// Helper function to clean up event data
function cleanupEventData(event, searchLocation) {
    // Clean up description - remove location references that might be confusing
    if (event.description) {
        // Remove repeated location info from description if it's already in location field
        const locationWords = event.location.toLowerCase().split(/[,\s]+/);
        let cleanedDescription = event.description;
        
        // Remove sentences that just repeat the location
        cleanedDescription = cleanedDescription.replace(new RegExp(`\\b(located in|held in|taking place in)\\s+${locationWords[0]}[^.]*\\.`, 'gi'), '');
        
        event.description = cleanedDescription.trim();
    }
    
    // Ensure location is properly set
    if (!event.location || event.location === 'Location TBA') {
        event.location = searchLocation;
    }
    
    return event;
}

// Function to save search to DynamoDB
async function saveSearchToDynamoDB(searchParams, rawResults, userId) {
    const timestamp = Date.now();
    const searchDate = new Date().toISOString();
    
    // Create search summary
    const location = searchParams.location || 'Any location';
    const activityType = searchParams.activity_type || 'Any activity';
    const timeframe = searchParams.timeframe || 'Any time';
    const searchSummary = `${activityType} in ${location} - ${timeframe}`;
    
    const searchId = `search-${userId}-${timestamp}`;
    
    const item = {
        userId: userId,
        searchTimestamp: timestamp.toString(),
        searchId: searchId,
        searchDate: searchDate,
        searchSummary: searchSummary,
        searchParams: JSON.stringify(searchParams),
        searchResults: rawResults
    };

    await dynamoDB.put({
        TableName: EVENTS_TABLE,
        Item: item
    }).promise();
    
    console.log(`Search saved with ID: ${searchId}`);
    return searchId;
}

// Main Lambda handler
exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event));
    
    // Handle CORS preflight OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            body: '',
        };
    }

    try {
        // Get API keys and initialize clients
        const keys = await getApiKeys();
        clients = await initializeClients(keys);
        console.log('API Keys retrieved and clients initialized');

        const body = JSON.parse(event.body);
        console.log('Parsed search parameters:', body);

        // Extract user info from JWT token if provided
        let userId = null;
        if (event.headers.Authorization || event.headers.authorization) {
            try {
                const token = (event.headers.Authorization || event.headers.authorization).replace('Bearer ', '');
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                userId = payload.username || payload.sub;
                console.log('Extracted userId from JWT:', userId);
            } catch (jwtError) {
                console.log('JWT parsing failed, continuing without userId');
                userId = 'anonymous-user';
            }
        } else {
            userId = 'anonymous-user';
        }

        // Build search prompt for Perplexity
        const location = body.location || 'any location';
        const activityType = body.activity_type === 'Any' ? 'events' : body.activity_type;
        const timeframe = body.timeframe || 'any time';
        const keywords = body.keywords || '';
        const radius = body.radius || '';

        const searchPrompt = `Find current events in ${location}${keywords ? ` related to "${keywords}"` : ''} happening ${timeframe}${radius ? `. Within ${radius}km radius` : ''}. Please provide event names, locations, dates, times, and brief descriptions. Focus on real, current events with specific details. List 5-8 events maximum.`;

        console.log('Search prompt:', searchPrompt);

        // Step 1: Get raw events from Perplexity
        const rawPerplexityResponse = await getRawEventsFromPerplexity(clients.perplexityKey, searchPrompt);
        
        if (!rawPerplexityResponse) {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                },
                body: JSON.stringify({ 
                    events: [],
                    message: "Search service temporarily unavailable. Please try again." 
                }),
            };
        }

        // Step 2: Parse the response into structured events
        const parsedEvents = parseEventsFromText(rawPerplexityResponse, location);
        
        console.log('Final events array:', parsedEvents);

        // Step 3: Save to DynamoDB for search history
        if (userId && userId !== 'anonymous-user') {
            try {
                const searchId = await saveSearchToDynamoDB(body, rawPerplexityResponse, userId);
                console.log('✅ Search history saved successfully with ID:', searchId);
            } catch (saveError) {
                console.error('❌ Failed to save search history:', saveError);
                // Don't fail the request if history saving fails
            }
        }

        // Step 4: Return structured events to frontend
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            body: JSON.stringify({ 
                events: parsedEvents,
                searchLocation: location,
                totalEvents: parsedEvents.length
            }),
        };

    } catch (error) {
        console.error('Search error:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            body: JSON.stringify({ 
                events: [],
                message: 'Internal server error while fetching events.' 
            }),
        };
    }
};