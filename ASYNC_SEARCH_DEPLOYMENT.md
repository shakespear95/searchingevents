# Async Search Deployment - Modified Approach

## Solution: Reuse Existing API Gateway Endpoint

Instead of creating new API Gateway endpoints, we're modifying your existing `/search-events` endpoint to work asynchronously.

## Files Created

1. **`search-events-async-modified.js`** - Modified Lambda function that handles both:
   - **POST** `/search-events` - Submit search (returns requestId immediately)
   - **GET** `/search-events?requestId=xxx` - Poll for results

2. **Frontend updated** to use same endpoint for both submit and polling

## How It Works

### 1. Search Submission (POST)
```
POST /search-events
Body: { searchParams: {...}, userId: "user123", requestId: "req-xxx" }

Response (immediate, no 504):
{
  "success": true,
  "requestId": "req-xxx",
  "status": "submitted",
  "estimatedCompletionTime": "2-3 minutes"
}
```

### 2. Results Polling (GET)
```
GET /search-events?requestId=req-xxx

Response:
{
  "success": true,
  "requestId": "req-xxx", 
  "status": "completed",
  "results": [...events...]
}
```

## Deployment Steps

### Step 1: Update Your search-events Lambda Function

1. **Go to AWS Lambda Console**
2. **Find your existing `search-events` Lambda function**
3. **Replace the code** with `search-events-async-modified.js`
4. **Set environment variables:**
   ```
   SEARCH_REQUESTS_TABLE=EventFinderSearchRequests
   SEARCH_PROCESSOR_FUNCTION=enhanced-search-processor
   ```
5. **Deploy** the function

### Step 2: Test the Modified Flow

1. **Submit a search** from frontend
2. **Should get immediate response** (no 504 timeout)
3. **Frontend automatically polls** every 10 seconds
4. **Results appear** when processing completes

## Expected Flow

```
1. User submits search
   ↓
2. POST /search-events (returns requestId immediately - no timeout!)
   ↓  
3. Background: enhanced-search-processor runs (1-3 minutes)
   ↓
4. Frontend polls: GET /search-events?requestId=xxx
   ↓
5. Results displayed when status = "completed"
```

## Benefits of This Approach

✅ **No API Gateway changes needed** - Reuses existing endpoint  
✅ **Fixes 504 timeout** - Immediate response on submit  
✅ **Backward compatible** - Existing API structure unchanged  
✅ **Quick deployment** - Just update one Lambda function  
✅ **Uses existing infrastructure** - No new resources needed  

## Troubleshooting

### If you still get 502 errors:
- Check Lambda function logs in CloudWatch
- Verify environment variables are set
- Ensure Lambda has DynamoDB permissions

### If polling fails:
- Check that `EventFinderSearchRequests` table exists
- Verify `enhanced-search-processor` Lambda function name is correct

### If background processing fails:
- Check `enhanced-search-processor` logs
- Verify it has permissions to invoke other Lambdas
- Check API keys are set correctly

## Testing Commands

```bash
# Test submit (should return requestId immediately)
curl -X POST https://your-api-url/search-events \
  -H "Content-Type: application/json" \
  -d '{"searchParams":{"location":"Berlin","activity_type":"Food"},"userId":"test"}'

# Test polling (should return status)  
curl "https://your-api-url/search-events?requestId=req-xxx"
```

## Success Indicators

✅ **POST** returns 202 status with requestId (no 504)  
✅ **GET** returns current search status  
✅ **Frontend** shows polling progress  
✅ **Results** appear after 1-3 minutes  
✅ **No timeouts** at any stage  

This approach gives you all the benefits of async search without requiring API Gateway changes!