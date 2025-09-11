# Quick API Fix Guide

## Issues Found from Logs:

### 1. SerpAPI Error (401 Unauthorized)
```
SerpAPI response error: 401 Unauthorized 
{ "error": "Invalid API key. Your API key should be here: https://serpapi.com/manage-api-key" }
```
**Fix**: Update Lambda environment variable
```
SERPAPI_KEY = [your-serpapi-key-from-earlier]
```

### 2. Perplexity Model Error (400 Bad Request)
```
Invalid model 'llama-3.1-sonar-small-128k-online'. 
Permitted models can be found in the documentation at https://docs.perplexity.ai/getting-started/models.
```
**Fix**: Use correct model name in Lambda code
- Change from: `llama-3.1-sonar-small-128k-online`
- Change to: `sonar`

### 3. Claude API Error (401 Unauthorized)
```
Claude API call failed: Error: Claude API error: 401 Unauthorized
```
**Fix**: Update Lambda environment variable AND model version
```
ANTHROPIC_API_KEY = [your-valid-claude-key]
```

**Also update Claude model in Lambda code:**
- Change from: `claude-3-sonnet-20240229`
- Change to: `claude-3-5-sonnet-20240620` (stable version)

### 4. Frontend Map Error
```
ReferenceError: API_BASE_URL is not defined
```
**Fix**: Already fixed in script.js - will be included in next push

## Quick Lambda Function Fix

Update the Perplexity model call in your Lambda function:

**Find this line:**
```javascript
model: 'llama-3.1-sonar-small-128k-online',
```

**Change to:**
```javascript
model: 'sonar',
```

**For Claude model, find:**
```javascript
model: 'claude-3-sonnet-20240229',
```

**Change to:**
```javascript
model: 'claude-3-5-sonnet-20240620',
```

## Environment Variables to Set:
```
SERPAPI_KEY = [your-serpapi-key-from-earlier]
PERPLEXITY_API_KEY = [your-perplexity-key-from-earlier]  
ANTHROPIC_API_KEY = [your-claude-api-key]
SEARCH_REQUESTS_TABLE = EventFinderSearchRequests
USER_SEARCHES_TABLE = EventFinderUserSearches
```

## Expected Results After Fix:
- ✅ SerpAPI should return real Google Events
- ✅ If SerpAPI fails, Perplexity should work as fallback
- ✅ Claude should process results properly  
- ✅ Map should call backend API successfully
- ✅ Search results should appear normally

## Test After Fix:
1. Try a search from the main form
2. Try opening "Browse Events" map
3. Check CloudWatch logs for success messages instead of errors