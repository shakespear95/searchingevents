const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Environment variables
const USERS_TABLE = process.env.USERS_TABLE || 'EventFinderUsers';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

exports.handler = async (event) => {
    console.log('Login request received:', JSON.stringify(event));

    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ message: 'CORS preflight' })
        };
    }

    try {
        const { username, password } = JSON.parse(event.body);

        // Validation
        if (!username || !password) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Username and password are required' 
                })
            };
        }

        // Get user from database
        const userParams = {
            TableName: USERS_TABLE,
            Key: { username: username }
        };

        const result = await dynamoDB.get(userParams).promise();
        
        if (!result.Item) {
            return {
                statusCode: 401,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Invalid username or password' 
                })
            };
        }

        const user = result.Item;

        // Check if email is verified
        if (!user.emailVerified) {
            return {
                statusCode: 403,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Please verify your email address before logging in. Check your inbox for a verification link.',
                    requiresVerification: true,
                    email: user.email
                })
            };
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return {
                statusCode: 401,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Invalid username or password' 
                })
            };
        }

        // Generate JWT token
        const tokenPayload = {
            username: user.username,
            email: user.email,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET);

        // Update last login timestamp
        const updateParams = {
            TableName: USERS_TABLE,
            Key: { username: username },
            UpdateExpression: 'SET lastLoginAt = :timestamp',
            ExpressionAttributeValues: {
                ':timestamp': new Date().toISOString()
            }
        };

        await dynamoDB.update(updateParams).promise();

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                success: true,
                message: 'Login successful',
                token: token,
                username: user.username,
                email: user.email
            })
        };

    } catch (error) {
        console.error('Login error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
                success: false,
                message: 'Internal server error during login'
            })
        };
    }
};