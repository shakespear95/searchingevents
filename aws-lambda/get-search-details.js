// get-search-details.js
const AWS = require('aws-sdk');

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const EVENTS_TABLE = process.env.EVENTS_TABLE || 'EventFinderUserSearches';

exports.handler = async (event) => {
    try {
        console.log('Get search details event received:', JSON.stringify(event));
        
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
        
        // Get searchId from query parameters
        const searchId = event.queryStringParameters?.searchId;
        const userId = event.queryStringParameters?.userId;
        
        if (!searchId || !userId) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                },
                body: JSON.stringify({ 
                    message: 'Both searchId and userId are required in query parameters' 
                }),
            };
        }
        
        console.log(`Fetching search details for searchId: ${searchId}, userId: ${userId}`);
        
        // Get specific search from DynamoDB
        const params = {
            TableName: EVENTS_TABLE,
            Key: {
                userId: userId,
                searchTimestamp: searchId.split('-').pop() // Extract timestamp from searchId
            }
        };
        
        const result = await dynamoDB.get(params).promise();
        
        if (!result.Item) {
            return {
                statusCode: 404,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                },
                body: JSON.stringify({ 
                    message: 'Search not found' 
                }),
            };
        }
        
        console.log(`Found search details for searchId: ${searchId}`);
        
        // Return full search details including results
        const searchDetails = {
            searchId: result.Item.searchId,
            searchDate: result.Item.searchDate,
            searchSummary: result.Item.searchSummary,
            searchParams: JSON.parse(result.Item.searchParams),
            searchResults: result.Item.searchResults // Full event results
        };
        
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            body: JSON.stringify(searchDetails),
        };
        
    } catch (error) {
        console.error('Error fetching search details:', error);
        console.error('Error details:', error.message);
        
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            },
            body: JSON.stringify({ 
                message: 'Internal server error while fetching search details' 
            }),
        };
    }
};