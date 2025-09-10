// Enhanced search-events Lambda with multiple AI providers and improved search
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize AWS clients (v3 SDK)
const dynamoClient = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

// Environment variables for API keys (use AWS Secrets Manager in production)
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-api03-QAMgW9eDm36_w4dIEHHsafOWL4Ws7G-x9LU9dHH5f-VdVx_K_wkMXzFNHJbhkD_q5y0zlGm8k_Oqjs8HYWzIGg-iEvN0gAA';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const EVENTS_TABLE = process.env.EVENTS_TABLE || 'EventFinderUserSearches';

exports.handler = async (event) => {
    console.log('🔍 Full event received:', JSON.stringify(event, null, 2));
    console.log('🔍 Event keys:', Object.keys(event));
    console.log('🔍 Event.body exists:', !!event.body);
    console.log('🔍 Event.body value:', event.body);
    console.log('🔍 Event.body type:', typeof event.body);
    
    // Handle CORS preflight OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return corsResponse(200, '');
    }

    try {
        // Better handling for different request formats
        let body;
        
        console.log('🔍 Raw event.body:', event.body);
        console.log('🔍 Event.body type:', typeof event.body);
        
        // Check if this is a direct Lambda invocation vs API Gateway
        if (!event.body && !event.httpMethod) {
            // Direct Lambda invocation - event itself is the body
            body = event;
            console.log('🔍 Direct Lambda invocation detected, using event as body');
        } else if (!event.body) {
            console.error('❌ No request body found');
            console.error('❌ Event structure:', {
                hasBody: !!event.body,
                hasHttpMethod: !!event.httpMethod,
                hasHeaders: !!event.headers,
                keys: Object.keys(event)
            });
            return corsResponse(400, { 
                events: [], 
                message: 'Invalid request: missing body' 
            });
        } else {
            // Normal API Gateway request
            if (typeof event.body === 'string') {
                body = JSON.parse(event.body);
            } else {
                body = event.body;
            }
        }
        
        console.log('📝 Parsed search parameters:', body);
        console.log('🔍 Event.headers exists:', !!event.headers);
        console.log('🔍 Event.headers value:', event.headers);

        // Extract user info from JWT token if provided
        let userId = null;
        if (event.headers && (event.headers.Authorization || event.headers.authorization)) {
            try {
                const token = (event.headers.Authorization || event.headers.authorization).replace('Bearer ', '');
                console.log('🔍 Token received:', token ? 'Yes' : 'No');
                
                if (token && token.includes('.')) {
                    const tokenParts = token.split('.');
                    if (tokenParts.length >= 2) {
                        const payloadString = Buffer.from(tokenParts[1], 'base64').toString();
                        console.log('🔍 JWT payload string:', payloadString);
                        
                        if (payloadString && payloadString !== 'undefined') {
                            const payload = JSON.parse(payloadString);
                            userId = payload.username || payload.sub;
                            console.log('👤 User identified:', userId);
                        }
                    }
                }
            } catch (jwtError) {
                console.log('⚠️ JWT parsing failed, continuing without userId:', jwtError.message);
            }
        } else {
            console.log('⚠️ No headers found - direct Lambda invocation or missing auth headers');
        }

        // Build enhanced search prompt for better results
        const searchPrompt = buildSearchPrompt(body);
        console.log('🎯 Search prompt:', searchPrompt);

        // Step 1: Call Perplexity API for real-time event data with increased results
        console.log('🌐 Calling Perplexity API for real-time data...');
        const perplexityResponse = await callPerplexityAPI(searchPrompt);
        
        if (!perplexityResponse) {
            console.error('❌ Perplexity API failed');
            return corsResponse(200, { 
                events: [], 
                message: "Search service temporarily unavailable. Please try again." 
            });
        }

        console.log('✅ Raw Perplexity response received:', perplexityResponse.substring(0, 500) + '...');

        // Step 2: Use AI (Claude/OpenAI/Gemini) to intelligently process and format the response
        console.log('🤖 Processing results with AI...');
        const processedEvents = await processWithAI(perplexityResponse, body);
        
        console.log(`📊 Found ${processedEvents.length} events after AI processing`);

        // Step 3: Save to DynamoDB for search history (if user is logged in)
        if (userId && processedEvents.length > 0) {
            try {
                const searchId = await saveSearchToDynamoDB(body, processedEvents, perplexityResponse, userId);
                console.log('💾 Search history saved with ID:', searchId);
            } catch (saveError) {
                console.error('❌ Failed to save search history:', saveError);
                // Don't fail the request if history saving fails
            }
        }

        // Step 4: Return enhanced results to frontend
        return corsResponse(200, { 
            events: processedEvents,
            searchLocation: body.location || 'Various locations',
            totalEvents: processedEvents.length,
            searchId: userId ? `search-${Date.now()}` : null,
            message: processedEvents.length > 0 ? `Found ${processedEvents.length} events` : 'No events found for your search criteria'
        });

    } catch (error) {
        console.error('💥 Search error:', error);
        console.error('💥 Error stack:', error.stack);
        console.error('💥 Error name:', error.name);
        console.error('💥 Error message:', error.message);
        
        // Return more specific error information for debugging
        return corsResponse(500, { 
            events: [], 
            message: 'Internal server error while fetching events. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Build enhanced search prompt for better results
function buildSearchPrompt(searchParams) {
    const location = searchParams.location || 'any location';
    const activityType = searchParams.activity_type || 'any activity';
    const timeframe = searchParams.timeframe || 'any time';
    const keywords = searchParams.keywords || '';
    const radius = searchParams.radius || '';

    let prompt = `Find 20 upcoming events and activities in ${location}`;
    
    if (activityType && activityType !== 'any activity') {
        prompt += ` focused on ${activityType}`;
    }
    
    if (timeframe && timeframe !== 'any time') {
        prompt += ` happening ${timeframe}`;
    }
    
    if (keywords) {
        prompt += ` related to ${keywords}`;
    }
    
    if (radius) {
        prompt += ` within ${radius}km radius`;
    }

    prompt += `. Include:
- Event name and detailed description
- Exact date and time
- Specific venue/location address  
- Ticket prices (with currency)
- Official website or ticket booking links
- Event organizer information
- Event categories/tags

Focus on current, real, bookable events with accurate information. Include both free and paid events.`;

    return prompt;
}

// Enhanced AI processing with multiple providers and fallbacks
async function processWithAI(rawText, searchParams) {
    const aiPrompt = `You are an expert event curator. Extract and structure event information from the following text into a JSON array.

Each event object must have exactly these fields:
- "name": Event title
- "description": Detailed description (2-3 sentences)  
- "date": Formatted date/time (e.g., "March 15, 2025 at 7:00 PM")
- "location": Venue name and address
- "price": Price range with currency (e.g., "€15-25", "Free", "From $50")
- "source": Website URL if available, or empty string

Requirements:
- Return EXACTLY 20 events if available, fewer if less found
- Only include real, current, bookable events
- Ensure accurate dates, prices, and locations
- Remove any duplicate events
- Sort by date (earliest first)
- Return valid JSON array only, no other text

Raw event data:
${rawText}`;

    // Try Claude first (best for structured output)
    console.log('🎨 Trying Claude API for intelligent processing...');
    let result = await callClaudeAPI(aiPrompt);
    if (result && result.length > 0) {
        console.log('✅ Claude processing successful');
        return result;
    }

    // Fallback to OpenAI if available
    if (OPENAI_API_KEY) {
        console.log('🔄 Fallback: Trying OpenAI API...');
        result = await callOpenAIAPI(aiPrompt);
        if (result && result.length > 0) {
            console.log('✅ OpenAI processing successful');
            return result;
        }
    }

    // Fallback to Gemini if available  
    if (GEMINI_API_KEY) {
        console.log('🔄 Fallback: Trying Gemini API...');
        result = await callGeminiAPI(aiPrompt);
        if (result && result.length > 0) {
            console.log('✅ Gemini processing successful');
            return result;
        }
    }

    // Last resort: Parse manually
    console.log('⚠️ All AI providers failed, attempting manual parsing...');
    return parseEventsManually(rawText);
}

// Enhanced Perplexity API call with more specific parameters
async function callPerplexityAPI(prompt) {
    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`
            },
            body: JSON.stringify({
                model: 'sonar-pro',
                messages: [{ 
                    role: 'user', 
                    content: prompt 
                }],
                max_tokens: 2000, // Increased for more results
                temperature: 0.3, // Lower for more accurate results
                search_domain_filter: ["eventbrite.com", "meetup.com", "facebook.com", "ticketmaster.com", "stubhub.com"],
                return_citations: true,
                return_images: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Perplexity API error:', response.status, errorText);
            return null;
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || null;
    } catch (error) {
        console.error('Perplexity API network error:', error);
        return null;
    }
}

// Enhanced Claude API call  
async function callClaudeAPI(prompt) {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022', // Latest Claude model
                max_tokens: 2000,
                temperature: 0.1, // Low temperature for consistent JSON output
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API error:', response.status, errorText);
            return [];
        }

        const data = await response.json();
        const content = data.content[0]?.text || '[]';
        
        try {
            // Clean up response and parse JSON
            const cleanedContent = content.trim();
            const events = JSON.parse(cleanedContent);
            return Array.isArray(events) ? events : [];
        } catch (parseError) {
            console.error('Claude JSON parsing error:', parseError);
            return [];
        }
    } catch (error) {
        console.error('Claude API network error:', error);
        return [];
    }
}

// OpenAI API call (fallback)
async function callOpenAIAPI(prompt) {
    if (!OPENAI_API_KEY) return [];
    
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Cost-effective model
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 2000,
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            console.error('OpenAI API error:', response.status);
            return [];
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '{"events": []}';
        
        try {
            const parsed = JSON.parse(content);
            return parsed.events || parsed || [];
        } catch (parseError) {
            console.error('OpenAI JSON parsing error:', parseError);
            return [];
        }
    } catch (error) {
        console.error('OpenAI API network error:', error);
        return [];
    }
}

// Gemini API call (fallback)
async function callGeminiAPI(prompt) {
    if (!GEMINI_API_KEY) return [];
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 2000
                }
            })
        });

        if (!response.ok) {
            console.error('Gemini API error:', response.status);
            return [];
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        
        try {
            const events = JSON.parse(content.trim());
            return Array.isArray(events) ? events : [];
        } catch (parseError) {
            console.error('Gemini JSON parsing error:', parseError);
            return [];
        }
    } catch (error) {
        console.error('Gemini API network error:', error);
        return [];
    }
}

// Manual parsing as last resort
function parseEventsManually(text) {
    // Basic manual extraction logic
    const events = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    // Simple heuristic: look for event-like patterns
    for (let i = 0; i < lines.length && events.length < 5; i++) {
        const line = lines[i].trim();
        if (line.length > 20 && (line.includes('Event') || line.includes('Concert') || line.includes('Festival'))) {
            events.push({
                name: line.substring(0, 100),
                description: `Event found in ${line.includes('location') ? 'specified location' : 'search results'}`,
                date: 'Date to be confirmed',
                location: 'Location details in event description',
                price: 'Price varies',
                source: ''
            });
        }
    }
    
    return events.length > 0 ? events : [{
        name: 'No Events Found',
        description: 'We could not find specific events matching your criteria. Try adjusting your search terms or location.',
        date: 'N/A',
        location: 'N/A', 
        price: 'N/A',
        source: ''
    }];
}

// Save search to DynamoDB with enhanced data
async function saveSearchToDynamoDB(searchParams, events, rawResults, userId) {
    const timestamp = Date.now();
    const searchDate = new Date().toISOString();
    
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
        searchResults: rawResults.substring(0, 5000), // Limit size
        eventsFound: events.length,
        processedEvents: JSON.stringify(events),
        aiProvider: 'claude-enhanced' // Track which AI was used
    };

    const putCommand = new PutCommand({
        TableName: EVENTS_TABLE,
        Item: item
    });

    await dynamoDB.send(putCommand);
    console.log(`💾 Search saved with ID: ${searchId}`);
    return searchId;
}

// Helper function for CORS responses
function corsResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}