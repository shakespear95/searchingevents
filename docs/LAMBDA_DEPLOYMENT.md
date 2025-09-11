# Lambda Functions Deployment Guide

## Fixed Lambda Functions Created

1. **register-lambda-fixed.js** - Handles user registration without email verification
2. **login-lambda-fixed.js** - Handles user login with proper error handling
3. **lambda-package.json** - Dependencies needed for both functions

## Key Fixes Made

### Register Lambda:
- ✅ **Fixed 500 Error**: Removed email verification that was causing crashes
- ✅ **No Verification Required**: Returns `requiresVerification: false`
- ✅ **Immediate Login**: Returns JWT token for instant login after signup
- ✅ **Proper CORS**: Handles preflight OPTIONS requests
- ✅ **Better Error Handling**: Graceful error responses with proper status codes
- ✅ **Username Validation**: Checks for existing users and validates format
- ✅ **Password Security**: Proper bcrypt hashing with salt rounds

### Login Lambda:
- ✅ **Fixed 403 Error**: Proper CORS headers and request handling
- ✅ **Password Verification**: Secure bcrypt password comparison
- ✅ **JWT Token Generation**: Creates valid JWT tokens with proper expiration
- ✅ **User Status Checks**: Validates account is active
- ✅ **Database Error Handling**: Graceful handling of DynamoDB errors
- ✅ **No Verification Required**: Returns `requiresVerification: false`

## Deployment Steps

### Step 1: Prepare Lambda Packages

1. **Create deployment folders:**
```bash
mkdir lambda-register
mkdir lambda-login
```

2. **Copy files and install dependencies:**
```bash
# For Register Lambda
cp register-lambda-fixed.js lambda-register/index.js
cp lambda-package.json lambda-register/package.json
cd lambda-register
npm install
cd ..

# For Login Lambda  
cp login-lambda-fixed.js lambda-login/index.js
cp lambda-package.json lambda-login/package.json
cd lambda-login
npm install
cd ..
```

3. **Create ZIP files:**
```bash
cd lambda-register && zip -r ../register-lambda.zip . && cd ..
cd lambda-login && zip -r ../login-lambda.zip . && cd ..
```

### Step 2: Deploy to AWS Lambda

#### Update Register Lambda:
1. Go to AWS Lambda Console
2. Find your existing register Lambda function
3. Upload `register-lambda.zip`
4. Set handler to `index.handler`
5. Set runtime to Node.js 18.x or higher

#### Update Login Lambda:
1. Go to AWS Lambda Console  
2. Find your existing login Lambda function
3. Upload `login-lambda.zip`
4. Set handler to `index.handler`
5. Set runtime to Node.js 18.x or higher

### Step 3: Configure Environment Variables

For both Lambda functions, set these environment variables:
```
USERS_TABLE=EventFinderUsers
JWT_SECRET=your-secure-secret-key-here
NODE_ENV=production
```

### Step 4: Configure DynamoDB Table

Ensure your `EventFinderUsers` table has this structure:
```
Partition Key: username (String)
Attributes:
- username (String)
- email (String, optional) 
- password (String, hashed)
- createdAt (String, ISO timestamp)
- lastLoginAt (String, ISO timestamp)
- emailVerified (Boolean)
- isActive (Boolean)
```

### Step 5: Test the Endpoints

#### Test Registration:
```bash
curl -X POST https://your-api-gateway-url/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123","email":"test@example.com"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Account created successfully!",
  "token": "jwt-token-here",
  "username": "testuser",
  "requiresVerification": false
}
```

#### Test Login:
```bash
curl -X POST https://your-api-gateway-url/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass123"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt-token-here",
  "username": "testuser",
  "requiresVerification": false
}
```

## What These Fixes Solve

1. **500 Register Error** → Now returns success + token for immediate login
2. **403 Login Error** → Proper CORS and authentication handling
3. **Email Verification** → Completely removed, users login immediately
4. **Database Consistency** → Proper user creation and validation
5. **Security** → Proper password hashing and JWT token generation

## Testing Checklist

- [ ] Register new user → Should return 201 with token
- [ ] Login with valid credentials → Should return 200 with token
- [ ] Register duplicate username → Should return 409 error
- [ ] Login with invalid password → Should return 401 error
- [ ] Frontend signup → Should work without email verification
- [ ] Frontend login → Should work immediately after signup

## Rollback Plan

If issues occur, you can:
1. Revert to previous Lambda function versions in AWS Console
2. Check CloudWatch logs for detailed error information
3. Test endpoints individually using curl or Postman

## Next Steps After Deployment

1. Test complete signup → login flow on frontend
2. Verify no more 500/403 errors in browser console
3. Confirm users can search events after authentication
4. Monitor CloudWatch logs for any new errors