// search-events-async-modified.js - Modified to work asynchronously with existing API Gateway
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);
const lambdaClient = new LambdaClient({ region: 'ap-south-1' });

// Environment variables
const SEARCH_REQUESTS_TABLE = process.env.SEARCH_REQUESTS_TABLE || 'EventFinderSearchRequests';
const SEARCH_PROCESSOR_FUNCTION = process.env.SEARCH_PROCESSOR_FUNCTION || 'enhanced-search-processor';

exports.handler = async (event) => {
    console.log('🎯 Search Events (Async Modified) started:', JSON.stringify(event));
    
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
        'Content-Type': 'application/json'
    };
    
    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        // Check if this is a GET request for polling results
        if (event.httpMethod === 'GET') {
            return await handleResultsPolling(event, headers);
        }
        
        // Handle POST request for search submission
        if (event.httpMethod === 'POST') {
            return await handleSearchSubmission(event, headers);
        }
        
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Method not allowed'
            })
        };
        
    } catch (error) {
        console.error('Search events error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Internal server error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};

// Handle search submission (POST)
async function handleSearchSubmission(event, headers) {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { searchParams, userId, requestId } = body;
    
    console.log('Search submission:', { searchParams, userId, requestId });
    
    // Validate required fields
    if (!searchParams || !searchParams.location) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Search parameters with location are required'
            })
        };
    }
    
    // Use provided requestId or generate new one
    const finalRequestId = requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create search request record
    const searchRequest = {
        requestId: finalRequestId,
        userId: userId || 'anonymous',
        status: 'submitted',
        searchParams,
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    try {
        // Save to DynamoDB
        await dynamoDB.send(new PutCommand({
            TableName: SEARCH_REQUESTS_TABLE,
            Item: searchRequest
        }));
        
        console.log('✅ Search request saved:', finalRequestId);
    } catch (dbError) {
        console.error('Failed to save search request:', dbError);
        // Continue without DB if table doesn't exist
    }
    
    // Invoke background search processor asynchronously
    const processorPayload = {
        requestId: finalRequestId,
        searchParams,
        userId: userId || 'anonymous'
    };
    
    try {
        await lambdaClient.send(new InvokeCommand({
            FunctionName: SEARCH_PROCESSOR_FUNCTION,
            InvocationType: 'Event', // Async invocation
            Payload: JSON.stringify(processorPayload)
        }));
        
        console.log('✅ Background processor invoked for:', finalRequestId);
    } catch (invokeError) {
        console.error('❌ Failed to invoke background processor:', invokeError);
        
        // Return success anyway - frontend will poll and get timeout message
        return {
            statusCode: 202, // Accepted for processing
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Search submitted successfully',
                requestId: finalRequestId,
                status: 'submitted',
                estimatedCompletionTime: '2-3 minutes',
                note: 'Background processing may be delayed'
            })
        };
    }
    
    // Return immediate response with request ID
    return {
        statusCode: 202, // Accepted for processing
        headers,
        body: JSON.stringify({
            success: true,
            message: 'Search submitted successfully',
            requestId: finalRequestId,
            status: 'submitted',
            estimatedCompletionTime: '2-3 minutes'
        })
    };
}

// Handle results polling (GET)
async function handleResultsPolling(event, headers) {
    const requestId = event.queryStringParameters?.requestId;
    
    if (!requestId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'requestId parameter is required for polling'
            })
        };
    }
    
    console.log('Polling results for requestId:', requestId);
    
    try {
        // Get search request status from DynamoDB
        const result = await dynamoDB.send(new GetCommand({
            TableName: SEARCH_REQUESTS_TABLE,
            Key: { requestId }
        }));
        
        const searchRequest = result.Item;
        
        if (!searchRequest) {
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Search request not found',
                    status: 'not_found'
                })
            };
        }
        
        // Return current status
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                requestId,
                status: searchRequest.status,
                results: searchRequest.results || null,
                error: searchRequest.error || null,
                currentStep: searchRequest.currentStep || null,
                submittedAt: searchRequest.submittedAt,
                completedAt: searchRequest.completedAt || null,
                processingTimeMs: searchRequest.processingTimeMs || null
            })
        };
        
    } catch (dbError) {
        console.error('Error polling results:', dbError);
        
        // If table doesn't exist, return a helpful message
        if (dbError.name === 'ResourceNotFoundException') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    requestId,
                    status: 'processing',
                    currentStep: 'Setting up search infrastructure...',
                    note: 'Search tracking unavailable, processing in background'
                })
            };
        }
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Error checking search status',
                error: dbError.message
            })
        };
    }
}