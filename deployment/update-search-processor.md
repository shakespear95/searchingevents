# Fix Perplexity API 400 Bad Request Error

## Problem
Your search is failing with a 400 Bad Request error from Perplexity API. This typically means:
1. **Invalid API Key**: The current API key is expired or incorrect
2. **Incorrect Model**: Using wrong model name
3. **API Changes**: Perplexity may have updated their API

## Solution Steps

### Step 1: Get New Perplexity API Key
1. Go to [Perplexity API](https://www.perplexity.ai/settings/api)
2. Sign in to your account
3. Generate a new API key
4. Copy the new key (starts with `pplx-`)

### Step 2: Update Lambda Function
1. **Go to AWS Lambda Console**
2. **Find your `enhanced-search-processor` function**
3. **Update Environment Variables:**
   ```
   PERPLEXITY_API_KEY = your-new-api-key-here
   ```
4. **Upload the fixed code**: `enhanced-search-processor-fixed.js`

### Step 3: Test Different Models
If the API key doesn't fix it, try these models in the Lambda code:

**Option 1: Sonar Small (Current)**
```javascript
model: 'llama-3.1-sonar-small-128k-online'
```

**Option 2: Sonar Large**
```javascript
model: 'llama-3.1-sonar-large-128k-online'
```

**Option 3: Sonar Huge**
```javascript
model: 'llama-3.1-sonar-huge-128k-online'
```

### Step 4: Alternative Solution
If Perplexity continues to fail, you can:

1. **Use Only Claude API**: Remove Perplexity completely and use Claude to search
2. **Use Different Search API**: Switch to Google Custom Search or other APIs
3. **Use Static Event Data**: Provide curated event lists by city

## Testing Commands

```bash
# Test the search directly
curl -X POST https://qk3jiyk1e8.execute-api.ap-south-1.amazonaws.com/prod/search-events \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "test-123",
    "searchParams": {
      "location": "vaduz",
      "activity_type": "Food",
      "timeframe": "This Weekend"
    },
    "userId": "test"
  }'
```

## Expected Results
✅ **200 Success Response** with requestId  
✅ **No more 400 Bad Request errors**  
✅ **Events found and processed successfully**  
✅ **Fallback events provided if API fails**  

## Current Fix Applied
The updated Lambda function now includes:
- ✅ Better error handling for API failures
- ✅ Fallback event generation when Perplexity fails
- ✅ More detailed error logging
- ✅ Improved search prompts
- ✅ Domain filtering for better results

**Next Step**: Update your Lambda function with the new API key to resolve the 400 error.