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

// AWS Backend API Base URL
// This URL now points to the API Gateway with LLM integration
const AWS_API_BASE_URL = "https://qk3jiyk1e8.execute-api.ap-south-1.amazonaws.com/prod";

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
        authMessage.textContent = 'Success! Logging in...';
        authMessage.style.color = 'green';
        setTimeout(() => {
            loginSignupModal.style.display = 'none';
            updateAuthUI();
            authMessage.textContent = ''; // Clear message
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
    updateAuthUI();
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

// Initial UI update for auth status
updateAuthUI();