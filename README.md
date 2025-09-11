# EventFinder - The Alternative

A modern event discovery web application with AI-powered search capabilities.

## 🎯 Project Overview

EventFinder is a frontend-only web application that allows users to search for events using advanced AI search capabilities. The application features user authentication, search history, and real-time event discovery through external APIs.

## 📁 Project Structure

```
searchingevents/
├── index.html              # Main application HTML
├── script.js               # Main application JavaScript
├── styles.css              # Main application styling
├── aws-lambda/             # AWS Lambda functions
│   ├── search-events-async-modified.js    # Main search endpoint (async)
│   ├── enhanced-search-processor-fixed.js # Background AI search processor
│   ├── login-lambda-fixed.js              # User authentication
│   ├── register-lambda-fixed.js           # User registration
│   ├── get-results-async.js               # Results polling
│   ├── get-search-details.js              # Search history details
│   ├── get-search-history.js              # User search history
│   └── submit-search-async.js             # Search submission
├── deployment/             # Deployment configuration
│   ├── create-dynamodb-tables.json        # DynamoDB table definitions
│   ├── create-tables.sh                   # Table creation script
│   └── lambda-package.json                # Lambda dependencies
└── docs/                   # Documentation
    ├── CLAUDE.md                          # Main project documentation
    ├── ASYNC_SEARCH_DEPLOYMENT.md         # Async search deployment guide
    ├── DYNAMODB_FIX_GUIDE.md             # DynamoDB setup guide
    └── LAMBDA_DEPLOYMENT.md               # Lambda deployment guide
```

## 🚀 Quick Start

### Frontend Development
1. Open `index.html` in a web browser or serve via local HTTP server
2. No build process required - pure HTML/CSS/JS

### AWS Lambda Deployment
1. See `docs/LAMBDA_DEPLOYMENT.md` for authentication functions
2. See `docs/ASYNC_SEARCH_DEPLOYMENT.md` for search functionality
3. See `docs/DYNAMODB_FIX_GUIDE.md` for database setup

## 🔧 Current Architecture

### Frontend
- **Technology**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Authentication**: JWT-based with localStorage persistence
- **Search**: Async pattern with real-time polling
- **UI**: Responsive design with mobile support

### Backend (AWS)
- **API Gateway**: RESTful endpoints
- **Lambda Functions**: Serverless processing
- **DynamoDB**: User data and search history storage
- **AI Integration**: Perplexity API + Claude for event search

## 📊 Key Features

- ✅ **User Authentication** - Secure JWT-based login/signup
- ✅ **AI Event Search** - Real-time event discovery using AI
- ✅ **Search History** - Save and revisit past searches
- ✅ **Mobile Responsive** - Works on all devices
- ✅ **Async Processing** - No timeouts, handles long AI operations
- ✅ **Password Security** - Strength validation and secure hashing

## 🛠 Development Status

### Recently Completed
- ✅ **Authentication Overhaul** - Enhanced JWT management, password validation
- ✅ **Async Search** - Fixed 504 timeout issues with background processing
- ✅ **Mobile Support** - Safari compatibility and touch events
- ✅ **Code Cleanup** - Organized file structure, removed duplicates

### Current Configuration
- **Main Search Endpoint**: `/search-events` (async mode)
- **Authentication**: Immediate signup/login (no email verification)
- **Database Tables**: EventFinderUsers, EventFinderSearchRequests, EventFinderUserSearches

## 📚 Documentation

All deployment guides and technical documentation are in the `docs/` directory:

- **CLAUDE.md** - Complete project documentation and development history
- **ASYNC_SEARCH_DEPLOYMENT.md** - How to deploy the async search system
- **DYNAMODB_FIX_GUIDE.md** - Database setup and troubleshooting
- **LAMBDA_DEPLOYMENT.md** - Authentication Lambda deployment guide

## 🔍 Troubleshooting

Common issues and solutions are documented in the respective guides in the `docs/` folder.

## 🤝 Contributing

This project uses Claude Code for AI-assisted development. All major changes are documented in commit messages and the main CLAUDE.md file.