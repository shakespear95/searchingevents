# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a frontend-only event finder web application called "EventFinder - The Alternative". It's a static website with modern responsive design that allows users to search for events through a search form and displays results from external APIs.

## Architecture

### Technology Stack
- **Frontend**: Vanilla HTML5, CSS3, and JavaScript (ES6+)
- **Styling**: Custom CSS with CSS Grid and Flexbox layouts, CSS variables for theming
- **Fonts**: Google Fonts (Montserrat for headings, Roboto for body text)
- **Icons**: Font Awesome 6.0.0-beta3

### Key Components
- **Authentication System**: JWT-based login/signup with localStorage persistence
- **Search Modal**: Event search form with location, activity type, timeframe, and other filters
- **Event Display**: Grid-based layout for both featured events and search results
- **Mobile Navigation**: Responsive hamburger menu for mobile devices
- **Loading States**: Overlay loading indicator for API calls

### External Integrations
- **Backend API**: AWS API Gateway at `https://qk3jiyk1e8.execute-api.ap-south-1.amazonaws.com/prod`
  - `/login` - User authentication
  - `/register` - User registration  
  - `/search-events` - Event search functionality

## File Structure

```
searchingevents/
├── index.html          # Main HTML file with all page structure and modals
├── script.js           # JavaScript logic for UI interactions and API calls
└── styles.css          # Complete styling with CSS variables and responsive design
```

## Development Guidelines

### Authentication Flow
- Users must login before accessing search functionality
- JWT tokens stored in localStorage with username extraction from payload
- Auth state managed through `updateAuthUI()` function in script.js

### Event Rendering
- Use `renderEventCards()` helper function for consistent event display
- Events displayed in responsive CSS Grid layout
- Both featured events and search results use same card styling

### API Integration
- All AWS API calls include JWT token in Authorization header when user is logged in
- Event search expects JSON response with `events` array containing event objects
- Loading states managed through `showLoading()` and `hideLoading()` functions
- Error handling displays user-friendly messages in results container
- Search results rendered using `renderEventCards()` helper function

### Styling Approach
- CSS variables defined in `:root` for consistent theming
- Mobile-first responsive design with specific breakpoints at 768px and 480px
- Gradient backgrounds used throughout for modern appearance
- Event cards have hover effects and consistent styling

### Key Functions in script.js
- `handleSearchClick()`: Enforces login requirement before search
- `renderEventCards()`: Reusable function for displaying event lists  
- `loadFeaturedEvents()`: Loads static featured events on page load
- `updateAuthUI()`: Updates navigation based on authentication state
- `showLoading()`/`hideLoading()`: Manages loading overlay

## Common Tasks

Since this is a static frontend application, there are no build scripts, linting, or testing commands configured. Development involves direct file editing and browser testing.

### Running the Application
Open `index.html` in a web browser or serve through a local HTTP server.

### Making Changes
1. **UI Updates**: Modify `index.html` for structure changes
2. **Styling**: Update `styles.css` for visual changes
3. **Functionality**: Edit `script.js` for behavior changes
4. **API Integration**: Update API URLs in script.js constants

### Browser Testing
Test responsive design at different viewport sizes, particularly mobile breakpoints. Verify authentication flow and search functionality with network tab open to monitor API calls.

## Recent Development Work

### Backend Lambda Function Updates (AWS Migration)

#### What We've Done:
1. **Migrated from n8n to AWS Lambda**: Created a new backend search function that uses AWS services
2. **Implemented Dual-LLM Architecture**: 
   - **Perplexity API**: For real-time web search and current event data
   - **Claude (Anthropic)**: For processing and formatting search results into structured JSON
3. **AWS Secrets Manager Integration**: Secure API key storage and retrieval
4. **Error Handling & Validation**: Comprehensive error handling for LLM responses and JSON parsing
5. **CORS Configuration**: Proper headers for frontend-backend communication

#### Key Files Created:
- `search-events.js`: Original Lambda function implementation (incomplete)
- `search-events-fixed.txt`: Fixed version with proper AWS Secrets Manager integration

#### Architecture Flow:
1. Frontend sends search request to AWS API Gateway
2. Lambda function retrieves API keys from AWS Secrets Manager
3. Generates optimized search prompt for Perplexity
4. Calls Perplexity API for real-time event data
5. Uses Claude to process and structure the raw results into JSON format
6. Returns formatted event data to frontend

### Remaining Issues & Next Steps:

#### Backend Issues:
1. **Deploy Fixed Lambda Function**: The corrected code in `search-events-fixed.txt` needs to be deployed to AWS Lambda
2. **Test End-to-End Flow**: Verify the complete search pipeline works from frontend to backend
3. **Error Response Handling**: Ensure frontend gracefully handles various error scenarios
4. **Performance Optimization**: Monitor Lambda cold starts and response times

#### Frontend Issues:
1. **API Integration Testing**: Test with real AWS Lambda endpoint once deployed
2. **Search Result Validation**: Ensure frontend can handle the JSON response format from backend
3. **Loading State Management**: Verify loading indicators work properly during API calls
4. **Error Message Display**: Test error handling and user feedback for failed searches

#### Authentication Issues:
1. **JWT Token Integration**: Ensure search requests include proper authorization headers
2. **Session Management**: Test login/logout flow with search functionality

#### Testing & Quality Assurance:
1. **Cross-Browser Testing**: Test search functionality across different browsers
2. **Mobile Responsiveness**: Verify search modal and results display properly on mobile
3. **API Rate Limiting**: Test behavior when API rate limits are reached
4. **Network Error Handling**: Test offline/poor connectivity scenarios

### Search History Feature Implementation (Latest Update - August 2025)

#### What We've Completed:
1. **Backend Lambda Functions**: Created and deployed search history functionality
   - `get-search-history.js` → AWS Lambda function for fetching user's search history
   - `get-search-details.js` → AWS Lambda function for fetching specific search results
   - Both functions integrated with existing DynamoDB table `EventFinderUserSearches`

2. **Frontend Search History System**: Complete UI implementation
   - Added search history section with gradient-styled tabs in `index.html`
   - Implemented comprehensive CSS styling for search history tabs in `styles.css`
   - Added JavaScript functions for loading and displaying search history in `script.js`:
     - `loadSearchHistory()` - Fetches user's past searches from backend
     - `displaySearchHistoryTabs()` - Creates clickable tab elements
     - `loadSearchDetails()` - Loads specific search results when tab clicked
     - `displaySearchResults()` - Renders saved search content

3. **Authentication Integration**: Complete user session management
   - Modified `handleAuthResponse()` to set `currentUserId` and load search history on login
   - Updated logout handler to clear user data and hide search history
   - Enhanced page initialization to restore search history for logged-in users on refresh

4. **API Gateway Configuration**: Deployed search history endpoints
   - Created `/search-history` resource with GET method
   - Created `/search-details` resource with GET method  
   - Fixed API endpoint naming mismatch between frontend and AWS resources

#### Current Status:
- ✅ **Search Function**: Working - saves search data to DynamoDB table
- ✅ **Lambda Functions**: Deployed and configured in AWS
- ✅ **Frontend Integration**: Complete search history UI with authentication
- ✅ **API Endpoints**: Correctly configured as `/search-history` and `/search-details`
- 🔧 **In Testing**: End-to-end search history functionality

#### Current Issues Being Resolved:
1. **Lambda Function Activation**: Verifying API Gateway properly routes requests to Lambda functions
2. **Search History Display**: Testing that saved searches appear as tabs for logged-in users
3. **Error Handling**: Ensuring proper user feedback for API failures

#### Architecture Flow (Search History):
1. User logs in → `currentUserId` is set from JWT token
2. Frontend calls `/search-history?userId=username` → Lambda function queries DynamoDB
3. Search history displayed as clickable tabs below navigation
4. User clicks tab → Frontend calls `/search-details?searchId=xxx&userId=xxx`
5. Saved search results displayed in main results area

#### Next Steps:
1. **Verify API Gateway Integration**: Confirm Lambda functions receive requests
2. **Test Complete Flow**: Login → Search → View history tabs → Click tab → See results
3. **Production Optimization**: Remove debug console logs and optimize performance
4. **Clean Up**: Remove hardcoded API keys and restore AWS Secrets Manager integration