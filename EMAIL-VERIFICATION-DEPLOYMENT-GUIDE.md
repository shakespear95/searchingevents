# Email Verification Deployment Guide

This guide will help you deploy the enhanced authentication system with email verification and duplicate email checking.

## 🎯 What This Adds

### New Features:
- ✅ **Email Verification**: Users must verify their email before logging in
- ✅ **Duplicate Email Detection**: Prevents multiple accounts with same email
- ✅ **Duplicate Username Detection**: Prevents duplicate usernames
- ✅ **Beautiful Email Templates**: Professional HTML emails with EventFinder branding
- ✅ **Resend Verification**: Users can request new verification emails
- ✅ **Password Validation**: Minimum 8 characters required
- ✅ **Email Format Validation**: Proper email format checking

### Security Improvements:
- Email addresses are verified before account activation
- JWT tokens only issued for verified users
- Verification tokens expire after 24 hours
- One-time use verification tokens
- DynamoDB TTL automatically cleans expired tokens

---

## 🛠️ Deployment Steps

### Step 1: Update DynamoDB Tables

#### Option A: Using CloudFormation (Recommended)
```bash
# Deploy the DynamoDB tables using CloudFormation
aws cloudformation create-stack \
  --stack-name eventfinder-auth-tables \
  --template-body file://dynamodb-tables.json \
  --region ap-south-1
```

#### Option B: Manual Creation
1. **EventFinderUsers Table** (if not exists):
   - Primary Key: `username` (String)
   - Billing Mode: Pay per request
   - Enable Point-in-time recovery

2. **EventFinderEmailVerification Table** (New):
   - Primary Key: `username` (String)
   - Sort Key: `email` (String)
   - TTL Attribute: `expiresAt` (Number)
   - Billing Mode: Pay per request

### Step 2: Update User Table Schema

Add these fields to existing user records (or they'll be added automatically for new users):
```json
{
  "username": "string",
  "email": "string (new)",
  "password": "string (hashed)",
  "emailVerified": "boolean (new, default: false)",
  "createdAt": "string (new)",
  "updatedAt": "string (new)",
  "lastLoginAt": "string (new, optional)"
}
```

### Step 3: Deploy Lambda Functions

#### 1. Enhanced Registration Lambda
```bash
# Replace your existing registration Lambda with:
# enhanced-register-lambda.js

# Set environment variables:
USERS_TABLE=EventFinderUsers
EMAIL_VERIFICATION_TABLE=EventFinderEmailVerification
JWT_SECRET=your-secret-key
FROM_EMAIL=takudzwasamu@gmail.com
FRONTEND_URL=https://your-domain.com

# Add permissions:
# - DynamoDB: GetItem, PutItem, Scan (on both tables)
# - SES: SendEmail, SendRawEmail
```

#### 2. Enhanced Login Lambda
```bash
# Replace your existing login Lambda with:
# enhanced-login-lambda.js

# Set environment variables:
USERS_TABLE=EventFinderUsers
JWT_SECRET=your-secret-key

# Add permissions:
# - DynamoDB: GetItem, UpdateItem
```

#### 3. Email Verification Lambda (New)
```bash
# Create new Lambda function with:
# email-verification-lambda.js

# API Gateway endpoint: POST /verify-email

# Set environment variables:
USERS_TABLE=EventFinderUsers
EMAIL_VERIFICATION_TABLE=EventFinderEmailVerification

# Add permissions:
# - DynamoDB: Scan, UpdateItem, DeleteItem
```

#### 4. Resend Verification Lambda (New)
```bash
# Create new Lambda function with:
# resend-verification-lambda.js

# API Gateway endpoint: POST /resend-verification

# Set environment variables:
USERS_TABLE=EventFinderUsers
EMAIL_VERIFICATION_TABLE=EventFinderEmailVerification
FROM_EMAIL=takudzwasamu@gmail.com
FRONTEND_URL=https://your-domain.com

# Add permissions:
# - DynamoDB: Scan, PutItem, DeleteItem
# - SES: SendEmail, SendRawEmail
```

### Step 4: Update API Gateway

Add these new endpoints to your API Gateway:

1. **POST /verify-email**
   - Integration: Lambda Function → `email-verification-lambda`
   - CORS: Enable with same settings as existing endpoints

2. **POST /resend-verification**
   - Integration: Lambda Function → `resend-verification-lambda`
   - CORS: Enable with same settings as existing endpoints

### Step 5: Deploy Frontend Files

Upload these files to your hosting:
1. `verify-email.html` - Email verification page
2. Updated `script.js` - Enhanced authentication handling

### Step 6: Configure AWS SES (Already Done)

Since you already have SES configured with `takudzwasamu@gmail.com`, just verify:
- Sender email is verified in SES console
- SES is in production mode (not sandbox)
- Region matches your Lambda functions (ap-south-1)

---

## 🧪 Testing the Email Verification Flow

### Registration Flow:
1. User signs up → Account created but `emailVerified: false`
2. Verification email sent → User receives HTML email
3. User clicks link → Redirects to `verify-email.html`
4. Email verified → Account activated, user can now log in

### Login Flow:
1. Unverified user tries to log in → Login blocked
2. Error message shows with "Resend Verification" button
3. User can request new verification email
4. Once verified → Login works normally

### Testing Commands:
```bash
# Test registration
curl -X POST https://your-api-url/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Test login (should fail for unverified user)
curl -X POST https://your-api-url/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"password123"}'

# Test verification
curl -X POST https://your-api-url/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"verification-token","email":"test@example.com"}'
```

---

## 🔧 Environment Variables Summary

Set these in all Lambda functions:

### Registration & Resend Verification:
```
USERS_TABLE=EventFinderUsers
EMAIL_VERIFICATION_TABLE=EventFinderEmailVerification
JWT_SECRET=your-secret-key
FROM_EMAIL=takudzwasamu@gmail.com
FRONTEND_URL=https://your-domain.com
```

### Login & Email Verification:
```
USERS_TABLE=EventFinderUsers
EMAIL_VERIFICATION_TABLE=EventFinderEmailVerification
JWT_SECRET=your-secret-key
```

---

## 🛡️ Security Features

### Email Verification Security:
- Tokens are cryptographically random (32 bytes)
- Tokens expire after 24 hours
- One-time use (deleted after verification)
- DynamoDB TTL automatically cleans expired tokens

### Password Security:
- Minimum 8 characters required
- Passwords hashed with bcrypt (10 rounds)
- No password stored in plain text

### Email Validation:
- Format validation with regex
- Duplicate email prevention
- Case-insensitive email storage

### JWT Security:
- Only issued for verified users
- 24-hour expiration
- Contains username and email claims

---

## 🎨 Email Template Features

The verification emails include:
- EventFinder branding with gradient design
- Responsive design for mobile devices
- Security information and expiration notice
- Fallback plain text version
- Professional HTML styling

---

## 📊 Database Schema

### EventFinderUsers Table:
```
username (PK)     | String  | "john_doe"
email             | String  | "john@example.com"
password          | String  | "$2b$10$..." (bcrypt hash)
emailVerified     | Boolean | true/false
createdAt         | String  | "2025-01-15T10:30:00.000Z"
updatedAt         | String  | "2025-01-15T10:30:00.000Z"
lastLoginAt       | String  | "2025-01-15T12:00:00.000Z"
```

### EventFinderEmailVerification Table:
```
username (PK)         | String  | "john_doe"
email (SK)           | String  | "john@example.com"
verificationToken    | String  | "abc123..."
expiresAt (TTL)      | Number  | 1705316400000
createdAt            | String  | "2025-01-15T10:30:00.000Z"
```

---

## 🚨 Migration Notes

### For Existing Users:
- Old users without `emailVerified` field will need to verify their email
- Add a migration script to set `emailVerified: true` for existing trusted users
- Or send verification emails to all existing users

### Data Migration Script Example:
```javascript
// Run this once to mark existing users as verified
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();

const updateExistingUsers = async () => {
    const params = {
        TableName: 'EventFinderUsers',
        UpdateExpression: 'SET emailVerified = :verified, updatedAt = :timestamp',
        ExpressionAttributeValues: {
            ':verified': true,
            ':timestamp': new Date().toISOString()
        }
    };
    
    // Add logic to scan and update existing users
};
```

---

## ✅ Final Verification Checklist

Before going live, verify:
- [ ] DynamoDB tables created with correct schema
- [ ] All Lambda functions deployed with environment variables
- [ ] API Gateway endpoints added and CORS configured
- [ ] SES sender email verified and in production mode
- [ ] Frontend files uploaded (`verify-email.html`, updated `script.js`)
- [ ] Test complete registration → verification → login flow
- [ ] Test resend verification functionality
- [ ] Test duplicate email/username prevention
- [ ] Test password validation
- [ ] Test expired token handling

---

## 🆘 Troubleshooting

### Common Issues:

1. **Verification emails not sending**
   - Check SES configuration and sender verification
   - Verify Lambda has SES permissions
   - Check CloudWatch logs for errors

2. **Duplicate email detection not working**
   - Ensure email field exists in DynamoDB
   - Check FilterExpression in Lambda code
   - Verify scan permissions on DynamoDB

3. **Verification page not loading**
   - Check `verify-email.html` is uploaded
   - Verify FRONTEND_URL environment variable
   - Check API Gateway CORS settings

4. **Tokens expiring too quickly**
   - Check TTL configuration on DynamoDB
   - Verify `expiresAt` calculation in Lambda
   - Consider increasing expiration time (currently 24 hours)

This enhanced authentication system provides enterprise-grade security while maintaining a smooth user experience! 🎯