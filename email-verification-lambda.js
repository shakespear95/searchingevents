const AWS = require('aws-sdk');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Environment variables
const USERS_TABLE = process.env.USERS_TABLE || 'EventFinderUsers';
const EMAIL_VERIFICATION_TABLE = process.env.EMAIL_VERIFICATION_TABLE || 'EventFinderEmailVerification';

exports.handler = async (event) => {
    console.log('Email verification request received:', JSON.stringify(event));

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
        const { token, email } = JSON.parse(event.body);

        // Validation
        if (!token || !email) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Verification token and email are required' 
                })
            };
        }

        // Get verification record
        const verificationParams = {
            TableName: EMAIL_VERIFICATION_TABLE,
            FilterExpression: 'verificationToken = :token AND email = :email',
            ExpressionAttributeValues: {
                ':token': token,
                ':email': email.toLowerCase()
            }
        };

        const verificationResult = await dynamoDB.scan(verificationParams).promise();
        
        if (!verificationResult.Items || verificationResult.Items.length === 0) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Invalid or expired verification token. Please request a new verification email.' 
                })
            };
        }

        const verificationRecord = verificationResult.Items[0];
        
        // Check if token has expired
        if (Date.now() > verificationRecord.expiresAt) {
            // Clean up expired token
            await dynamoDB.delete({
                TableName: EMAIL_VERIFICATION_TABLE,
                Key: { 
                    username: verificationRecord.username,
                    email: verificationRecord.email 
                }
            }).promise();
            
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Verification token has expired. Please request a new verification email.',
                    expired: true
                })
            };
        }

        // Update user record to mark email as verified
        const updateUserParams = {
            TableName: USERS_TABLE,
            Key: { username: verificationRecord.username },
            UpdateExpression: 'SET emailVerified = :verified, updatedAt = :timestamp',
            ExpressionAttributeValues: {
                ':verified': true,
                ':timestamp': new Date().toISOString()
            }
        };

        await dynamoDB.update(updateUserParams).promise();

        // Delete the verification token (one-time use)
        const deleteParams = {
            TableName: EMAIL_VERIFICATION_TABLE,
            Key: { 
                username: verificationRecord.username,
                email: verificationRecord.email 
            }
        };

        await dynamoDB.delete(deleteParams).promise();

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                success: true,
                message: 'Email verified successfully! You can now log in to your account.',
                username: verificationRecord.username
            })
        };

    } catch (error) {
        console.error('Email verification error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
                success: false,
                message: 'Internal server error during email verification'
            })
        };
    }
};