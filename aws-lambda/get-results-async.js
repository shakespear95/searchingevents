// get-results-async.js - Get search results Lambda
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

const SEARCH_REQUESTS_TABLE = process.env.SEARCH_REQUESTS_TABLE || 'EventFinderSearchRequests';

exports.handler = async (event) => {
    console.log('🔍 Get results request:', JSON.stringify(event));
    
    // Handle CORS preflight OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return corsResponse(200, '');
    }

    try {
        // Extract request ID from query parameters or body
        let requestId;
        
        if (event.queryStringParameters && event.queryStringParameters.requestId) {
            requestId = event.queryStringParameters.requestId;
        } else if (event.pathParameters && event.pathParameters.requestId) {
            requestId = event.pathParameters.requestId;
        } else if (event.body) {
            const body = JSON.parse(event.body);
            requestId = body.requestId;
        } else if (event.requestId) {
            // Direct invocation
            requestId = event.requestId;
        }

        if (!requestId) {
            return corsResponse(400, {
                success: false,
                message: 'Missing requestId parameter'
            });
        }

        console.log('🔖 Looking up request ID:', requestId);

        // Get search request from DynamoDB
        const getCommand = new GetCommand({
            TableName: SEARCH_REQUESTS_TABLE,
            Key: { requestId: requestId }
        });

        const result = await dynamoDB.send(getCommand);
        
        if (!result.Item) {
            return corsResponse(404, {
                success: false,
                message: 'Search request not found',
                requestId: requestId
            });
        }

        const searchRequest = result.Item;
        console.log('📋 Found search request with status:', searchRequest.status);

        // Return appropriate response based on status
        switch (searchRequest.status) {
            case 'processing':
                return corsResponse(202, {
                    success: true,
                    status: 'processing',
                    requestId: requestId,
                    message: 'Search is still processing. Please check again in a few seconds.',
                    submittedAt: searchRequest.submittedAt,
                    estimatedCompletionTime: searchRequest.estimatedCompletionTime,
                    searchSummary: searchRequest.searchSummary,
                    progressUpdate: getProgressMessage(searchRequest.timestamp),
                    nextCheckIn: 10 // seconds
                });

            case 'completed':
                // Parse the results
                let events = [];
                try {
                    if (searchRequest.results) {
                        events = JSON.parse(searchRequest.results);
                    }
                } catch (parseError) {
                    console.error('❌ Failed to parse results:', parseError);
                }

                return corsResponse(200, {
                    success: true,
                    status: 'completed',
                    requestId: requestId,
                    message: `Search completed! Found ${events.length} events.`,
                    events: events,
                    submittedAt: searchRequest.submittedAt,
                    completedAt: searchRequest.completedAt,
                    searchSummary: searchRequest.searchSummary,
                    processingTime: searchRequest.processingTimeMs ? `${(searchRequest.processingTimeMs / 1000).toFixed(1)}s` : 'N/A',
                    aiProvider: searchRequest.aiProvider || 'multi-ai'
                });

            case 'failed':
                return corsResponse(200, {
                    success: false,
                    status: 'failed',
                    requestId: requestId,
                    message: 'Search processing failed. Please try submitting a new search.',
                    error: searchRequest.error,
                    submittedAt: searchRequest.submittedAt,
                    completedAt: searchRequest.completedAt,
                    searchSummary: searchRequest.searchSummary
                });

            default:
                return corsResponse(500, {
                    success: false,
                    message: 'Unknown search status',
                    status: searchRequest.status,
                    requestId: requestId
                });
        }

    } catch (error) {
        console.error('💥 Get results error:', error);
        return corsResponse(500, {
            success: false,
            message: 'Failed to retrieve search results',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Generate progress message based on elapsed time
function getProgressMessage(startTimestamp) {
    const elapsed = Date.now() - startTimestamp;
    const seconds = Math.floor(elapsed / 1000);
    
    if (seconds < 15) {
        return "🔍 Scanning event sources and gathering data...";
    } else if (seconds < 30) {
        return "🤖 AI is processing and curating event information...";
    } else if (seconds < 60) {
        return "📊 Formatting and organizing your personalized event results...";
    } else if (seconds < 90) {
        return "🎯 Final quality checks and result optimization in progress...";
    } else {
        return "⏱️ Complex search taking longer than expected, almost complete...";
    }
}

// Helper function for CORS responses
function corsResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}