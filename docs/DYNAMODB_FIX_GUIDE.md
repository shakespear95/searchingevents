# DynamoDB Tables Fix Guide

## Problem Identified

The search processor Lambda is failing with:
```
ResourceNotFoundException: Requested resource not found
```

This means the required DynamoDB tables don't exist in your AWS account.

## Required Tables

Your EventFinder application needs these 3 DynamoDB tables:

1. **`EventFinderSearchRequests`** - Tracks async search processing status
2. **`EventFinderUserSearches`** - Stores completed search results for history
3. **`EventFinderUsers`** - Stores user authentication data

## Quick Fix Options

### Option A: Create Tables via AWS Console (Recommended)

1. **Go to AWS DynamoDB Console**
2. **Create each table manually:**

#### Table 1: EventFinderSearchRequests
- **Table name**: `EventFinderSearchRequests`
- **Partition key**: `requestId` (String)
- **Settings**: Use default settings (Pay-per-request)

#### Table 2: EventFinderUserSearches  
- **Table name**: `EventFinderUserSearches`
- **Partition key**: `searchId` (String)
- **Global Secondary Index**: 
  - **Index name**: `UserIdIndex`
  - **Partition key**: `userId` (String)
- **Settings**: Use default settings (Pay-per-request)

#### Table 3: EventFinderUsers
- **Table name**: `EventFinderUsers`  
- **Partition key**: `username` (String)
- **Settings**: Use default settings (Pay-per-request)

### Option B: Create Tables via AWS CLI

1. **Run the creation script:**
```bash
chmod +x create-tables.sh
./create-tables.sh
```

2. **Or run individual commands:**
```bash
# EventFinderSearchRequests
aws dynamodb create-table \
    --table-name EventFinderSearchRequests \
    --attribute-definitions AttributeName=requestId,AttributeType=S \
    --key-schema AttributeName=requestId,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region ap-south-1

# EventFinderUserSearches
aws dynamodb create-table \
    --table-name EventFinderUserSearches \
    --attribute-definitions AttributeName=searchId,AttributeType=S AttributeName=userId,AttributeType=S \
    --key-schema AttributeName=searchId,KeyType=HASH \
    --global-secondary-indexes IndexName=UserIdIndex,KeySchema=[{AttributeName=userId,KeyType=HASH}],Projection={ProjectionType=ALL} \
    --billing-mode PAY_PER_REQUEST \
    --region ap-south-1

# EventFinderUsers
aws dynamodb create-table \
    --table-name EventFinderUsers \
    --attribute-definitions AttributeName=username,AttributeType=S \
    --key-schema AttributeName=username,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region ap-south-1
```

### Option C: Update Lambda with Better Error Handling

If you can't create tables immediately, update your search processor Lambda with the fixed version that handles missing tables gracefully:

1. **Replace your current search processor with**: `enhanced-search-processor-fixed.js`
2. **This version will:**
   - Continue processing even if tables are missing
   - Log warnings instead of crashing
   - Provide fallback behavior for missing resources

## Verification Steps

1. **Check tables exist:**
```bash
aws dynamodb list-tables --region ap-south-1
```

2. **Verify table status:**
```bash
aws dynamodb describe-table --table-name EventFinderSearchRequests --region ap-south-1
```

3. **Test search functionality:**
   - Try a search from your frontend
   - Check CloudWatch logs for the search processor
   - Should see successful processing instead of ResourceNotFoundException

## What These Tables Do

### EventFinderSearchRequests
- Stores the status of async search requests
- Allows frontend to poll for completion
- Tracks: `requestId`, `status`, `searchParams`, `results`, `error`

### EventFinderUserSearches
- Stores completed search results for search history feature
- Allows users to view past searches
- Tracks: `searchId`, `userId`, `searchCriteria`, `events`, `searchTimestamp`

### EventFinderUsers
- Stores user authentication data
- Required for login/signup functionality
- Tracks: `username`, `email`, `password`, `createdAt`, `isActive`

## Expected Results After Fix

✅ **Search processor will run successfully**  
✅ **No more ResourceNotFoundException errors**  
✅ **Search functionality will work end-to-end**  
✅ **Search history will be saved**  
✅ **User authentication will work**  

## Monitor Success

Check CloudWatch logs for your search processor Lambda. You should see:
- ✅ `Processing request: req-xxxxx`
- ✅ `Perplexity API response received`
- ✅ `Claude processing completed`
- ✅ `Search processing completed successfully`

Instead of:
- ❌ `ResourceNotFoundException: Requested resource not found`