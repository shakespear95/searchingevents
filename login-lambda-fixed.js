// login-lambda-fixed.js - Fixed login Lambda function
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

// Environment variables
const USERS_TABLE = process.env.USERS_TABLE || 'EventFinderUsers';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

exports.handler = async (event) => {
    console.log('🎯 Login Lambda started:', JSON.stringify(event));
    
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
        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { username, password } = body;
        
        console.log('Login attempt for username:', username);
        
        // Validate required fields
        if (!username || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Username and password are required'
                })
            };
        }
        
        // Get user from DynamoDB
        let user;
        try {
            const result = await dynamoDB.send(new GetCommand({
                TableName: USERS_TABLE,
                Key: { username }
            }));
            
            user = result.Item;
            
            if (!user) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Invalid username or password'
                    })
                };
            }
        } catch (error) {
            console.error('Error fetching user:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Database error during login'
                })
            };
        }
        
        // Check if account is active
        if (user.isActive === false) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Account is disabled. Please contact support.'
                })
            };
        }
        
        // Verify password
        let passwordValid = false;
        try {
            passwordValid = await bcrypt.compare(password, user.password);
        } catch (error) {
            console.error('Password comparison error:', error);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Authentication error'
                })
            };
        }
        
        if (!passwordValid) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Invalid username or password'
                })
            };
        }
        
        // Generate JWT token
        const tokenPayload = {
            username: user.username,
            userId: user.username,
            email: user.email,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };
        
        const token = jwt.sign(tokenPayload, JWT_SECRET);
        
        // Update last login timestamp
        try {
            await dynamoDB.send(new UpdateCommand({
                TableName: USERS_TABLE,
                Key: { username },
                UpdateExpression: 'SET lastLoginAt = :timestamp',
                ExpressionAttributeValues: {
                    ':timestamp': new Date().toISOString()
                }
            }));
        } catch (error) {
            console.error('Error updating last login:', error);
            // Don't fail login if this update fails
        }
        
        console.log('Login successful for user:', username);
        
        // Return success with token
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Login successful',
                token,
                username: user.username,
                userId: user.username,
                email: user.email,
                requiresVerification: false // No verification required
            })
        };
        
    } catch (error) {
        console.error('Login error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Internal server error during login. Please try again.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};