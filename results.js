// results.js - JavaScript for the search results page

// AWS Backend API Base URL
const AWS_API_BASE_URL = "https://qk3jiyk1e8.execute-api.ap-south-1.amazonaws.com/prod";

// Get DOM elements
const loadingOverlay = document.getElementById('loadingOverlay');
const searchTitle = document.getElementById('searchTitle');
const searchSummary = document.getElementById('searchSummary');
const searchDate = document.getElementById('searchDate');
const searchResults = document.getElementById('searchResults');
const refreshResultsBtn = document.getElementById('refreshResultsBtn');
const saveSearchBtn = document.getElementById('saveSearchBtn');
const shareResultsBtn = document.getElementById('shareResultsBtn');
const newSearchBtn = document.getElementById('newSearchBtn');

// Global variables
let currentSearchId = null;
let currentUserId = null;
let searchData = null;

// Show/hide loading overlay
function showLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoading() {
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Get URL parameters
function getUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        searchId: urlParams.get('searchId'),
        userId: urlParams.get('userId')
    };
}

// Load search results from the database
async function loadSearchResults(searchId, userId) {
    try {
        console.log(`Loading search results for searchId: ${searchId}, userId: ${userId}`);
        
        showLoading();
        
        // For now, let's simulate the API call and show a sample result
        // Later you can replace this with actual API call to your Lambda function
        
        setTimeout(() => {
            // Simulate successful data retrieval
            displaySampleResults(searchId, userId);
            hideLoading();
        }, 2000);
        
        // UNCOMMENT THIS WHEN YOUR LAMBDA FUNCTION IS READY:
        /*
        const response = await fetch(`${AWS_API_BASE_URL}/search-details?searchId=${encodeURIComponent(searchId)}&userId=${encodeURIComponent(userId)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        displaySearchResults(data);
        hideLoading();
        */
        
    } catch (error) {
        console.error('Error loading search results:', error);
        hideLoading();
        displayErrorMessage('Failed to load search results. Please try again.');
    }
}

// Display sample results (temporary function)
function displaySampleResults(searchId, userId) {
    // Update header information
    searchTitle.textContent = "🎯 Your Curated Events";
    searchSummary.textContent = "Food events in Vaduz - This Month";
    searchDate.querySelector('span').textContent = new Date().toLocaleDateString();
    
    // Sample events data
    const sampleEvents = [
        {
            name: "Vaduz Classic Food Experience",
            description: "A classical music festival featuring gourmet food stalls and local culinary experiences.",
            date: "August 28-30, 2025",
            location: "Vaduz, Liechtenstein",
            price: "€45-€85",
            source: "https://example.com/vaduz-classic"
        },
        {
            name: "Street Food Festival Walenstadt",
            description: "A vibrant street food festival offering international and local food trucks with live music.",
            date: "August 29, 2025, 5:00 PM",
            location: "Walenstadt, Switzerland (25km from Vaduz)",
            price: "Free Entry",
            source: "https://example.com/walenstadt-food"
        },
        {
            name: "Walensee Street Food Festival",
            description: "Evening of diverse street food vendors by Lake Walensee, featuring global cuisines.",
            date: "August 30, 2025, 7:00 PM",
            location: "Walenstadt, Switzerland",
            price: "Free Entry",
            source: "https://example.com/walensee-food"
        },
        {
            name: "After Work at Chapter Two Lounge",
            description: "Weekly after-work event with curated food and drink specials for socializing.",
            date: "Every Thursday in August",
            location: "Chapter Two Lounge, Vaduz",
            price: "€20-€40",
            source: "https://example.com/chapter-two"
        }
    ];
    
    // Display the events
    displayEvents(sampleEvents);
}

// Display events in the results container
function displayEvents(events) {
    if (events && events.length > 0) {
        let eventsHtml = `
            <div class="results-count">
                <h2><i class="fas fa-calendar-check"></i> Found ${events.length} Amazing Events</h2>
                <p>Curated specifically for your search criteria</p>
            </div>
            <div class="events-grid">
        `;
        
        events.forEach((event, index) => {
            eventsHtml += `
                <div class="result-event-card" data-index="${index}">
                    <div class="event-header">
                        <h3>${event.name || 'Untitled Event'}</h3>
                        <span class="event-price">${event.price || 'Price TBA'}</span>
                    </div>
                    <div class="event-details">
                        <p class="event-description">
                            <i class="fas fa-info-circle"></i>
                            ${event.description || 'No description available.'}
                        </p>
                        <div class="event-meta">
                            <p class="event-date">
                                <i class="fas fa-calendar-alt"></i>
                                <strong>When:</strong> ${event.date || 'Date TBA'}
                            </p>
                            <p class="event-location">
                                <i class="fas fa-map-marker-alt"></i>
                                <strong>Where:</strong> ${event.location || 'Location TBA'}
                            </p>
                        </div>
                    </div>
                    <div class="event-actions">
                        ${event.source ? `<a href="${event.source}" target="_blank" rel="noopener noreferrer" class="event-link-btn">
                            <i class="fas fa-external-link-alt"></i> View Details
                        </a>` : ''}
                        <button class="save-event-btn" onclick="saveEvent(${index})">
                            <i class="fas fa-bookmark"></i> Save
                        </button>
                        <button class="share-event-btn" onclick="shareEvent(${index})">
                            <i class="fas fa-share"></i> Share
                        </button>
                    </div>
                </div>
            `;
        });
        
        eventsHtml += `
            </div>
            <div class="results-summary">
                <div class="summary-stats">
                    <div class="stat">
                        <i class="fas fa-calendar"></i>
                        <span class="stat-number">${events.length}</span>
                        <span class="stat-label">Events Found</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-map-marker-alt"></i>
                        <span class="stat-number">2</span>
                        <span class="stat-label">Locations</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-clock"></i>
                        <span class="stat-number">${new Date().toLocaleDateString()}</span>
                        <span class="stat-label">Last Updated</span>
                    </div>
                </div>
            </div>
        `;
        
        searchResults.innerHTML = eventsHtml;
    } else {
        displayNoResults();
    }
}

// Display no results message
function displayNoResults() {
    searchResults.innerHTML = `
        <div class="no-results">
            <div class="no-results-icon">
                <i class="fas fa-calendar-times"></i>
            </div>
            <h3>No Events Found</h3>
            <p>We couldn't find any events matching your search criteria at this time.</p>
            <div class="no-results-actions">
                <a href="index.html" class="primary-btn">
                    <i class="fas fa-search"></i> Try New Search
                </a>
            </div>
        </div>
    `;
}

// Display error message
function displayErrorMessage(message) {
    searchResults.innerHTML = `
        <div class="error-message">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Oops! Something went wrong</h3>
            <p>${message}</p>
            <div class="error-actions">
                <button onclick="location.reload()" class="primary-btn">
                    <i class="fas fa-redo"></i> Try Again
                </button>
                <a href="index.html" class="secondary-btn">
                    <i class="fas fa-home"></i> Back to Home
                </a>
            </div>
        </div>
    `;
}

// Event action functions
function saveEvent(index) {
    alert(`Event ${index + 1} saved to your favorites!`);
}

function shareEvent(index) {
    if (navigator.share) {
        navigator.share({
            title: 'Check out this event!',
            text: 'Found this amazing event on EventFinder',
            url: window.location.href
        });
    } else {
        // Fallback: copy URL to clipboard
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Event link copied to clipboard!');
        });
    }
}

// Button event listeners
refreshResultsBtn.addEventListener('click', () => {
    if (currentSearchId && currentUserId) {
        loadSearchResults(currentSearchId, currentUserId);
    }
});

saveSearchBtn.addEventListener('click', () => {
    alert('Search saved to your history!');
});

shareResultsBtn.addEventListener('click', () => {
    if (navigator.share) {
        navigator.share({
            title: 'My Event Search Results',
            text: 'Check out these events I found on EventFinder',
            url: window.location.href
        });
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert('Results link copied to clipboard!');
        });
    }
});

newSearchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'index.html';
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    const params = getUrlParameters();
    currentSearchId = params.searchId;
    currentUserId = params.userId;
    
    console.log('Results page loaded with params:', params);
    
    if (currentSearchId && currentUserId) {
        loadSearchResults(currentSearchId, currentUserId);
    } else {
        displayErrorMessage('Invalid search parameters. Please try searching again.');
    }
});