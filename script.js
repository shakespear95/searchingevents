// Get DOM elements
const searchModal = document.getElementById('searchModal');
const openSearchBtn = document.getElementById('openSearchBtn'); // Desktop navbar search button
const heroSearchBtn = document.getElementById('heroSearchBtn'); // Hero section search button
const closeModalBtn = document.getElementById('closeModalBtn');
const eventForm = document.getElementById('eventForm');
const resultsDiv = document.getElementById('results'); // Search Results Container
const featuredEventsContainer = document.getElementById('featuredEventsContainer'); // Featured Events Container

// Mobile menu elements
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');
const closeMobileMenu = document.getElementById('closeMobileMenu');
const openSearchBtnMobile = document.getElementById('openSearchBtnMobile');

// Get DOM element for loading overlay
const loadingOverlay = document.getElementById('loadingOverlay');

// NEW: Auth DOM Elements
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const authButtons = document.getElementById('authButtons');
const userDropdown = document.getElementById('userDropdown');
const usernameDisplay = document.getElementById('usernameDisplay');

const loginSignupModal = document.getElementById('loginSignupModal');
const closeLoginSignupModalBtn = document.getElementById('closeLoginSignupModalBtn');
const loginSignupTitle = document.getElementById('loginSignupTitle');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showLoginLink = document.getElementById('showLogin');
const showSignupLink = document.getElementById('showSignup');
const authMessage = document.getElementById('authMessage');

// NEW: Search History DOM Elements
const searchHistorySection = document.getElementById('searchHistorySection');
const searchHistoryTabs = document.getElementById('searchHistoryTabs');

// AWS Backend API Base URL
// This URL now points to the API Gateway with LLM integration
const AWS_API_BASE_URL = "https://qk3jiyk1e8.execute-api.ap-south-1.amazonaws.com/prod";

// Global variable to store current user ID for search history
let currentUserId = null;

// --- Helper function to render event cards (REUSABLE) ---
function renderEventCards(containerElement, eventsData, messageIfEmpty) {
    if (eventsData && eventsData.length > 0) {
        let eventsHtml = '';
        eventsData.forEach(event => {
            eventsHtml += `
                <div class="event-card">
                    <h4>${event.name || 'Untitled Event'}</h4>
                    <p><strong>Description:</strong> ${event.description || 'No description available.'}</p>
                    <p><strong>Date & Time:</strong> ${event.date || 'To be announced'}</p>
                    <p><strong>Location:</strong> ${event.location || 'Online/Various'}</p>
                    <p><strong>Price:</strong> ${event.price || 'Free / N/A'}</p>
                    ${event.source ? `<p><strong>Source:</strong> <a href="${event.source}" target="_blank" rel="noopener noreferrer">${event.source}</a></p>` : ''}
                </div>
            `;
        });
        containerElement.innerHTML = eventsHtml;
    } else {
        containerElement.innerHTML = `<p class="no-results-message">${messageIfEmpty}</p>`;
    }
}

// --- Function to load featured events on page load ---
async function loadFeaturedEvents() {
    featuredEventsContainer.innerHTML = '<p class="loading-message">Loading featured events...</p>';

    // Simulate fetching featured events - replace with actual API call or static data
    const featuredEvents = [
        {
            name: "Summer Music Festival",
            description: "A vibrant festival featuring local bands and food trucks.",
            date: "2025-08-15",
            location: "City Park, Liechtenstein",
            price: "$50",
            source: "https://example.com/festival"
        },
        {
            name: "Art Exhibition: Modern Visions",
            description: "Explore contemporary art from emerging artists.",
            date: "2025-07-25",
            location: "National Gallery, Vaduz",
            price: "Free",
            source: "https://example.com/art"
        },
        {
            name: "Tech Workshop: AI Basics",
            description: "An introductory workshop on Artificial Intelligence.",
            date: "2025-08-01",
            location: "Innovation Hub, Schaan",
            price: "$100",
            source: "https://example.com/tech"
        }
    ];

    setTimeout(() => { // Simulate network delay
        renderEventCards(featuredEventsContainer, featuredEvents, "No featured events found at this time. Try searching!");
    }, 1000);
}


// --- Event Listeners for UI interaction ---

// Function to check login status before opening search modal
function handleSearchClick() {
    if (isUserLoggedIn()) {
        searchModal.style.display = 'flex';
    } else {
        loginSignupModal.style.display = 'flex';
        loginSignupTitle.textContent = 'Login';
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        authMessage.textContent = 'Please log in to search for events.';
        authMessage.style.color = 'red';
    }
}

// Update existing listeners to use the login check
if (openSearchBtn) {
    openSearchBtn.addEventListener('click', handleSearchClick);
}

if (heroSearchBtn) {
    heroSearchBtn.addEventListener('click', handleSearchClick);
}

if (openSearchBtnMobile) {
    openSearchBtnMobile.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        handleSearchClick();
    });
}

// Close search modal
if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        searchModal.style.display = 'none';
    });
}

// Close modal if clicking outside modal content
window.addEventListener('click', (event) => {
    if (event.target === searchModal) {
        searchModal.style.display = 'none';
    }
});

// Mobile menu toggle
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        mobileMenu.classList.add('open');
    });
}

// Close mobile menu
if (closeMobileMenu) {
    closeMobileMenu.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
    });
}

// --- Helper functions for loading overlay ---
function showLoading() {
    loadingOverlay.classList.add('visible');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function hideLoading() {
    loadingOverlay.classList.remove('visible');
    document.body.style.overflow = ''; // Re-enable scrolling
}


// --- Auth Related Functions ---

function getToken() {
    return localStorage.getItem('jwtToken');
}

function setToken(token) {
    localStorage.setItem('jwtToken', token);
}

function removeToken() {
    localStorage.removeItem('jwtToken');
}

function getUsernameFromToken(token) {
    // This is a basic way to get username from JWT payload
    // In production, validate JWT signature on backend before trusting payload
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.username; // Assuming your JWT payload has a 'username' field
    } catch (e) {
        return 'User';
    }
}

function isUserLoggedIn() {
    const token = getToken();
    return !!token;
}

function updateAuthUI() {
    const token = getToken();
    if (token) {
        authButtons.style.display = 'none';
        userDropdown.style.display = 'list-item'; // or 'block' if not a list item
        usernameDisplay.textContent = getUsernameFromToken(token);
    } else {
        authButtons.style.display = 'list-item'; // or 'block'
        userDropdown.style.display = 'none';
    }
}

async function handleAuthResponse(response) {
    const data = await response.json();
    if (response.ok) {
        setToken(data.token);
        
        // Extract user ID from the response or JWT token
        if (data.username) {
            currentUserId = data.username; // Use username as user ID
        } else {
            // Fallback: extract username from JWT token
            currentUserId = getUsernameFromToken(data.token);
        }
        
        authMessage.textContent = 'Success! Logging in...';
        authMessage.style.color = 'green';
        setTimeout(() => {
            loginSignupModal.style.display = 'none';
            updateAuthUI();
            authMessage.textContent = ''; // Clear message
            
            // Load local search history after successful login
            if (currentUserId) {
                displayLocalSearchHistory();
            }
        }, 1000);
    } else {
        authMessage.textContent = data.message || 'Authentication failed.';
        authMessage.style.color = 'red';
    }
}

// --- Event Listeners for Login/Signup UI ---

loginBtn.addEventListener('click', () => {
    loginSignupModal.style.display = 'flex';
    loginSignupTitle.textContent = 'Login';
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    authMessage.textContent = '';
});

signupBtn.addEventListener('click', () => {
    loginSignupModal.style.display = 'flex';
    loginSignupTitle.textContent = 'Sign Up';
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    authMessage.textContent = '';
});

closeLoginSignupModalBtn.addEventListener('click', () => {
    loginSignupModal.style.display = 'none';
    authMessage.textContent = '';
});

showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginSignupTitle.textContent = 'Sign Up';
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    authMessage.textContent = '';
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginSignupTitle.textContent = 'Login';
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    authMessage.textContent = '';
});

logoutBtn.addEventListener('click', () => {
    removeToken();
    currentUserId = null; // Clear current user ID
    updateAuthUI();
    
    // Hide search history section on logout
    searchHistorySection.style.display = 'none';
    
    // Clear search results
    resultsDiv.innerHTML = '<p class="no-results-message">Your search results will appear here.</p>';
    
    // Optionally redirect or refresh page
    // window.location.reload();
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMessage.textContent = 'Logging in...';
    authMessage.style.color = 'white';

    const username = e.target.loginUsername.value;
    const password = e.target.loginPassword.value;

    try {
        const response = await fetch(`${AWS_API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        await handleAuthResponse(response);
    } catch (error) {
        console.error('Login error:', error);
        authMessage.textContent = 'Network error during login.';
        authMessage.style.color = 'red';
    }
});

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMessage.textContent = 'Registering...';
    authMessage.style.color = 'white';

    const username = e.target.signupUsername.value;
    const email = e.target.signupEmail.value;
    const password = e.target.signupPassword.value;
    const confirmPassword = e.target.confirmPassword.value;

    if (password !== confirmPassword) {
        authMessage.textContent = 'Passwords do not match!';
        authMessage.style.color = 'red';
        return;
    }

    try {
        const response = await fetch(`${AWS_API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        await handleAuthResponse(response); // Reuse handler for login on successful signup
    } catch (error) {
        console.error('Signup error:', error);
        authMessage.textContent = 'Network error during signup.';
        authMessage.style.color = 'red';
    }
});

// --- Search Submission Success Functions ---

function showSearchSubmissionSuccess(searchParams) {
    const location = searchParams.location || 'Any location';
    const activityType = searchParams.activity_type || 'Any activity';
    const timeframe = searchParams.timeframe || 'Any time';
    const searchSummary = `${activityType} in ${location} - ${timeframe}`;
    
    // Store search details for results page
    const searchId = `search-${currentUserId || 'guest'}-${Date.now()}`;
    const searchDetails = {
        searchId: searchId,
        searchParams: searchParams,
        searchSummary: searchSummary,
        submittedAt: new Date().toISOString(),
        userId: currentUserId
    };
    
    // Save to localStorage temporarily
    localStorage.setItem('pendingSearch', JSON.stringify(searchDetails));
    
    // Show success message with countdown and button
    resultsDiv.innerHTML = `
        <div class="search-submission-success">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h3>🎯 Search Submitted Successfully!</h3>
            <p class="search-summary"><strong>Search:</strong> ${searchSummary}</p>
            <p class="processing-message">
                <i class="fas fa-cogs"></i> 
                Our AI is searching and curating the best events for you...
            </p>
            
            <div class="countdown-container">
                <p class="countdown-text">
                    <i class="fas fa-clock"></i> 
                    Please wait <span id="countdown">60</span> seconds for processing to complete
                </p>
                <div class="countdown-progress">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
            </div>
            
            <button id="viewResultsBtn" class="view-results-btn" disabled>
                <i class="fas fa-eye"></i> View My Results
                <span class="btn-subtitle">Available after processing</span>
            </button>
            
            <p class="note">
                <i class="fas fa-info-circle"></i> 
                Your results will also be saved to your search history for future reference.
            </p>
        </div>
    `;
    
    // Start countdown
    startResultsCountdown(searchId);
}

function startResultsCountdown(searchId) {
    const countdownElement = document.getElementById('countdown');
    const progressBar = document.getElementById('progressBar');
    const viewResultsBtn = document.getElementById('viewResultsBtn');
    
    let timeLeft = 60;
    
    const countdown = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;
        
        // Update progress bar
        const progress = ((60 - timeLeft) / 60) * 100;
        progressBar.style.width = progress + '%';
        
        if (timeLeft <= 0) {
            clearInterval(countdown);
            
            // Enable the View Results button
            viewResultsBtn.disabled = false;
            viewResultsBtn.classList.add('enabled');
            viewResultsBtn.innerHTML = `
                <i class="fas fa-eye"></i> View My Results
                <span class="btn-subtitle">Ready to view!</span>
            `;
            
            // Update countdown text
            document.querySelector('.countdown-text').innerHTML = `
                <i class="fas fa-check-circle" style="color: green;"></i> 
                Processing complete! Your results are ready.
            `;
            
            // Add click handler
            viewResultsBtn.addEventListener('click', () => {
                openResultsPage(searchId);
            });
        }
    }, 1000);
}

function openResultsPage(searchId) {
    // Create URL with search parameters
    const baseUrl = window.location.origin + window.location.pathname.replace('index.html', '');
    const resultsUrl = `${baseUrl}results.html?searchId=${encodeURIComponent(searchId)}&userId=${encodeURIComponent(currentUserId || 'guest')}`;
    
    // Open in new tab
    window.open(resultsUrl, '_blank');
}

// --- Search History Functions (Local Storage Based) ---

// Function to add search to local history
function addSearchToLocalHistory(searchParams, events) {
    if (!currentUserId || !events || events.length === 0) return;
    
    const timestamp = Date.now();
    const searchDate = new Date().toISOString();
    
    // Create search summary
    const location = searchParams.location || 'Any location';
    const activityType = searchParams.activity_type || 'Any activity';
    const timeframe = searchParams.timeframe || 'Any time';
    const searchSummary = `${activityType} in ${location} - ${timeframe}`;
    
    const searchEntry = {
        searchId: `search-${currentUserId}-${timestamp}`,
        searchDate: searchDate,
        searchSummary: searchSummary,
        searchTimestamp: timestamp,
        searchParams: searchParams,
        events: events,
        eventsCount: events.length
    };
    
    // Get existing history or create new array
    const historyKey = `searchHistory_${currentUserId}`;
    let searchHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    // Add new search to beginning of array
    searchHistory.unshift(searchEntry);
    
    // Keep only last 10 searches
    if (searchHistory.length > 10) {
        searchHistory = searchHistory.slice(0, 10);
    }
    
    // Save back to localStorage
    localStorage.setItem(historyKey, JSON.stringify(searchHistory));
    
    console.log('✅ Search added to local history:', searchSummary);
}

// Function to load and display local search history
function displayLocalSearchHistory() {
    console.log('DEBUG: displayLocalSearchHistory called');
    console.log('DEBUG: currentUserId =', currentUserId);
    
    if (!currentUserId) {
        console.log('No user ID available, hiding search history');
        searchHistorySection.style.display = 'none';
        return;
    }
    
    const historyKey = `searchHistory_${currentUserId}`;
    const searchHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    console.log('DEBUG: Local search history:', searchHistory);
    
    if (searchHistory && searchHistory.length > 0) {
        console.log('DEBUG: Displaying', searchHistory.length, 'local search history items');
        displaySearchHistoryTabs(searchHistory);
        searchHistorySection.style.display = 'block';
    } else {
        console.log('DEBUG: No local search history found, showing empty message');
        displayEmptySearchHistory();
        searchHistorySection.style.display = 'block';
    }
}

// Function to display search history tabs
function displaySearchHistoryTabs(searchHistory) {
    searchHistoryTabs.innerHTML = '';
    
    searchHistory.forEach((search, index) => {
        const searchDate = new Date(search.searchDate);
        const formattedDate = searchDate.toLocaleDateString();
        const formattedTime = searchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const tabElement = document.createElement('button');
        tabElement.className = 'search-history-tab';
        tabElement.setAttribute('data-search-id', search.searchId);
        
        tabElement.innerHTML = `
            <span class="tab-summary">${search.searchSummary}</span>
            <span class="tab-date">${formattedDate} ${formattedTime}</span>
        `;
        
        // Add click handler to load search results
        tabElement.addEventListener('click', () => loadSearchDetails(search.searchId, tabElement));
        
        searchHistoryTabs.appendChild(tabElement);
    });
}

// Function to display empty search history message
function displayEmptySearchHistory() {
    searchHistoryTabs.innerHTML = `
        <div class="search-history-empty">
            <i class="fas fa-search"></i>
            <p>No search history yet. Perform your first search to see results here!</p>
        </div>
    `;
}

// Function to load and display details of a specific search (from local storage)
function loadSearchDetails(searchId, tabElement) {
    try {
        // Remove active class from all tabs
        document.querySelectorAll('.search-history-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        tabElement.classList.add('active');
        
        console.log(`Loading local search details for: ${searchId}`);
        
        // Get search from local storage
        const historyKey = `searchHistory_${currentUserId}`;
        const searchHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
        
        // Find the specific search
        const searchDetails = searchHistory.find(search => search.searchId === searchId);
        
        if (searchDetails && searchDetails.events) {
            // Display the saved search results using the existing renderEventCards function
            renderEventCards(resultsDiv, searchDetails.events, "No events found in this saved search.");
        } else {
            resultsDiv.innerHTML = '<p class="error-message">Search details not found.</p>';
        }
        
    } catch (error) {
        console.error('Error loading local search details:', error);
        resultsDiv.innerHTML = '<p class="error-message">Error loading search results. Please try again.</p>';
    }
}



// --- Form Submission Logic (Modified for loading indicator) ---

eventForm.addEventListener("submit", async function (e) {
    e.preventDefault(); // Prevent default form submission

    // Display a loading message in the results div immediately
    resultsDiv.innerHTML = '<p class="loading-message">Initiating search... Please wait.</p>';

    const data = {
        location: document.getElementById("location").value,
        activity_type: document.getElementById("activity_type").value,
        timeframe: document.getElementById("timeframe").value,
        radius: document.getElementById("radius").value,
        keywords: document.getElementById("keywords").value,
        email: document.getElementById("email").value // Get the email from the new input field
    };

    // Close the modal after submission (good UX)
    searchModal.style.display = 'none';

    // Use AWS API endpoint for event search
    const eventSearchUrl = `${AWS_API_BASE_URL}/search-events`;

    // Show loading overlay BEFORE sending the request
    showLoading();

    try {
        const headers = { "Content-Type": "application/json" };

        // NEW: Get JWT and add to headers if user is logged in
        const jwtToken = getToken();
        if (jwtToken) {
            headers["Authorization"] = `Bearer ${jwtToken}`;
        }

        const response = await fetch(eventSearchUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error sending to AWS API: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();

        // Handle the response - show success message and "View Results" button
        if (response.ok) {
            // Search was submitted successfully
            showSearchSubmissionSuccess(data);
        } else {
            resultsDiv.innerHTML = '<p class="error-message">Search submission failed. Please try again.</p>';
        }

    } catch (error) {
        console.error("Error sending data to AWS API:", error);
        resultsDiv.innerHTML = '<p class="error-error">An error occurred while fetching events. Please try again later. If the search takes a long time, results might be sent to your email.</p>';
    } finally {
        // Hide loading overlay AFTER the fetch call completes (or errors)
        hideLoading();
    }
});

// --- Initial Calls ---
// Initial message for search results div
resultsDiv.innerHTML = '<p class="no-results-message">Your search results will appear here.</p>';

// Load featured events when the page loads
loadFeaturedEvents();

// Initial UI update for auth status and search history
updateAuthUI();

// If user is already logged in (token exists), set currentUserId and load search history
console.log('DEBUG: Checking if user is logged in on page load');
console.log('DEBUG: isUserLoggedIn() =', isUserLoggedIn());

if (isUserLoggedIn()) {
    const token = getToken();
    console.log('DEBUG: Token found:', !!token);
    currentUserId = getUsernameFromToken(token);
    console.log('DEBUG: Extracted currentUserId =', currentUserId);
    
    if (currentUserId) {
        console.log('DEBUG: Loading local search history on page init');
        displayLocalSearchHistory();
    }
}