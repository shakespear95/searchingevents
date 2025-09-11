// register-lambda-fixed.js - Fixed registration Lambda function
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize AWS clients
const dynamoClient = new DynamoDBClient({ region: 'ap-south-1' });
const dynamoDB = DynamoDBDocumentClient.from(dynamoClient);

// Environment variables
const USERS_TABLE = process.env.USERS_TABLE || 'EventFinderUsers';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

exports.handler = async (event) => {
    console.log('🎯 Register Lambda started:', JSON.stringify(event));
    
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
        const { username, email, password } = body;
        
        console.log('Registration attempt for username:', username);
        
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
        
        // Validate username format
        if (username.length < 3 || username.length > 20) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Username must be between 3 and 20 characters'
                })
            };
        }
        
        // Validate password strength
        if (password.length < 8) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: 'Password must be at least 8 characters long'
                })
            };
        }
        
        // Check if username already exists
        try {
            const existingUser = await dynamoDB.send(new GetCommand({
                TableName: USERS_TABLE,
                Key: { username }
            }));
            
            if (existingUser.Item) {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Username already exists. Please choose a different username.'
                    })
                };
            }
        } catch (error) {
            console.error('Error checking existing user:', error);
            // Continue with registration if table doesn't exist or other DB error
        }
        
        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Create user object
        const newUser = {
            username,
            email: email || null,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            emailVerified: true, // Skip email verification
            isActive: true
        };
        
        // Save user to DynamoDB
        try {
            await dynamoDB.send(new PutCommand({
                TableName: USERS_TABLE,
                Item: newUser,
                ConditionExpression: 'attribute_not_exists(username)' // Prevent overwrites
            }));
            
            console.log('User created successfully:', username);
        } catch (error) {
            if (error.name === 'ConditionalCheckFailedException') {
                return {
                    statusCode: 409,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: 'Username already exists. Please choose a different username.'
                    })
                };
            }
            throw error; // Re-throw other errors
        }
        
        // Generate JWT token for immediate login
        const tokenPayload = {
            username,
            userId: username,
            email: email || null,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };
        
        const token = jwt.sign(tokenPayload, JWT_SECRET);
        
        // Return success with token for immediate login
        return {
            statusCode: 201,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Account created successfully!',
                token,
                username,
                userId: username,
                email: email || null,
                requiresVerification: false // No verification needed
            })
        };
        
    } catch (error) {
        console.error('Registration error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Internal server error during registration. Please try again.',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            })
        };
    }
};