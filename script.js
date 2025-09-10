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
const loginBtnMobile = document.getElementById('loginBtnMobile');
const signupBtnMobile = document.getElementById('signupBtnMobile');
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

// Debug mobile menu elements - MOVED AFTER ALL DOM DECLARATIONS
console.log('🔍 DEBUG: Checking all DOM elements...');
console.log('Mobile menu elements found:', {
    menuToggle: !!menuToggle,
    mobileMenu: !!mobileMenu,
    closeMobileMenu: !!closeMobileMenu,
    loginBtnMobile: !!loginBtnMobile,
    signupBtnMobile: !!signupBtnMobile,
    loginSignupModal: !!loginSignupModal,
    loginForm: !!loginForm,
    signupForm: !!signupForm
});

// Test if JavaScript is working at all
console.log('🟢 JavaScript is running!');
window.debugTest = function() {
    alert('JavaScript is working!');
    console.log('Debug test function called');
};

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
        document.body.style.overflow = '';
        handleSearchClick();
    });
}

// Mobile login button
if (loginBtnMobile) {
    loginBtnMobile.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
        console.log('Mobile login button clicked');
        // Show login form in the modal
        showLogin();
        loginSignupModal.style.display = 'flex';
    });
}

// Mobile signup button  
if (signupBtnMobile) {
    signupBtnMobile.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
        console.log('Mobile signup button clicked');
        // Show signup form in the modal
        showSignup();
        loginSignupModal.style.display = 'flex';
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

// EMERGENCY FIX: Simple mobile menu toggle without complex logic
if (menuToggle && mobileMenu) {
    console.log('✅ Setting up SIMPLE mobile menu toggle');
    
    try {
        menuToggle.addEventListener('click', function() {
            console.log('🎯 Menu toggle clicked!');
            mobileMenu.classList.add('open');
        });
        console.log('✅ Event listener attached successfully');
    } catch (error) {
        console.error('❌ Error attaching event listener:', error);
    }
} else {
    console.error('❌ Mobile menu elements not found:', { 
        menuToggle: !!menuToggle, 
        mobileMenu: !!mobileMenu 
    });
}

// Close mobile menu
if (closeMobileMenu && mobileMenu) {
    closeMobileMenu.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Close mobile menu clicked');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = ''; // Restore scrolling
    });
}

// Close mobile menu when clicking outside or on menu items
if (mobileMenu) {
    // Close when clicking on the menu background
    mobileMenu.addEventListener('click', (e) => {
        if (e.target === mobileMenu) {
            mobileMenu.classList.remove('open');
            document.body.style.overflow = '';
        }
    });
    
    // Close when clicking on menu links
    const mobileMenuLinks = mobileMenu.querySelectorAll('a');
    mobileMenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.remove('open');
            document.body.style.overflow = '';
        });
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
        // Handle successful registration requiring verification
        if (data.requiresVerification) {
            authMessage.innerHTML = `
                <div style="text-align: left;">
                    <i class="fas fa-check-circle" style="color: green;"></i> 
                    <strong>Account created successfully!</strong><br>
                    <small>📧 Please check your email and click the verification link to complete registration.</small><br>
                    <small>Email: ${data.email}</small>
                </div>
            `;
            authMessage.style.color = 'green';
            
            // Add resend verification button
            setTimeout(() => {
                authMessage.innerHTML += `
                    <div style="margin-top: 15px;">
                        <button id="resendVerificationBtn" style="background: linear-gradient(135deg, #6c757d, #5a6268); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-paper-plane"></i> Resend Verification Email
                        </button>
                    </div>
                `;
                
                // Add event listener for resend button
                const resendBtn = document.getElementById('resendVerificationBtn');
                if (resendBtn) {
                    resendBtn.addEventListener('click', () => resendVerificationEmail(data.email));
                }
            }, 1000);
            return;
        }
        
        // Handle successful login with token
        if (data.token) {
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
        }
    } else {
        // Handle login requiring verification
        if (data.requiresVerification) {
            authMessage.innerHTML = `
                <div style="text-align: left;">
                    <i class="fas fa-exclamation-triangle" style="color: orange;"></i> 
                    <strong>Email verification required</strong><br>
                    <small>📧 Please check your email and click the verification link before logging in.</small><br>
                    <small>Email: ${data.email}</small>
                    <div style="margin-top: 10px;">
                        <button id="resendVerificationBtn" style="background: linear-gradient(135deg, #6c757d, #5a6268); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 12px;">
                            <i class="fas fa-paper-plane"></i> Resend Verification Email
                        </button>
                    </div>
                </div>
            `;
            authMessage.style.color = 'orange';
            
            // Add event listener for resend button
            setTimeout(() => {
                const resendBtn = document.getElementById('resendVerificationBtn');
                if (resendBtn) {
                    resendBtn.addEventListener('click', () => resendVerificationEmail(data.email));
                }
            }, 100);
            return;
        }
        
        authMessage.textContent = data.message || 'Authentication failed.';
        authMessage.style.color = 'red';
    }
}

// Function to resend verification email
async function resendVerificationEmail(email) {
    const resendBtn = document.getElementById('resendVerificationBtn');
    if (!resendBtn) return;
    
    const originalText = resendBtn.innerHTML;
    resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    resendBtn.disabled = true;
    
    try {
        const response = await fetch(`${AWS_API_BASE_URL}/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            resendBtn.innerHTML = '<i class="fas fa-check"></i> Email Sent!';
            resendBtn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
        } else {
            resendBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed';
            resendBtn.style.background = 'linear-gradient(135deg, #dc3545, #e74c3c)';
        }
        
        setTimeout(() => {
            resendBtn.innerHTML = originalText;
            resendBtn.disabled = false;
            resendBtn.style.background = 'linear-gradient(135deg, #6c757d, #5a6268)';
        }, 3000);
        
    } catch (error) {
        console.error('Resend verification error:', error);
        resendBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        setTimeout(() => {
            resendBtn.innerHTML = originalText;
            resendBtn.disabled = false;
        }, 3000);
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

// Function to show login form
function showLogin() {
    loginSignupTitle.textContent = 'Login';
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    authMessage.textContent = '';
}

// Function to show signup form
function showSignup() {
    loginSignupTitle.textContent = 'Sign Up';
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    authMessage.textContent = '';
}

showSignupLink.addEventListener('click', (e) => {
    e.preventDefault();
    showSignup();
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    showLogin();
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

// Email validation function
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Password strength validation function
function isValidPassword(password) {
    return password.length >= 8;
}

// Username validation function  
function isValidUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
}

// Function to show validation error
function showValidationError(message) {
    authMessage.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
    authMessage.style.color = 'red';
}

// Real-time field validation
function setupFieldValidation() {
    // Get form fields
    const signupEmailField = document.getElementById('signupEmail');
    const signupUsernameField = document.getElementById('signupUsername');
    const signupPasswordField = document.getElementById('signupPassword');
    const confirmPasswordField = document.getElementById('confirmPassword');
    
    // Email field validation
    if (signupEmailField) {
        signupEmailField.addEventListener('blur', function() {
            const email = this.value.trim();
            if (email && !isValidEmail(email)) {
                this.style.borderColor = '#dc3545';
                this.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
            } else {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });

        signupEmailField.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(220, 53, 69)') {
                const email = this.value.trim();
                if (isValidEmail(email)) {
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                }
            }
        });
    }

    // Username field validation
    if (signupUsernameField) {
        signupUsernameField.addEventListener('blur', function() {
            const username = this.value.trim();
            if (username && !isValidUsername(username)) {
                this.style.borderColor = '#dc3545';
                this.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
            } else {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });

        signupUsernameField.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(220, 53, 69)') {
                const username = this.value.trim();
                if (isValidUsername(username)) {
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                }
            }
        });
    }

    // Password field validation
    if (signupPasswordField) {
        signupPasswordField.addEventListener('blur', function() {
            const password = this.value;
            if (password && !isValidPassword(password)) {
                this.style.borderColor = '#dc3545';
                this.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
            } else {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });

        signupPasswordField.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(220, 53, 69)') {
                const password = this.value;
                if (isValidPassword(password)) {
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                }
            }
        });
    }

    // Confirm password field validation
    if (confirmPasswordField && signupPasswordField) {
        confirmPasswordField.addEventListener('blur', function() {
            const password = signupPasswordField.value;
            const confirmPassword = this.value;
            if (confirmPassword && password !== confirmPassword) {
                this.style.borderColor = '#dc3545';
                this.style.boxShadow = '0 0 0 0.2rem rgba(220, 53, 69, 0.25)';
            } else {
                this.style.borderColor = '';
                this.style.boxShadow = '';
            }
        });

        confirmPasswordField.addEventListener('input', function() {
            if (this.style.borderColor === 'rgb(220, 53, 69)') {
                const password = signupPasswordField.value;
                const confirmPassword = this.value;
                if (password === confirmPassword) {
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                }
            }
        });
    }
}

signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = e.target.signupUsername.value.trim();
    const email = e.target.signupEmail.value.trim().toLowerCase();
    const password = e.target.signupPassword.value;
    const confirmPassword = e.target.confirmPassword.value;

    // Clear previous messages
    authMessage.textContent = '';

    // Frontend validation checks
    if (!username) {
        showValidationError('Username is required');
        return;
    }

    if (!isValidUsername(username)) {
        showValidationError('Username must be 3-20 characters long and contain only letters, numbers, and underscores');
        return;
    }

    if (!email) {
        showValidationError('Email address is required');
        return;
    }

    if (!isValidEmail(email)) {
        showValidationError('Please enter a valid email address (e.g., user@example.com)');
        return;
    }

    if (!password) {
        showValidationError('Password is required');
        return;
    }

    if (!isValidPassword(password)) {
        showValidationError('Password must be at least 8 characters long');
        return;
    }

    if (password !== confirmPassword) {
        showValidationError('Passwords do not match!');
        return;
    }

    // All validations passed - proceed with registration
    authMessage.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating your account...';
    authMessage.style.color = 'white';

    try {
        const response = await fetch(`${AWS_API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        await handleAuthResponse(response);
    } catch (error) {
        console.error('Signup error:', error);
        showValidationError('Network error during signup. Please try again.');
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

    // Show enhanced loading message for AI search
    resultsDiv.innerHTML = `
        <div class="ai-search-loading">
            <div class="loading-spinner-large">
                <i class="fas fa-robot fa-spin"></i>
            </div>
            <h3>🤖 AI Event Discovery in Progress</h3>
            <p class="ai-search-status" id="searchStatus">Initiating intelligent search...</p>
            <div class="ai-progress-steps">
                <div class="progress-step active" id="step1">
                    <i class="fas fa-search"></i> Scanning event sources
                </div>
                <div class="progress-step" id="step2">
                    <i class="fas fa-brain"></i> AI processing & curation
                </div>
                <div class="progress-step" id="step3">
                    <i class="fas fa-check-circle"></i> Finalizing results
                </div>
            </div>
            <p class="processing-note">
                <i class="fas fa-info-circle"></i>
                Our AI is analyzing multiple sources to find the best events for you.<br>
                This may take 1-2 minutes for optimal results.
            </p>
        </div>
    `;

    const data = {
        searchParams: {
            location: document.getElementById("location").value,
            activity_type: document.getElementById("activity_type").value,
            timeframe: document.getElementById("timeframe").value,
            radius: document.getElementById("radius").value,
            keywords: document.getElementById("keywords").value,
            email: document.getElementById("email").value
        }
    };

    // Close the modal after submission (good UX)
    searchModal.style.display = 'none';

    // TEMPORARY: Use existing endpoint until async deployment complete
    const submitSearchUrl = `${AWS_API_BASE_URL}/search-events`;

    // Show loading overlay BEFORE sending the request
    showLoading();

    // Start progress simulation
    simulateSearchProgress();

    try {
        const headers = { "Content-Type": "application/json" };

        // Get JWT and add to headers if user is logged in
        const jwtToken = getToken();
        if (jwtToken) {
            headers["Authorization"] = `Bearer ${jwtToken}`;
        }

        // Submit search asynchronously - this should return immediately with requestId
        console.log('Sending request to:', submitSearchUrl);
        console.log('Request payload:', JSON.stringify(data, null, 2));
        
        const response = await fetch(submitSearchUrl, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error submitting search: ${response.status}, message: ${errorText}`);
        }

        let result;
        try {
            result = await response.json();
            console.log('Search submission response:', result);
        } catch (parseError) {
            console.error('Failed to parse JSON response:', parseError);
            const responseText = await response.text();
            console.log('Raw response text:', responseText);
            throw new Error('Invalid JSON response from server');
        }
        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);

        // Handle response based on type (async with requestId OR direct results)
        if (response.ok && result.success && result.requestId) {
            // ASYNC RESPONSE: New async pattern with polling
            console.log('Search submitted successfully, requestId:', result.requestId);
            
            // Store request info for polling
            window.currentSearchId = result.requestId;
            window.searchStartTime = Date.now();
            
            // Update UI to show polling in progress
            resultsDiv.innerHTML = `
                <div class="search-polling-message">
                    <div class="success-icon">
                        <i class="fas fa-hourglass-half fa-spin"></i>
                    </div>
                    <h3>🤖 AI Search Processing</h3>
                    <p>Your search has been submitted successfully!</p>
                    <p id="pollingStatus">Checking for results...</p>
                    <div class="polling-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="pollingProgress"></div>
                        </div>
                        <p class="polling-info">Request ID: <code>${result.requestId}</code></p>
                    </div>
                </div>
            `;
            
            // Start polling for results
            startPollingForResults(result.requestId, data.searchParams);
            
        } else if (response.ok && (result.events || result.body)) {
            // DIRECT RESPONSE: Old synchronous pattern with immediate results
            console.log('Search response received (direct):', result);
            
            // Parse the result.body if it exists (Lambda function returns body as string)
            let parsedResult = result;
            if (result.body && typeof result.body === 'string') {
                try {
                    parsedResult = JSON.parse(result.body);
                    console.log('Parsed result from body:', parsedResult);
                } catch (parseError) {
                    console.error('Failed to parse result.body:', parseError);
                    parsedResult = result;
                }
            }
            
            // Store the search results for the results page
            if (parsedResult.events && parsedResult.events.length > 0) {
                // Clean up the events data (remove ** prefixes)
                const cleanedEvents = parsedResult.events.map(event => ({
                    ...event,
                    date: event.date ? event.date.replace(/^\*\* /, '') : event.date,
                    location: event.location ? event.location.replace(/^\*\* /, '') : event.location,
                    description: event.description || `${event.name} - A great event happening in ${parsedResult.searchLocation || data.searchParams.location || 'the area'}!`
                }));
                
                const searchResults = {
                    events: cleanedEvents,
                    searchLocation: parsedResult.searchLocation,
                    searchParams: data.searchParams,
                    searchDate: new Date().toISOString(),
                    totalEvents: parsedResult.totalEvents
                };
                
                // Store in localStorage for the results page
                localStorage.setItem('latestSearchResults', JSON.stringify(searchResults));
                
                showSearchSubmissionSuccess(data.searchParams, cleanedEvents);
            } else {
                console.log('No events received from direct response, showing no results message');
                showNoEventsFound(data.searchParams);
            }
            
        } else {
            throw new Error('Failed to submit search: ' + (result.message || 'Unknown error'));
        }

    } catch (error) {
        console.error("Error sending data to AWS API:", error);
        
        // Clear progress simulation
        if (window.searchProgressInterval) {
            clearInterval(window.searchProgressInterval);
        }
        
        // Handle different error types
        if (error.name === 'AbortError') {
            resultsDiv.innerHTML = `
                <div class="search-timeout-error">
                    <div class="error-icon">
                        <i class="fas fa-clock"></i>
                    </div>
                    <h3>⏰ Search Taking Longer Than Expected</h3>
                    <p>Our AI is working hard to find the best events for you!</p>
                    <p>This sometimes happens when processing large amounts of data.</p>
                    <div class="error-actions">
                        <button onclick="location.reload()" class="retry-btn">
                            <i class="fas fa-redo"></i> Try Again
                        </button>
                        ${document.getElementById("email").value ? `<p><small>Results will be sent to ${document.getElementById("email").value} once processing completes.</small></p>` : ''}
                    </div>
                </div>
            `;
        } else if (error.message.includes('504') || error.message.includes('Gateway Timeout')) {
            resultsDiv.innerHTML = `
                <div class="search-processing-message">
                    <div class="success-icon">
                        <i class="fas fa-cogs fa-spin"></i>
                    </div>
                    <h3>🤖 Advanced AI Search in Progress</h3>
                    <p>Your search is being processed by our multi-AI system (Claude + OpenAI + Perplexity).</p>
                    <p>Complex searches with 20+ events can take 1-2 minutes to complete.</p>
                    <p><strong>Your search is still running in the background!</strong></p>
                    ${document.getElementById("email").value ? `
                        <div class="email-notification">
                            <i class="fas fa-envelope"></i>
                            <p>Results will be sent to <strong>${document.getElementById("email").value}</strong> once processing completes.</p>
                        </div>
                    ` : ''}
                    <div class="processing-actions">
                        <button onclick="setTimeout(() => location.reload(), 30000)" class="retry-btn">
                            <i class="fas fa-clock"></i> Check Results in 30s
                        </button>
                        <button onclick="location.reload()" class="retry-btn">
                            <i class="fas fa-search"></i> Check Now
                        </button>
                    </div>
                    <p><small><i class="fas fa-info-circle"></i> Note: Our AI system processes 3x more sources than standard search engines</small></p>
                </div>
            `;
        } else {
            resultsDiv.innerHTML = `
                <div class="search-error">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h3>Search Error</h3>
                    <p>An error occurred while fetching events. Please try again.</p>
                    <button onclick="location.reload()" class="retry-btn">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    } finally {
        // Hide loading overlay AFTER the fetch call completes (or errors)
        hideLoading();
        
        // Clear progress simulation
        if (window.searchProgressInterval) {
            clearInterval(window.searchProgressInterval);
        }
    }
});

// Function to simulate search progress for better UX
function simulateSearchProgress() {
    let step = 1;
    let timeElapsed = 0;
    
    window.searchProgressInterval = setInterval(() => {
        timeElapsed += 2000; // 2 seconds intervals
        
        const statusElement = document.getElementById('searchStatus');
        if (!statusElement) {
            clearInterval(window.searchProgressInterval);
            return;
        }
        
        // Update status based on time elapsed
        if (timeElapsed <= 10000) { // 0-10 seconds
            statusElement.textContent = 'Scanning event sources...';
            updateProgressStep(1);
        } else if (timeElapsed <= 30000) { // 10-30 seconds
            statusElement.textContent = 'AI analyzing and curating events...';
            updateProgressStep(2);
        } else if (timeElapsed <= 60000) { // 30-60 seconds
            statusElement.textContent = 'Processing with multiple AI models...';
            updateProgressStep(2);
        } else if (timeElapsed <= 90000) { // 60-90 seconds
            statusElement.textContent = 'Finalizing and structuring results...';
            updateProgressStep(3);
        } else { // 90+ seconds
            statusElement.textContent = 'Almost done - optimizing results...';
            updateProgressStep(3);
        }
    }, 2000);
}

function updateProgressStep(activeStep) {
    // Reset all steps
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < activeStep) {
            step.classList.add('completed');
        } else if (index + 1 === activeStep) {
            step.classList.add('active');
        }
    });
}

// --- Async Search Polling Functions ---

async function startPollingForResults(requestId, originalSearchParams) {
    console.log('Starting to poll for results with requestId:', requestId);
    
    let pollCount = 0;
    const maxPollCount = 36; // Poll for max 6 minutes (36 * 10 seconds)
    const pollInterval = 10000; // 10 seconds
    
    const pollForResults = async () => {
        pollCount++;
        console.log(`Polling attempt ${pollCount}/${maxPollCount}`);
        
        try {
            const getResultsUrl = `${AWS_API_BASE_URL}/get-results?requestId=${requestId}`;
            const headers = { "Content-Type": "application/json" };
            
            // Add auth header if available
            const jwtToken = getToken();
            if (jwtToken) {
                headers["Authorization"] = `Bearer ${jwtToken}`;
            }
            
            const response = await fetch(getResultsUrl, {
                method: "GET",
                headers: headers
            });
            
            if (!response.ok) {
                throw new Error(`Failed to get results: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Polling response:', result);
            
            // Update polling status
            const statusElement = document.getElementById('pollingStatus');
            const progressElement = document.getElementById('pollingProgress');
            
            if (result.status === 'processing') {
                // Still processing - update UI and continue polling
                if (statusElement) {
                    statusElement.textContent = result.progressUpdate || 'Still processing...';
                }
                if (progressElement) {
                    const progressPercent = Math.min(90, (pollCount / maxPollCount) * 100);
                    progressElement.style.width = `${progressPercent}%`;
                }
                
                // Continue polling if under max attempts
                if (pollCount < maxPollCount) {
                    setTimeout(pollForResults, pollInterval);
                } else {
                    // Max attempts reached
                    handlePollingTimeout(requestId, originalSearchParams);
                }
                
            } else if (result.status === 'completed') {
                // Search completed successfully!
                console.log('Search completed! Events found:', result.events?.length || 0);
                
                if (progressElement) {
                    progressElement.style.width = '100%';
                }
                
                // Process and display results
                if (result.events && result.events.length > 0) {
                    // Clean up the events data
                    const cleanedEvents = result.events.map(event => ({
                        ...event,
                        date: event.date ? event.date.replace(/^\*\* /, '') : event.date,
                        location: event.location ? event.location.replace(/^\*\* /, '') : event.location,
                        description: event.description || `${event.name} - A great event happening in ${originalSearchParams.location || 'the area'}!`
                    }));
                    
                    const searchResults = {
                        events: cleanedEvents,
                        searchLocation: originalSearchParams.location,
                        searchParams: originalSearchParams,
                        searchDate: new Date().toISOString(),
                        totalEvents: cleanedEvents.length,
                        requestId: requestId
                    };
                    
                    // Store in localStorage
                    localStorage.setItem('latestSearchResults', JSON.stringify(searchResults));
                    
                    // Show success message
                    showSearchSubmissionSuccess(originalSearchParams, cleanedEvents);
                    
                } else {
                    // No events found
                    showNoEventsFound(originalSearchParams);
                }
                
                // Clear polling state
                window.currentSearchId = null;
                window.searchStartTime = null;
                
            } else if (result.status === 'failed') {
                // Search failed
                console.error('Search failed:', result.error);
                handlePollingError(requestId, result.error || 'Search processing failed');
                
            } else {
                console.error('Unknown search status:', result.status);
                handlePollingError(requestId, `Unknown status: ${result.status}`);
            }
            
        } catch (error) {
            console.error('Polling error:', error);
            
            // Continue polling on network errors, stop on other errors
            if (error.message.includes('Failed to fetch') && pollCount < maxPollCount) {
                setTimeout(pollForResults, pollInterval);
            } else {
                handlePollingError(requestId, error.message);
            }
        }
    };
    
    // Start polling
    setTimeout(pollForResults, 5000); // First check after 5 seconds
}

function handlePollingTimeout(requestId, originalSearchParams) {
    console.log('Polling timeout reached for requestId:', requestId);
    
    resultsDiv.innerHTML = `
        <div class="search-timeout-message">
            <div class="warning-icon">
                <i class="fas fa-clock"></i>
            </div>
            <h3>🕐 Search Taking Longer Than Expected</h3>
            <p>Your AI-powered search is still processing in the background.</p>
            <p>Complex searches can take up to 5 minutes to complete.</p>
            <div class="timeout-actions">
                <button onclick="location.reload()" class="retry-btn">
                    <i class="fas fa-redo"></i> Refresh Page
                </button>
                <button onclick="checkResultsManually('${requestId}')" class="check-btn">
                    <i class="fas fa-search"></i> Check Results Now
                </button>
            </div>
            ${originalSearchParams.email ? `
                <div class="email-notification">
                    <i class="fas fa-envelope"></i>
                    <p>Results will be sent to <strong>${originalSearchParams.email}</strong> once completed.</p>
                </div>
            ` : ''}
        </div>
    `;
    
    // Hide loading overlay
    hideLoading();
}

function handlePollingError(requestId, errorMessage) {
    console.error('Polling error for requestId:', requestId, 'Error:', errorMessage);
    
    resultsDiv.innerHTML = `
        <div class="search-error-message">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>⚠️ Search Processing Error</h3>
            <p>There was an issue processing your search request.</p>
            <p class="error-details">Error: ${errorMessage}</p>
            <div class="error-actions">
                <button onclick="location.reload()" class="retry-btn">
                    <i class="fas fa-redo"></i> Try New Search
                </button>
            </div>
        </div>
    `;
    
    // Clear polling state
    window.currentSearchId = null;
    window.searchStartTime = null;
    
    // Hide loading overlay
    hideLoading();
}

function showNoEventsFound(searchParams) {
    resultsDiv.innerHTML = `
        <div class="no-events-message">
            <div class="info-icon">
                <i class="fas fa-info-circle"></i>
            </div>
            <h3>🔍 No Events Found</h3>
            <p>We couldn't find any events matching your criteria.</p>
            <div class="search-suggestions">
                <h4>Try adjusting your search:</h4>
                <ul>
                    <li>Expand your location radius</li>
                    <li>Try different activity types</li>
                    <li>Broaden your timeframe</li>
                    <li>Use different keywords</li>
                </ul>
            </div>
            <button onclick="document.getElementById('searchModal').style.display='block'" class="search-again-btn">
                <i class="fas fa-search"></i> Search Again
            </button>
        </div>
    `;
    
    // Hide loading overlay
    hideLoading();
}

async function checkResultsManually(requestId) {
    console.log('Manual results check for requestId:', requestId);
    
    try {
        const getResultsUrl = `${AWS_API_BASE_URL}/get-results?requestId=${requestId}`;
        const headers = { "Content-Type": "application/json" };
        
        const jwtToken = getToken();
        if (jwtToken) {
            headers["Authorization"] = `Bearer ${jwtToken}`;
        }
        
        const response = await fetch(getResultsUrl, {
            method: "GET",
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`Failed to check results: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Manual check result:', result);
        
        if (result.status === 'completed' && result.events?.length > 0) {
            // Process and show results
            const cleanedEvents = result.events.map(event => ({
                ...event,
                date: event.date ? event.date.replace(/^\*\* /, '') : event.date,
                location: event.location ? event.location.replace(/^\*\* /, '') : event.location,
                description: event.description || event.name
            }));
            
            const searchResults = {
                events: cleanedEvents,
                searchParams: {}, // We don't have original params here
                searchDate: new Date().toISOString(),
                totalEvents: cleanedEvents.length,
                requestId: requestId
            };
            
            localStorage.setItem('latestSearchResults', JSON.stringify(searchResults));
            showSearchSubmissionSuccess({}, cleanedEvents);
            
        } else if (result.status === 'processing') {
            alert('Search is still processing. Please wait a bit longer.');
        } else if (result.status === 'failed') {
            alert('Search failed: ' + (result.error || 'Unknown error'));
        } else {
            alert('No results found yet.');
        }
        
    } catch (error) {
        console.error('Manual check error:', error);
        alert('Failed to check results: ' + error.message);
    }
}

// --- Initial Calls ---
// Initial message for search results div
resultsDiv.innerHTML = '<p class="no-results-message">Your search results will appear here.</p>';

// Load featured events when the page loads
loadFeaturedEvents();

// Initial UI update for auth status and search history
updateAuthUI();

// Setup field validation for signup form
setupFieldValidation();

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