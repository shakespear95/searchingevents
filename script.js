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
            
            // Load search history after successful login
            if (currentUserId) {
                loadSearchHistory();
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

// --- Search History Functions ---

// Function to load and display search history for logged-in user
async function loadSearchHistory() {
    console.log('DEBUG: loadSearchHistory called');
    console.log('DEBUG: currentUserId =', currentUserId);
    
    if (!currentUserId) {
        console.log('No user ID available, hiding search history');
        searchHistorySection.style.display = 'none';
        return;
    }

    try {
        console.log(`Loading search history for user: ${currentUserId}`);
        const searchHistoryUrl = `${AWS_API_BASE_URL}/search-history?userId=${encodeURIComponent(currentUserId)}`;
        console.log('DEBUG: Fetching from URL:', searchHistoryUrl);
        
        const response = await fetch(searchHistoryUrl);
        console.log('DEBUG: Response status:', response.status);
        console.log('DEBUG: Response ok:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.log('DEBUG: Error response text:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('DEBUG: Search history data received:', data);
        
        if (data.searchHistory && data.searchHistory.length > 0) {
            console.log('DEBUG: Displaying', data.searchHistory.length, 'search history items');
            displaySearchHistoryTabs(data.searchHistory);
            searchHistorySection.style.display = 'block';
        } else {
            console.log('DEBUG: No search history found, showing empty message');
            displayEmptySearchHistory();
            searchHistorySection.style.display = 'block';
        }
        
    } catch (error) {
        console.error('Error loading search history:', error);
        console.log('DEBUG: Hiding search history section due to error');
        searchHistorySection.style.display = 'none';
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

// Function to load and display details of a specific search
async function loadSearchDetails(searchId, tabElement) {
    try {
        // Remove active class from all tabs
        document.querySelectorAll('.search-history-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Add active class to clicked tab
        tabElement.classList.add('active');
        
        // Show loading in results
        resultsDiv.innerHTML = '<p class="loading-message">Loading saved search results...</p>';
        
        console.log(`Loading search details for: ${searchId}`);
        
        const response = await fetch(`${AWS_API_BASE_URL}/search-details?searchId=${encodeURIComponent(searchId)}&userId=${encodeURIComponent(currentUserId)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const searchDetails = await response.json();
        
        // Display the saved search results
        displaySearchResults(searchDetails.searchResults, searchDetails.searchSummary);
        
    } catch (error) {
        console.error('Error loading search details:', error);
        resultsDiv.innerHTML = '<p class="error-message">Error loading search results. Please try again.</p>';
    }
}

// Function to display search results (handles both new searches and saved searches)
function displaySearchResults(searchResults, searchSummary = '') {
    if (searchResults && typeof searchResults === 'string' && searchResults.length > 0) {
        // For saved searches, searchResults is the raw Perplexity response
        resultsDiv.innerHTML = `
            ${searchSummary ? `<h3>Search: ${searchSummary}</h3>` : ''}
            <div class="events-container">
                <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6; background: var(--secondary-bg); padding: 20px; border-radius: 10px;">
${searchResults}
                </pre>
            </div>
        `;
    } else {
        resultsDiv.innerHTML = '<p class="no-results-message">No search results found.</p>';
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

        // Handle the response and display results or a message
        if (result && result.events) { // AWS API returns events array
            renderEventCards(resultsDiv, result.events, "No events found for your search criteria.");
        } else if (result && result.message) {
            resultsDiv.innerHTML = `<p class="no-results-message">${result.message}</p>`;
        } else {
            resultsDiv.innerHTML = '<p class="no-results-message">Search request sent! Please check your email for results if provided, or try a different search.</p>';
        }

        // Reload search history to show the new search as a tab (if user is logged in)
        if (currentUserId) {
            loadSearchHistory();
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
        console.log('DEBUG: Loading search history on page init');
        loadSearchHistory();
    }
}