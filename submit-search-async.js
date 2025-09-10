// submit-search-async.js - Async search submission Lambda
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);
const lambdaClient = new LambdaClient({ region: 'ap-south-1' });

const SEARCH_REQUESTS_TABLE = process.env.SEARCH_REQUESTS_TABLE || 'EventFinderSearchRequests';
const SEARCH_PROCESSOR_FUNCTION = process.env.SEARCH_PROCESSOR_FUNCTION || 'enhanced-search-lambda';

exports.handler = async (event) => {
    console.log('🚀 Async search submission received:', JSON.stringify(event));
    
    // Handle CORS preflight OPTIONS requests
    if (event.httpMethod === 'OPTIONS') {
        return corsResponse(200, '');
    }

    try {
        // Parse request body
        let body;
        if (!event.body && !event.httpMethod) {
            // Direct Lambda invocation
            body = event;
        } else if (typeof event.body === 'string') {
            body = JSON.parse(event.body);
        } else {
            body = event.body;
        }

        console.log('📝 Search parameters:', body);

        // Extract user info from JWT token
        let userId = null;
        if (event.headers && (event.headers.Authorization || event.headers.authorization)) {
            try {
                const token = (event.headers.Authorization || event.headers.authorization).replace('Bearer ', '');
                if (token && token.includes('.')) {
                    const tokenParts = token.split('.');
                    if (tokenParts.length >= 2) {
                        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
                        userId = payload.username || payload.sub;
                        console.log('👤 User identified:', userId);
                    }
                }
            } catch (jwtError) {
                console.log('⚠️ JWT parsing failed:', jwtError.message);
            }
        }

        // Generate unique request ID
        const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = Date.now();
        
        console.log('🔖 Generated request ID:', requestId);

        // Save search request to DynamoDB
        const searchRequest = {
            requestId: requestId,
            userId: userId || 'anonymous',
            searchParams: JSON.stringify(body),
            status: 'processing',
            submittedAt: new Date().toISOString(),
            timestamp: timestamp,
            estimatedCompletionTime: new Date(Date.now() + 90000).toISOString(), // 90 seconds from now
            searchSummary: `${body.activity_type || 'Any activity'} in ${body.location || 'Any location'} - ${body.timeframe || 'Any time'}`,
            email: body.email || null
        };

        const putCommand = new PutCommand({
            TableName: SEARCH_REQUESTS_TABLE,
            Item: searchRequest
        });

        await dynamoDB.send(putCommand);
        console.log('💾 Search request saved to DynamoDB');

        // Invoke the processing Lambda asynchronously (fire-and-forget)
        const invokeParams = {
            FunctionName: SEARCH_PROCESSOR_FUNCTION,
            InvocationType: 'Event', // Asynchronous invocation
            Payload: JSON.stringify({
                requestId: requestId,
                searchParams: body,
                userId: userId || 'anonymous',
                timestamp: timestamp
            })
        };

        try {
            const invokeCommand = new InvokeCommand(invokeParams);
            await lambdaClient.send(invokeCommand);
            console.log('🚀 Processing Lambda invoked successfully');
        } catch (invokeError) {
            console.error('❌ Failed to invoke processing Lambda:', invokeError);
            
            // Update status to failed
            await dynamoDB.send(new PutCommand({
                TableName: SEARCH_REQUESTS_TABLE,
                Item: {
                    ...searchRequest,
                    status: 'failed',
                    error: 'Failed to start processing',
                    completedAt: new Date().toISOString()
                }
            }));

            return corsResponse(500, {
                success: false,
                message: 'Failed to start search processing'
            });
        }

        // Return immediately with request ID
        return corsResponse(202, {
            success: true,
            requestId: requestId,
            status: 'processing',
            message: 'Search submitted successfully. Processing in background...',
            estimatedCompletionTime: searchRequest.estimatedCompletionTime,
            checkResultsUrl: `/get-results?requestId=${requestId}`,
            pollInterval: 10000 // Poll every 10 seconds
        });

    } catch (error) {
        console.error('💥 Submit search error:', error);
        return corsResponse(500, {
            success: false,
            message: 'Failed to submit search request',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper function for CORS responses
function corsResponse(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}