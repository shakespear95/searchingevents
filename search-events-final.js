// search-events-final.js - Combined version with immediate response + search history
const AWS = require('aws-sdk');

// Initialize AWS SDK clients
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'EventFinderUserSearches';

// API keys - for production use AWS Secrets Manager
const PERPLEXITY_API_KEY = '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';
const ANTHROPIC_API_KEY = 'sk-ant-api03-QAMgW9eDm36_w4dIEHHsafOWL4Ws7G-x9LU9dHH5f-VdVx_K_wkMXzFNHJbhkD_q5y0zlGm8k_Oqjs8HYWzIGg-iEvN0gAA';

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
        const body = JSON.parse(event.body);
        console.log('Parsed request body:', body);

        // Extract user info from JWT token if provided
        let userId = null;
        if (event.headers.Authorization || event.headers.authorization) {
            try {
                const token = (event.headers.Authorization || event.headers.authorization).replace('Bearer ', '');
                const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
                userId = payload.username || payload.sub;
                console.log('Extracted userId from JWT:', userId);
            } catch (jwtError) {
                console.log('JWT parsing failed, continuing without userId:', jwtError.message);
            }
        }

        // Build search prompt
        const location = body.location || 'any location';
        const activityType = body.activity_type || 'any activity';
        const timeframe = body.timeframe || 'any time';
        const keywords = body.keywords || '';
        const radius = body.radius || '';

        const searchPrompt = `Find upcoming events in ${location} for ${activityType} activities ${timeframe}${keywords ? ` related to ${keywords}` : ''}${radius ? ` within ${radius}km` : ''}. Include event name, description, date, location, and price.`;

        console.log('Search prompt:', searchPrompt);

        // Step 1: Call Perplexity API for real-time event data
        const perplexityResponse = await callPerplexityAPI(searchPrompt);
        
        if (!perplexityResponse) {
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

        // Step 2: Use Claude to format the response into structured JSON
        const claudePrompt = `Extract event information from this text and return ONLY a valid JSON array. Each object must have: "name", "description", "date", "location", "price", "source". If no events found, return [].

Text: "${perplexityResponse}"`;

        const claudeResponse = await callClaudeAPI(claudePrompt);
        
        let events = [];
        try {
            const cleanedResponse = claudeResponse.trim();
            events = JSON.parse(cleanedResponse);
            
            if (!Array.isArray(events)) {
                console.error('Claude response not an array:', events);
                events = [];
            }
        } catch (parseError) {
            console.error('JSON parsing failed:', parseError);
            events = [];
        }

        console.log('Final events array:', events);

        // Step 3: Save to DynamoDB for search history (if user is logged in)
        if (userId && events.length > 0) {
            try {
                await saveSearchToDynamoDB(body, events, perplexityResponse, userId);
                console.log('✅ Search history saved successfully');
            } catch (saveError) {
                console.error('❌ Failed to save search history:', saveError);
                // Don't fail the request if history saving fails
            }
        }

        // Step 4: Return events immediately to frontend
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            body: JSON.stringify({ 
                events: events,
                searchId: userId ? `search-${Date.now()}` : null // Include searchId for frontend
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

// Function to call Perplexity API
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
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Perplexity API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || null;
    } catch (error) {
        console.error('Perplexity API error:', error);
        return null;
    }
}

// Function to call Claude API
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
                model: 'claude-3-sonnet-20240229',
                max_tokens: 1000,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        return data.content[0]?.text || '';
    } catch (error) {
        console.error('Claude API error:', error);
        return '[]'; // Return empty array as fallback
    }
}

// Function to save search to DynamoDB
async function saveSearchToDynamoDB(searchParams, events, rawResults, userId) {
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
        searchResults: rawResults, // Store raw Perplexity response for reference
        eventsFound: events.length,
        processedEvents: JSON.stringify(events) // Store processed events
    };

    await dynamoDB.put({
        TableName: EVENTS_TABLE,
        Item: item
    }).promise();
    
    console.log(`Search saved with ID: ${searchId}`);
    return searchId;
}