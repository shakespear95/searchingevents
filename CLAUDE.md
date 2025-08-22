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