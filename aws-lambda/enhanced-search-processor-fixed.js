// enhanced-search-processor-fixed.js - Background search processing Lambda with error handling
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

// Environment variables for API keys
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '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';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'sk-ant-api03-1jNl2dBq6K0qBjL8h_f_t-bOFb6N7_9VkcAfMGCWZcuCl0pIHnvCXe1tKzgktgEYmHZM1CjSPZW3ZV9F-qnLTQ-hhFfbQAA';

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

        const perplexityResponse = await callPerplexityAPI(searchPrompt);
        
        if (!perplexityResponse || !perplexityResponse.choices?.[0]?.message?.content) {
            throw new Error('No data received from Perplexity API');
        }

        console.log('✅ Perplexity API response received');

        // Step 3: Process and structure results with Claude
        console.log('🤖 Processing results with Claude AI...');
        await updateSearchStatus(requestId, 'processing', {
            currentStep: 'Processing and formatting event data...'
        });

        const structuredEvents = await processWithClaude(perplexityResponse.choices[0].message.content, searchParams);
        
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
    
    let prompt = `Find current events in ${location}`;
    
    if (activity_type && activity_type !== 'Any') {
        prompt += ` related to ${activity_type}`;
    }
    
    if (timeframe && timeframe !== 'Anytime') {
        prompt += ` happening ${timeframe.toLowerCase()}`;
    }
    
    if (keywords) {
        prompt += ` with keywords: ${keywords}`;
    }
    
    prompt += `. Include event names, dates, times, locations, descriptions, prices, and website links. Focus on verified, official events with complete details.`;
    
    return prompt;
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
                        content: 'You are an expert event researcher. Find real, current events with complete details including dates, locations, prices, and official websites.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 4000,
                temperature: 0.1,
                return_citations: true
            })
        });

        if (!response.ok) {
            throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
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