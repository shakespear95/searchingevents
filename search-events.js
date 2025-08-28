// search-events.js
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const AWS = require('aws-sdk');

const secretsManager = new AWS.SecretsManager();
const dynamoDB = new AWS.DynamoDB.DocumentClient();
let clients; // An object to hold all initialized API clients

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
    
    /* ORIGINAL SECRETS MANAGER CODE (commented out for testing)
    const secretName = 'event-finder-llm-keys';
    try {
        console.log(`Attempting to retrieve secret: ${secretName}`);
        const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
        
        if ('SecretString' in data) {
            const secretString = data.SecretString;
            console.log('Secret string retrieved, length:', secretString.length);
            
            const parsedSecret = JSON.parse(secretString);
            console.log('Parsed secret keys:', Object.keys(parsedSecret));
            
            // Handle different possible key names
            const keys = {
                claude: parsedSecret.claude || parsedSecret.CLAUDE_API_KEY || parsedSecret.anthropic,
                perplexity: parsedSecret.perplexity || parsedSecret.PERPLEXITY_API_KEY || parsedSecret.pplx
            };
            
            console.log('Mapped API keys:', {
                claude: keys.claude ? `${keys.claude.substring(0, 10)}...` : 'MISSING',
                perplexity: keys.perplexity ? `${keys.perplexity.substring(0, 10)}...` : 'MISSING'
            });
            
            return keys;
        }
        throw new Error('SecretString not found.');
    } catch (err) {
        console.error("Failed to retrieve secret:", err);
        console.error("Error details:", err.message);
        
        // Fallback to environment variables if Secrets Manager fails
        console.log("Falling back to environment variables");
        return {
            claude: process.env.CLAUDE_API_KEY,
            perplexity: process.env.PERPLEXITY_API_KEY
        };
    }
    */
}

// Function to call a single LLM and handle its response
async function callLLM(llmClient, modelName, prompt) {
    try {
        console.log(`Making Claude API call with model: ${modelName}`);
        const startTime = Date.now();
        
        let rawResponse;
        if (llmClient instanceof Anthropic) {
            console.log('Calling Claude messages.create...');
            try {
                rawResponse = await llmClient.messages.create({
                    model: modelName,
                    max_tokens: 1500, // Reduced for faster processing
                    messages: [{ role: "user", content: prompt }],
                });
                
                const duration = Date.now() - startTime;
                console.log(`Claude API call completed in ${duration}ms`);
                console.log('Raw Claude response structure:', {
                    hasContent: !!rawResponse.content,
                    contentLength: rawResponse.content ? rawResponse.content.length : 0,
                    firstContentType: rawResponse.content && rawResponse.content[0] ? rawResponse.content[0].type : 'none'
                });
                
                // Add validation here
                if (rawResponse && rawResponse.content && rawResponse.content[0] && rawResponse.content[0].text) {
                    console.log('Successfully extracted Claude response text, length:', rawResponse.content[0].text.length);
                    return rawResponse.content[0].text;
                } else {
                    console.error('Invalid Claude response structure:', JSON.stringify(rawResponse, null, 2));
                    throw new Error('Invalid response structure from Claude');
                }
            } catch (claudeApiError) {
                console.error('Claude API error:', claudeApiError);
                throw claudeApiError;
            }
        }
    } catch (error) {
        console.error(`Error calling ${modelName}:`, error);
        throw error;
    }
}

// Function to handle Perplexity API call directly with Axios
async function getRawEventsFromPerplexity(apiKey, prompt) {
    try {
        console.log('Making Perplexity API call...');
        const startTime = Date.now();
        
        const response = await axios.post(
            'https://api.perplexity.ai/chat/completions',
            {
                model: 'sonar-pro',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1500, // Limit response size for faster processing
                temperature: 0.1   // Lower temperature for more focused results
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 25000 // 25 second timeout
            }
        );
        
        const duration = Date.now() - startTime;
        console.log(`Perplexity API call completed in ${duration}ms`);
        
        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Error calling Perplexity:', error);
        if (error.code === 'ECONNABORTED') {
            console.error('Perplexity API call timed out');
        }
        return null;
    }
}

// NEW: Function to parse Perplexity response into structured events
function parseEventsFromText(text, searchLocation) {
    console.log('Parsing events from text for location:', searchLocation);
    
    const events = [];
    
    // Split by lines and look for event patterns
    const lines = text.split('\n');
    let currentEvent = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for event titles (usually marked with ** or - **)
        if (line.match(/^\*\*.*\*\*$/) || line.match(/^-\s*\*\*.*\*\*$/)) {
            // Save previous event if exists
            if (currentEvent && currentEvent.name) {
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
        }
        // Look for location info
        else if (line.match(/location:|where:/i) && currentEvent) {
            const locationMatch = line.match(/(?:location:|where:)\s*(.+)/i);
            if (locationMatch) {
                currentEvent.location = locationMatch[1].trim();
            }
        }
        // Look for date info
        else if (line.match(/date:|when:|time:/i) && currentEvent) {
            const dateMatch = line.match(/(?:date:|when:|time:)\s*(.+)/i);
            if (dateMatch) {
                currentEvent.date = dateMatch[1].trim();
            }
        }
        // Look for price info
        else if (line.match(/price:|cost:|€|£|\$/i) && currentEvent) {
            if (line.includes('free') || line.includes('Free')) {
                currentEvent.price = 'Free';
            } else {
                const priceMatch = line.match(/(€|£|\$)?\d+(?:\.\d{2})?(?:\s*-\s*(?:€|£|\$)?\d+(?:\.\d{2})?)?/);
                if (priceMatch) {
                    currentEvent.price = priceMatch[0];
                }
            }
        }
        // Collect description lines
        else if (line && currentEvent && !line.match(/^-\s/) && line.length > 10) {
            currentEvent.description += (currentEvent.description ? ' ' : '') + line;
        }
    }
    
    // Add the last event
    if (currentEvent && currentEvent.name) {
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

// Function to save search results to DynamoDB
async function saveSearchToDynamoDB(searchParams, results, userId) {
    try {
        const timestamp = Date.now();
        const searchId = `${userId}-${timestamp}`;
        const currentDate = new Date();
        
        console.log(`Saving search to DynamoDB for authenticated user: ${userId}`);
        
        // Create search summary for frontend display
        const searchSummary = `${searchParams.location}${searchParams.keywords ? ` - ${searchParams.keywords}` : ''}${searchParams.activity_type && searchParams.activity_type !== 'Any' ? ` (${searchParams.activity_type})` : ''}`;
        
        const searchItem = {
            userId: userId, // This is the persistent user ID from login/account creation
            searchTimestamp: timestamp.toString(), // Convert to string to match DynamoDB schema
            searchId: searchId,
            searchDate: currentDate.toISOString(),
            searchSummary: searchSummary, // Human-readable summary for frontend
            searchParams: JSON.stringify({
                location: searchParams.location,
                activity_type: searchParams.activity_type,
                timeframe: searchParams.timeframe,
                radius: searchParams.radius,
                keywords: searchParams.keywords,
                email: searchParams.email
            }),
            searchResults: results, // Full Perplexity response with event details
            executionId: `lambda-${timestamp}`,
            workflowId: 'search-events-lambda',
            // Add TTL for automatic cleanup (optional - remove if you want permanent storage)
            // ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
        };
        
        await dynamoDB.put({
            TableName: EVENTS_TABLE,
            Item: searchItem
        }).promise();
        
        console.log(`Successfully saved search data with ID: ${searchId}`);
        console.log(`Search summary: ${searchSummary}`);
        return searchId;
    } catch (error) {
        console.error('Error saving search data to DynamoDB:', error);
        console.error('Error details:', error.message);
        return null;
    }
}

exports.handler = async (event) => {
    try {
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
        
        if (!clients) {
            const apiKeys = await getApiKeys();
            console.log('API Keys retrieved:', { 
                claude: apiKeys.claude ? 'PRESENT' : 'MISSING',
                perplexity: apiKeys.perplexity ? 'PRESENT' : 'MISSING'
            });
            
            if (!apiKeys.claude || !apiKeys.perplexity) {
                console.error('Missing API keys:', apiKeys);
                throw new Error('Required API keys not found in Secrets Manager');
            }
            
            clients = {
                anthropic: new Anthropic({ apiKey: apiKeys.claude }),
                perplexityKey: apiKeys.perplexity,
            };
        }

        // Handle both direct event and event.body formats
        let searchParams;
        
        console.log('Event received:', JSON.stringify(event));
        
        if (event.body) {
            if (typeof event.body === 'string') {
                try {
                    searchParams = JSON.parse(event.body);
                } catch (parseError) {
                    console.error('Failed to parse event.body:', parseError);
                    console.error('Raw event.body:', event.body);
                    return {
                        statusCode: 400,
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'POST,OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type'
                        },
                        body: JSON.stringify({ message: 'Invalid JSON in request body' }),
                    };
                }
            } else {
                searchParams = event.body;
            }
        } else {
            // Direct event format
            searchParams = event;
        }
        
        console.log('Parsed search parameters:', searchParams);
        
        const { location, keywords, timeframe, activity_type, radius, email, userId } = searchParams;
        
        // Validate required parameters
        if (!location) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({ message: 'Location parameter is required' }),
            };
        }
        
        // TEMPORARY: Force save for testing (remove when userId is properly sent from frontend)
        const testUserId = userId || 'test-user-123';
        const isAuthenticatedUser = true; // Force true for testing
        
        console.log('Search parameters validated:', { 
            location, 
            keywords, 
            timeframe, 
            activity_type, 
            radius, 
            email, 
            originalUserId: userId || 'not provided',
            testUserId: testUserId,
            isAuthenticatedUser,
            willSaveToDatabase: true
        });

        // Step 1: Create simplified Perplexity prompt for faster processing
        let perplexityPrompt = `Find current events in ${location}`;
        
        if (keywords) {
            perplexityPrompt += ` related to "${keywords}"`;
        }
        
        if (activity_type && activity_type !== 'Any') {
            perplexityPrompt += ` in the ${activity_type} category`;
        }
        
        perplexityPrompt += ` happening ${timeframe || 'today'}.`;
        
        if (radius) {
            perplexityPrompt += ` Within ${radius}km radius.`;
        }
        
        perplexityPrompt += ` Please provide event names, locations, dates, times, and brief descriptions. Focus on real, current events with specific details. List 5-8 events maximum.`;
            
        console.log('Simplified Perplexity prompt:', perplexityPrompt);
            
        // Step 2: Call Perplexity's API to get raw, unstructured search results
        const rawPerplexityResponse = await getRawEventsFromPerplexity(clients.perplexityKey, perplexityPrompt);
        
        console.log('Raw Perplexity response:', rawPerplexityResponse);
        
        if (!rawPerplexityResponse) {
             return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({ events: [], message: "Perplexity search failed. Please try again." }),
            };
        }

        // Step 3: Use Claude to process the results and format as HTML (matching n8n workflow)
        const claudeProcessingPrompt = `You are an expert event curator and data processor. Process the following event search results and return formatted HTML for display.

Search Results:
"${rawPerplexityResponse}"

Please process this data following these requirements:
1. Format the response as structured HTML with proper headings and sections
2. Group events by categories
3. Highlight the top 3 recommendations at the end
4. Use emojis for visual appeal
5. Include all event details: name, location, date/time, price, description, booking info
6. Make sure the HTML is properly formatted and styled
7. If no events are found, return a friendly "no events found" message in HTML

Return only the HTML content, no explanatory text:`;

        console.log('Claude processing prompt:', claudeProcessingPrompt);

        let htmlResponse;
        try {
            htmlResponse = await callLLM(clients.anthropic, "claude-3-sonnet-20240229", claudeProcessingPrompt);
            console.log('Claude HTML response received, length:', htmlResponse ? htmlResponse.length : 'UNDEFINED');
            console.log('Claude HTML response preview:', htmlResponse ? htmlResponse.substring(0, 200) + '...' : 'UNDEFINED');
        } catch (claudeError) {
            console.error('Claude API call failed:', claudeError);
            htmlResponse = null;
        }
        
        // Add validation before formatting
        if (!htmlResponse || htmlResponse === 'undefined' || htmlResponse.trim() === '') {
            console.error('Claude returned empty or undefined response');
            console.log('Using fallback: parsing Perplexity response into events JSON');
            
            // NEW: Parse Perplexity response into structured events
            const parsedEvents = parseEventsFromText(rawPerplexityResponse, location);
            console.log('Fallback parsed events:', parsedEvents);
            
            // Save fallback search results to DynamoDB (TESTING: always save)
            if (isAuthenticatedUser) {
                console.log(`ATTEMPTING TO SAVE fallback search for user: ${testUserId}`);
                console.log(`Table name: ${EVENTS_TABLE}`);
                try {
                    const savedSearchId = await saveSearchToDynamoDB(
                        searchParams,
                        rawPerplexityResponse, // Save the raw Perplexity response
                        testUserId
                    );
                    if (savedSearchId) {
                        console.log(`✅ SUCCESS: Fallback search saved to database with ID: ${savedSearchId}`);
                    } else {
                        console.log(`❌ FAILED: saveSearchToDynamoDB returned null`);
                    }
                } catch (saveError) {
                    console.error('❌ CRITICAL ERROR during DynamoDB save:', saveError);
                    console.error('Error name:', saveError.name);
                    console.error('Error message:', saveError.message);
                    console.error('Error stack:', saveError.stack);
                }
            } else {
                console.log('Skipping database save - user not authenticated or userId missing');
            }
            
            // Return parsed events in JSON format (not HTML)
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: JSON.stringify({ 
                    events: parsedEvents,
                    searchLocation: location,
                    totalEvents: parsedEvents.length
                }),
            };
        }
        
        // Format the HTML response with CSS styling (matching n8n workflow)
        const styledHTML = `
<div class="markdown-content">
    <style>
        .markdown-content {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
        }
        .markdown-content h1 {
            color: #667eea;
            font-size: 1.8em;
            margin: 20px 0 15px 0;
            border-bottom: 2px solid #667eea;
            padding-bottom: 8px;
        }
        .markdown-content h2 {
            color: #764ba2;
            font-size: 1.5em;
            margin: 18px 0 12px 0;
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 5px;
        }
        .markdown-content h3 {
            color: #495057;
            font-size: 1.3em;
            margin: 15px 0 10px 0;
        }
        .markdown-content h4 {
            color: #6c757d;
            font-size: 1.1em;
            margin: 12px 0 8px 0;
            font-weight: 600;
        }
        .markdown-content ul {
            margin: 10px 0;
            padding-left: 0;
            list-style: none;
        }
        .markdown-content li {
            margin: 8px 0;
            padding: 8px 12px;
            background: #f8f9fa;
            border-left: 3px solid #667eea;
            border-radius: 0 5px 5px 0;
        }
        .markdown-content strong {
            color: #495057;
            font-weight: 600;
        }
        .no-events {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }
    </style>
    ${htmlResponse}
</div>
`;

        console.log('Final HTML response prepared');

        // Save search results to DynamoDB (TESTING: always save)
        if (isAuthenticatedUser) {
            console.log(`ATTEMPTING TO SAVE successful search for user: ${testUserId}`);
            console.log(`Table name: ${EVENTS_TABLE}`);
            try {
                const savedSearchId = await saveSearchToDynamoDB(
                    searchParams,
                    rawPerplexityResponse, // Save the raw Perplexity response
                    testUserId
                );
                if (savedSearchId) {
                    console.log(`✅ SUCCESS: Search saved to database with ID: ${savedSearchId}`);
                } else {
                    console.log(`❌ FAILED: saveSearchToDynamoDB returned null`);
                }
            } catch (saveError) {
                console.error('❌ CRITICAL ERROR during DynamoDB save:', saveError);
                console.error('Error name:', saveError.name);
                console.error('Error message:', saveError.message);
                console.error('Error stack:', saveError.stack);
            }
        } else {
            console.log('Skipping database save - user not authenticated or userId missing');
        }

        // Parse HTML response into events and return JSON
        const parsedEventsFromClaude = parseEventsFromText(htmlResponse, location);
        console.log('Parsed events from Claude HTML:', parsedEventsFromClaude);
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ 
                events: parsedEventsFromClaude,
                searchLocation: location,
                totalEvents: parsedEventsFromClaude.length
            }),
        };

    } catch (error) {
        console.error('LLM search error:', error);
        let message = 'An internal server error occurred while fetching events.';
        if (error instanceof SyntaxError) {
             message = 'The LLM failed to return valid JSON. Please try again.';
        }
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: JSON.stringify({ message: message }),
        };
    }
};