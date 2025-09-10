const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Initialize AWS services
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES({ region: 'ap-south-1' }); // Use your AWS region

// Environment variables
const USERS_TABLE = process.env.USERS_TABLE || 'EventFinderUsers';
const EMAIL_VERIFICATION_TABLE = process.env.EMAIL_VERIFICATION_TABLE || 'EventFinderEmailVerification';
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const FROM_EMAIL = process.env.FROM_EMAIL || 'takudzwasamu@gmail.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://your-domain.com';

exports.handler = async (event) => {
    console.log('Registration request received:', JSON.stringify(event));

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
        const { username, email, password } = JSON.parse(event.body);

        // Validation
        if (!username || !email || !password) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Username, email, and password are required' 
                })
            };
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Please enter a valid email address' 
                })
            };
        }

        // Password strength validation
        if (password.length < 8) {
            return {
                statusCode: 400,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Password must be at least 8 characters long' 
                })
            };
        }

        // Check if username already exists
        const usernameCheckParams = {
            TableName: USERS_TABLE,
            Key: { username: username }
        };

        const existingUser = await dynamoDB.get(usernameCheckParams).promise();
        
        if (existingUser.Item) {
            return {
                statusCode: 409,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Username already exists. Please choose a different username.' 
                })
            };
        }

        // Check if email already exists (scan operation since email is not primary key)
        const emailCheckParams = {
            TableName: USERS_TABLE,
            FilterExpression: 'email = :email',
            ExpressionAttributeValues: {
                ':email': email.toLowerCase()
            }
        };

        const emailCheck = await dynamoDB.scan(emailCheckParams).promise();
        
        if (emailCheck.Items && emailCheck.Items.length > 0) {
            return {
                statusCode: 409,
                headers: headers,
                body: JSON.stringify({ 
                    success: false,
                    message: 'Email address is already registered. Please use a different email or try logging in.' 
                })
            };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate email verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours

        // Create user record (unverified initially)
        const newUser = {
            username: username,
            email: email.toLowerCase(),
            password: hashedPassword,
            emailVerified: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Save user to database
        const userParams = {
            TableName: USERS_TABLE,
            Item: newUser
        };

        await dynamoDB.put(userParams).promise();

        // Save verification token
        const verificationParams = {
            TableName: EMAIL_VERIFICATION_TABLE,
            Item: {
                username: username,
                email: email.toLowerCase(),
                verificationToken: verificationToken,
                expiresAt: verificationExpiry,
                createdAt: new Date().toISOString()
            }
        };

        await dynamoDB.put(verificationParams).promise();

        // Send verification email
        await sendVerificationEmail(email, username, verificationToken);

        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                success: true,
                message: 'Account created successfully! Please check your email to verify your account before logging in.',
                requiresVerification: true,
                email: email
            })
        };

    } catch (error) {
        console.error('Registration error:', error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({
                success: false,
                message: 'Internal server error during registration'
            })
        };
    }
};

async function sendVerificationEmail(email, username, verificationToken) {
    const verificationLink = `${FRONTEND_URL}/verify-email.html?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    const htmlBody = createVerificationEmailHTML(username, verificationLink);
    const textBody = createVerificationEmailText(username, verificationLink);

    const emailParams = {
        Source: FROM_EMAIL,
        Destination: {
            ToAddresses: [email]
        },
        Message: {
            Subject: {
                Data: '✅ Verify Your EventFinder Account',
                Charset: 'UTF-8'
            },
            Body: {
                Html: {
                    Data: htmlBody,
                    Charset: 'UTF-8'
                },
                Text: {
                    Data: textBody,
                    Charset: 'UTF-8'
                }
            }
        }
    };

    try {
        const result = await ses.sendEmail(emailParams).promise();
        console.log('Verification email sent successfully:', result.MessageId);
        return result;
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
}

function createVerificationEmailHTML(username, verificationLink) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your EventFinder Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Roboto', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); margin-top: 40px; margin-bottom: 40px;">
        
        <!-- Header with gradient -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: white; font-size: 28px; margin: 0; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                🎉 Welcome to EventFinder!
            </h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 10px 0 0 0;">
                The Alternative Event Discovery Platform
            </p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #333; font-size: 24px; margin-bottom: 20px;">
                Hi ${username}! 👋
            </h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Thank you for joining EventFinder! We're excited to help you discover amazing events in your area.
            </p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                To complete your registration and start exploring events, please verify your email address by clicking the button below:
            </p>

            <!-- Verification Button -->
            <div style="text-align: center; margin: 35px 0;">
                <a href="${verificationLink}" 
                   style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; text-decoration: none; padding: 15px 30px; border-radius: 50px; 
                          font-weight: 600; font-size: 16px; box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                          transition: all 0.3s ease; border: none;">
                    ✅ Verify My Email Address
                </a>
            </div>

            <div style="background: #f8f9ff; border-radius: 10px; padding: 20px; margin: 30px 0; border-left: 4px solid #667eea;">
                <h3 style="color: #333; font-size: 18px; margin: 0 0 10px 0; font-weight: 600;">
                    🔒 Security Note
                </h3>
                <p style="color: #666; font-size: 14px; margin: 0; line-height: 1.5;">
                    This verification link will expire in 24 hours for your security. 
                    If you didn't create an account with EventFinder, please ignore this email.
                </p>
            </div>

            <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                Can't click the button? Copy and paste this link into your browser:<br>
                <a href="${verificationLink}" style="color: #667eea; word-break: break-all;">${verificationLink}</a>
            </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8f9ff; padding: 25px 30px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
                Thanks for choosing EventFinder - The Alternative! 🎯<br>
                Discover events that matter to you.
            </p>
        </div>
    </div>
</body>
</html>
    `;
}

function createVerificationEmailText(username, verificationLink) {
    return `
Welcome to EventFinder - The Alternative!

Hi ${username}!

Thank you for joining EventFinder! We're excited to help you discover amazing events in your area.

To complete your registration and start exploring events, please verify your email address by visiting this link:

${verificationLink}

This verification link will expire in 24 hours for your security.

If you didn't create an account with EventFinder, please ignore this email.

Thanks for choosing EventFinder - The Alternative!
Discover events that matter to you.
    `;
}