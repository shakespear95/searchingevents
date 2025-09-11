// get-search-history.js
const AWS = require('aws-sdk');

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'EventFinderUserSearches';

exports.handler = async (event) => {
    try {
        console.log('Get search history event received:', JSON.stringify(event));
        
        // Handle CORS preflight OPTIONS requests
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                },
                body: '',
            };
        }
        
        // Get userId from query parameters
        const userId = event.queryStringParameters?.userId;
        
        if (!userId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                },
                body: JSON.stringify({ 
                    message: 'userId is required in query parameters' 
                }),
            };
        }
        
        console.log(`Fetching search history for user: ${userId}`);
        
        // Query DynamoDB for user's search history
        const params = {
            TableName: EVENTS_TABLE,
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            },
            ScanIndexForward: false, // Sort by sort key descending (most recent first)
            Limit: 10 // Limit to last 10 searches
        };
        
        const result = await dynamoDB.query(params).promise();
        
        console.log(`Found ${result.Items.length} search history items for user: ${userId}`);
        
        // Format the response for frontend consumption
        const searchHistory = result.Items.map(item => ({
            searchId: item.searchId,
            searchDate: item.searchDate,
            searchSummary: item.searchSummary,
            searchTimestamp: item.searchTimestamp,
            searchParams: JSON.parse(item.searchParams),
            // Only include a preview of search results for the list view
            hasResults: !!item.searchResults && item.searchResults.length > 0
        }));
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            body: JSON.stringify({
                searchHistory: searchHistory,
                count: searchHistory.length
            }),
        };
        
    } catch (error) {
        console.error('Error fetching search history:', error);
        console.error('Error details:', error.message);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            body: JSON.stringify({ 
                message: 'Internal server error while fetching search history' 
            }),
        };
    }
};