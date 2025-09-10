// enhanced-search-processor.js - Background search processing Lambda
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

// Environment variables for API keys
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-api03-1jNl2dBq6K0qBjL8h_f_t-bOFb6N7_9VkcAfMGCWZcuCl0pIHnvCXe1tKzgktgEYmHZM1CjSPZW3ZV9F-qnLTQ-hhFfbQAA';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
        console.log('🎯 Search prompt:', searchPrompt);

        // Step 2: Call Perplexity API
        console.log('🌐 Calling Perplexity API...');
        await updateSearchStatus(requestId, 'processing', {
            currentStep: 'Scanning event databases and websites...'
        });
        
        const perplexityResponse = await callPerplexityAPI(searchPrompt);
        
        if (!perplexityResponse) {
            throw new Error('Perplexity API failed to return results');
        }
        
        console.log('✅ Perplexity data received');

        // Step 3: Process with AI
        console.log('🤖 Processing with AI...');
        await updateSearchStatus(requestId, 'processing', {
            currentStep: 'AI is curating and organizing event information...'
        });
        
        const processedEvents = await processWithAI(perplexityResponse, searchParams);
        console.log(`📊 Found ${processedEvents.length} events after AI processing`);

        // Step 4: Save to user searches table (search history)
        if (userId !== 'anonymous' && processedEvents.length > 0) {
            try {
                await saveToUserSearches(searchParams, processedEvents, perplexityResponse, userId);
                console.log('💾 Saved to user search history');
            } catch (saveError) {
                console.error('❌ Failed to save search history:', saveError);
            }
        }

        // Step 5: Update final results
        const completedAt = new Date().toISOString();
        const processingTime = Date.now() - startTime;
        
        await updateSearchStatus(requestId, 'completed', {
            results: JSON.stringify(processedEvents),
            completedAt: completedAt,
            processingTimeMs: processingTime,
            eventsFound: processedEvents.length,
            aiProvider: 'multi-ai-enhanced'
        });

        console.log(`✅ Search completed successfully in ${processingTime}ms`);
        console.log(`📊 Final results: ${processedEvents.length} events`);
        
        return {
            statusCode: 200,
            requestId: requestId,
            eventsFound: processedEvents.length,
            processingTime: processingTime
        };

    } catch (error) {
        console.error('💥 Background processing error:', error);
        
        // Update status to failed
        if (requestId) {
            try {
                await updateSearchStatus(requestId, 'failed', {
                    error: error.message,
                    completedAt: new Date().toISOString(),
                    processingTimeMs: Date.now() - startTime
                });
            } catch (updateError) {
                console.error('Failed to update error status:', updateError);
            }
        }
        
        throw error; // Re-throw for Lambda error handling
    }
};

// Update search status in DynamoDB
async function updateSearchStatus(requestId, status, additionalFields = {}) {
    const updateExpression = ['#status = :status'];
    const expressionAttributeNames = { '#status': 'status' };
    const expressionAttributeValues = { ':status': status };
    
    // Add additional fields to update
    Object.entries(additionalFields).forEach(([key, value], index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpression.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
    });
    
    const updateCommand = new UpdateCommand({
        TableName: SEARCH_REQUESTS_TABLE,
        Key: { requestId: requestId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
    });
    
    await dynamoDB.send(updateCommand);
    console.log(`📝 Updated status to: ${status}`);
}

// Build search prompt (same as before)
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

Focus on current, real, bookable events with accurate information.`;

    return prompt;
}

// Enhanced AI processing (same as before but optimized)
async function processWithAI(rawText, searchParams) {
    const aiPrompt = `Extract and structure event information from the following text into a JSON array.

Each event object must have these fields:
- "name": Event title
- "description": Brief description (1-2 sentences)  
- "date": Formatted date/time
- "location": Venue and address
- "price": Price with currency or "Free"
- "source": Website URL or empty string

Return exactly 20 events if available, fewer if less found. Return valid JSON array only.

Event data: ${rawText}`;

    // Try Claude first
    console.log('🎨 Trying Claude API...');
    let result = await callClaudeAPI(aiPrompt);
    if (result && result.length > 0) {
        console.log('✅ Claude processing successful');
        return result;
    }

    // Fallback to OpenAI
    if (OPENAI_API_KEY) {
        console.log('🔄 Fallback: OpenAI API...');
        result = await callOpenAIAPI(aiPrompt);
        if (result && result.length > 0) {
            console.log('✅ OpenAI processing successful');
            return result;
        }
    }

    // Manual parsing fallback
    console.log('⚠️ Using manual parsing...');
    return parseEventsManually(rawText);
}

// API functions (same as enhanced-search-lambda.js)
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
                max_tokens: 2000,
                temperature: 0.3
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
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 2000,
                temperature: 0.1,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            console.error('Claude API error:', response.status);
            return [];
        }

        const data = await response.json();
        const content = data.content[0]?.text || '[]';
        
        try {
            const events = JSON.parse(content.trim());
            return Array.isArray(events) ? events : [];
        } catch (parseError) {
            console.error('Claude JSON parsing error:', parseError);
            return [];
        }
    } catch (error) {
        console.error('Claude API error:', error);
        return [];
    }
}

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
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 2000,
                temperature: 0.1
            })
        });

        if (!response.ok) return [];

        const data = await response.json();
        const content = data.choices[0]?.message?.content || '[]';
        
        try {
            const events = JSON.parse(content);
            return Array.isArray(events) ? events : [];
        } catch (parseError) {
            return [];
        }
    } catch (error) {
        console.error('OpenAI API error:', error);
        return [];
    }
}

function parseEventsManually(text) {
    return [{
        name: 'Events Found - Details Processing',
        description: 'Your search found events but AI processing encountered issues. Please try again or contact support.',
        date: 'Various dates',
        location: 'Multiple locations', 
        price: 'Varies',
        source: ''
    }];
}

// Save to user searches table (search history)
async function saveToUserSearches(searchParams, events, rawResults, userId) {
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
        searchResults: rawResults.substring(0, 5000),
        eventsFound: events.length,
        processedEvents: JSON.stringify(events),
        aiProvider: 'async-multi-ai'
    };

    const putCommand = new PutCommand({
        TableName: USER_SEARCHES_TABLE,
        Item: item
    });

    await dynamoDB.send(putCommand);
    return searchId;
}