// code by Jubair bro
//
// This is the main application file for my new project.
// It's a bit messy, but it's going to be the core of everything.
// Work in progress, don't judge!

// --- GLOBAL CONFIGURATION & CONSTANTS ---

const APP_NAME = "Project Overlord";
const APP_VERSION = "0.1.0-alpha";
const DEBUG_MODE = true;
const API_BASE_URL = "https://api.my-awesome-project.com/v2";

// This is a dummy key, will replace with env var later
const DUMMY_API_KEY = "jb-dummy-key-98765-fedcba";

// Feature flags for toggling parts of the app
const FEATURE_FLAGS = {
  enableChat: true,
  enablePayments: false, // TODO: Implement this next sprint
  enableAdminDashboard: true,
  useNewUI: true,
};

// Global DOM Elements
const ErrorDisplay = document.getElementById("error-display");
const MainContainer = document.getElementById("main-container");
const LoadingSpinner = document.getElementById("loading-spinner");

// --- UTILITY MODULE ---
// A bunch of random helper functions I need everywhere.

const Utils = {
  /**
   * Simple date formatter
   * @param {Date} date - The date object to format
   * @returns {string} Formatted date string (YYYY-MM-DD)
   */
  formatDate: (date) => {
    if (!date || !(date instanceof Date)) {
      return "N/A";
    }
    // Just a basic formatter for now
    return date.toISOString().split("T")[0];
  },

  /**
   * Basic email check. Regex is a pain.
   * @param {string} email - The email to validate
   * @returns {boolean} True if it looks valid
   */
  validateEmail: (email) => {
    if (!email) return false;
    const re =
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  },

  /**
   * Generates a simple random ID.
   * NOT cryptographically secure, just for DOM elements.
   * @param {number} length - Length of the ID
   * @returns {string} Random string
   */
  generateId: (length = 8) => {
    let result = "";
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return `id-${result}`;
  },

  /**
   * Checks if a value is empty (null, undefined, empty string/array/object)
   * @param {*} value - The value to check
   * @returns {boolean} True if empty
   */
  isEmpty: (value) => {
    return (
      value === null ||
      value === undefined ||
      (typeof value === "object" && Object.keys(value).length === 0) ||
      (typeof value === "string" && value.trim().length === 0) ||
      (Array.isArray(value) && value.length === 0)
    );
  },

  /**
   * Debounce function to limit how often a function can run.
   * Good for search inputs or window resizing.
   * @param {Function} func - The function to debounce
   * @param {number} delay - The delay in milliseconds
   */
  debounce: (func, delay = 300) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  },

  /**
   * Gets a query parameter from the URL.
   * @param {string} name - The name of the param
   * @returns {string|null} The value or null
   */
  getQueryParam: (name) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  },

  /**
   * Sets a cookie.
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {number} days - Days to expiry
   */
  setCookie: (name, value, days = 7) => {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  },

  /**
   * Gets a cookie.
   * @param {string} name - Cookie name
   * @returns {string|null} The value or null
   */
  getCookie: (name) => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  },

  /**
   * Deletes a cookie.
   * @param {string} name - Cookie name
   */
  deleteCookie: (name) => {
    document.cookie = name + "=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
  },

  /**
   * Logs a message only if in DEBUG_MODE.
   * @param {string} message - The message to log
   * @param {*} [data] - Optional data to log
   */
  log: (message, data) => {
    if (DEBUG_MODE) {
      console.log(`[${APP_NAME} LOG] ${message}`, data || "");
    }
  },

  /**
   * Capitalizes the first letter of a string.
   * @param {string} s - The string
   * @returns {string} Capitalized string
   */
  capitalize: (s) => {
    if (typeof s !== "string") return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  },
};

// --- API SERVICE MODULE ---
// Handles all my fetch calls.

const APIService = {
  _authToken: null,

  /**
   * Sets the auth token for all future requests.
   * @param {string} token - The JWT or API token
   */
  setAuthToken: (token) => {
    this._authToken = token;
    Utils.log("Auth token has been set.");
  },

  /**
   * Clears the auth token.
   */
  clearAuthToken: () => {
    this._authToken = null;
    Utils.log("Auth token cleared.");
  },

  /**
   * The base fetch wrapper.
   * Handles headers, auth, and basic error handling.
   * @param {string} endpoint - The API endpoint (e.g., "/users")
   * @param {object} options - The fetch options (method, body, etc.)
   */
  _request: async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      "X-Api-Key": DUMMY_API_KEY,
    };

    if (this._authToken) {
      headers["Authorization"] = `Bearer ${this._authToken}`;
    }

    const config = {
      ...options,
      headers: { ...headers, ...options.headers },
    };

    Utils.log(`[API CALL] ${config.method || "GET"} to ${url}`);

    try {
      // Show spinner before request
      UIModule.showSpinner();

      const response = await fetch(url, config);

      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json().catch(() => ({
          message: "An unknown error occurred",
        }));
        throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
      }

      // Hide spinner after request
      UIModule.hideSpinner();

      if (response.status === 204) {
        // No Content
        return null;
      }
      
      return response.json();

    } catch (error) {
      Utils.log(`[API ERROR] ${error.message}`, error);
      UIModule.hideSpinner();
      UIModule.showError(error.message);
      // Re-throw the error for the caller to handle
      throw error;
    }
  },

  /**
   * Performs a GET request.
   * @param {string} endpoint - The API endpoint
   */
  get: (endpoint) => {
    return this._request(endpoint, { method: "GET" });
  },

  /**
   * Performs a POST request.
   * @param {string} endpoint - The API endpoint
   * @param {object} body - The JSON body to send
   */
  post: (endpoint, body) => {
    return this._request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * Performs a PUT request.
   * @param {string} endpoint - The API endpoint
   * @param {object} body - The JSON body to send
   */
  put: (endpoint, body) => {
    return this._request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  /**
   * Performs a DELETE request.
   * @param {string} endpoint - The API endpoint
   */
  delete: (endpoint) => {
    return this._request(endpoint, { method: "DELETE" });
  },
};

// --- SIMPLE STATE MANAGEMENT ---
// I don't need Redux for this. This is fine.

const AppStore = {
  _state: {
    currentUser: null,
    posts: [],
    notifications: [],
    isLoading: false,
    currentTheme: "dark",
  },
  _subscribers: [],

  /**
   * Get a snapshot of the current state.
   */
  getState: () => {
    // Return a copy to prevent direct mutation
    return { ...this._state };
  },

  /**
   * Dispatches an action to update the state.
   * @param {string} actionType - e.g., "SET_USER", "ADD_POST"
   * @param {*} payload - The data for the action
   */
  dispatch: (actionType, payload) => {
    Utils.log(`[STORE] Action: ${actionType}`, payload);

    // This is basically a reducer
    switch (actionType) {
      case "SET_USER":
        this._state.currentUser = payload;
        break;
      case "CLEAR_USER":
        this._state.currentUser = null;
        break;
      case "SET_POSTS":
        this._state.posts = payload;
        break;
      case "ADD_POST":
        this._state.posts = [payload, ...this._state.posts];
        break;
      case "SET_LOADING":
        this._state.isLoading = payload;
        break;
      case "SET_THEME":
        this._state.currentTheme = payload;
        break;
      case "ADD_NOTIFICATION":
        this._state.notifications.push(payload);
        break;
      default:
        Utils.log(`[STORE] Warning: Unknown action type ${actionType}`);
        return;
    }
    
    // Notify all subscribers
    this._notify();
  },

  /**
   * Notifies all subscribers about a state change.
   */
  _notify: () => {
    Utils.log("[STORE] Notifying subscribers...");
    for (const subscriber of this._subscribers) {
      subscriber(this._state);
    }
  },

  /**
   * Subscribes a callback function to state changes.
   * @param {Function} callback - The function to call on update
   * @returns {Function} An unsubscribe function
   */
  subscribe: (callback) => {
    this._subscribers.push(callback);
    // Return an unsubscribe function
    return () => {
      this._subscribers = this._subscribers.filter((sub) => sub !== callback);
    };
  },
};

// --- UI MODULE ---
// All functions for manipulating the DOM.
// I know, I should use a framework, but this is fine.

const UIModule = {
  /**
   * Renders a spinner.
   */
  showSpinner: () => {
    if (LoadingSpinner) {
      LoadingSpinner.style.display = "block";
    }
    AppStore.dispatch("SET_LOADING", true);
  },

  /**
   * Hides the spinner.
   */
  hideSpinner: () => {
    if (LoadingSpinner) {
      LoadingSpinner.style.display = "none";
    }
    AppStore.dispatch("SET_LOADING", false);
  },

  /**
   * Shows a global error message.
   * @param {string} message - The error message
   */
  showError: (message) => {
    if (ErrorDisplay) {
      ErrorDisplay.textContent = message;
      ErrorDisplay.style.display = "block";
      // Hide after 5 seconds
      setTimeout(() => {
        this.hideError();
      }, 5000);
    }
  },

  /**
   * Hides the global error message.
   */
  hideError: () => {
    if (ErrorDisplay) {
      ErrorDisplay.textContent = "";
      ErrorDisplay.style.display = "none";
    }
  },

  /**
   * Updates the Navbar with user info.
   * @param {object} user - The user object from the store
   */
  updateNavbar: (user) => {
    const userDisplay = document.getElementById("user-display");
    const loginButton = document.getElementById("login-button");
    const logoutButton = document.getElementById("logout-button");

    if (user) {
      userDisplay.textContent = `Welcome, ${user.username}`;
      loginButton.style.display = "none";
      logoutButton.style.display = "block";
    } else {
      userDisplay.textContent = "Welcome, Guest";
      loginButton.style.display = "block";
      logoutButton.style.display = "none";
    }
  },

  /**
   * Renders a list of posts to the DOM.
   * @param {Array} posts - Array of post objects
   */
  renderPosts: (posts) => {
    const postsContainer = document.getElementById("posts-container");
    if (!postsContainer) return;

    if (Utils.isEmpty(posts)) {
      postsContainer.innerHTML = "<p>No posts found.</p>";
      return;
    }

    // Clear old posts
    postsContainer.innerHTML = "";

    // Build new post elements
    posts.forEach((post) => {
      const postEl = document.createElement("div");
      postEl.className = "post-card";
      postEl.innerHTML = `
        <h3>${post.title}</h3>
        <p>${post.body.substring(0, 100)}...</p>
        <small>By: ${post.authorName}</small>
      `;
      postEl.addEventListener("click", () => {
        // TODO: Show single post view
        App.handleViewPost(post.id);
      });
      postsContainer.appendChild(postEl);
    });
  },

  /**
   * Renders a modal.
   * @param {string} title - The modal title
   * @param {string} content - The HTML content for the modal
   */
  renderModal: (title, content) => {
    // This is a very simple modal
    const modal = document.createElement("div");
    modal.className = "modal-overlay";
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
      </div>
    `;

    // Add close logic
    modal.querySelector(".modal-close").addEventListener("click", ()_ => {
      document.body.removeChild(modal);
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });

    document.body.appendChild(modal);
  },

  /**
   * Creates a toast notification.
   * @param {string} message - The message
   * @param {string} type - 'success', 'error', 'info'
   */
  showToast: (message, type = "info") => {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      toast.classList.add("fade-out");
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 500);
    }, 3000);
  },

  /**
   * Applies the theme from the store to the body.
   * @param {string} theme - 'dark' or 'light'
   */
  applyTheme: (theme) => {
    document.body.className = `${theme}-theme`;
  },
};

// --- MAIN APPLICATION LOGIC ---
// This is where everything comes together.

const App = {
  /**
   * The main initialization function.
   * Runs when the app starts.
   */
  init: () => {
    Utils.log(`Booting ${APP_NAME} v${APP_VERSION}...`);

    // Subscribe to store changes to update UI
    AppStore.subscribe((state) => {
      UIModule.updateNavbar(state.currentUser);
      UIModule.renderPosts(state.posts);
      UIModule.applyTheme(state.currentTheme);
    });

    // Add global event listeners
    this.addEventListeners();

    // Check for existing user session
    this.checkSession();

    // Load initial data
    this.loadInitialPosts();

    // Set theme from cookie or default
    const savedTheme = Utils.getCookie("theme") || "dark";
    AppStore.dispatch("SET_THEME", savedTheme);

    Utils.log("Application initialized successfully.");
  },

  /**
   * Adds all the global event listeners for the app.
   */
  addEventListeners: () => {
    Utils.log("Attaching event listeners...");

    // Login form submission
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", this.handleLogin);
    }

    // Logout button
    const logoutButton = document.getElementById("logout-button");
    if (logoutButton) {
      logoutButton.addEventListener("click", this.handleLogout);
    }
    
    // Theme toggle button
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
        themeToggle.addEventListener('click', this.handleThemeToggle);
    }

    // Post submission
    const postForm = document.getElementById("post-form");
    if (postForm) {
      postForm.addEventListener("submit", this.handlePostSubmit);
    }
  },

  /**
   * Checks for an existing user session token.
   */
  checkSession: async () => {
    const token = Utils.getCookie("auth_token");
    if (token) {
      Utils.log("Found existing auth token.");
      APIService.setAuthToken(token);
      try {
        const user = await APIService.get("/auth/me");
        AppStore.dispatch("SET_USER", user);
        UIModule.showToast("Welcome back!", "success");
      } catch (error) {
        Utils.log("Token invalid, clearing session.");
        this.handleLogout(); // Token is bad, so log out
      }
    } else {
      Utils.log("No user session found.");
    }
  },

  /**
   * Loads the initial list of posts.
   */
  loadInitialPosts: async () => {
    try {
      const posts = await APIService.get("/posts");
      // Add fake author names for demo
      const postsWithAuthors = posts.map(p => ({...p, authorName: `User ${p.userId}`}));
      AppStore.dispatch("SET_POSTS", postsWithAuthors);
    } catch (error) {
      UIModule.showError("Could not load posts.");
    }
  },

  /**
   * Handles the login form submission.
   * @param {Event} e - The form submit event
   */
  handleLogin: async (e) => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;

    if (!Utils.validateEmail(email)) {
      UIModule.showError("Invalid email address.");
      return;
    }

    try {
      const data = await APIService.post("/auth/login", { email, password });
      AppStore.dispatch("SET_USER", data.user);
      APIService.setAuthToken(data.token);
      Utils.setCookie("auth_token", data.token, 7);
      UIModule.showToast("Login successful!", "success");
    } catch (error) {
      UIModule.showError("Login failed: " + error.message);
    }
  },

  /**
   * Handles user logout.
   */
  handleLogout: () => {
    AppStore.dispatch("CLEAR_USER");
    APIService.clearAuthToken();
    Utils.deleteCookie("auth_token");
    UIModule.showToast("Logged out.", "info");
  },

  /**
   * Handles new post submission.
   * @param {Event} e - The form submit event
   */
  handlePostSubmit: async (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const body = e.target.body.value;
    const user = AppStore.getState().currentUser;

    if (!user) {
      UIModule.showError("You must be logged in to post.");
      return;
    }

    if (!title || !body) {
      UIModule.showError("Title and body cannot be empty.");
      return;
    }

    try {
      const newPost = await APIService.post("/posts", { title, body, userId: user.id });
      // Add fake author info
      const postWithAuthor = {...newPost, authorName: user.username};
      AppStore.dispatch("ADD_POST", postWithAuthor);
      UIModule.showToast("Post created!", "success");
      // Clear the form
      e.target.reset();
    } catch (error) {
      UIModule.showError("Failed to create post.");
    }
  },
  
  /**
   * Toggles the theme between dark and light.
   */
  handleThemeToggle: () => {
      const currentTheme = AppStore.getState().currentTheme;
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      AppStore.dispatch('SET_THEME', newTheme);
      Utils.setCookie('theme', newTheme, 365);
      Utils.log(`Theme changed to ${newTheme}`);
  },

  /**
   * Placeholder for viewing a single post.
   * @param {number} postId - The ID of the post to view
   */
  handleViewPost: (postId) => {
    Utils.log(`Viewing post ${postId}`);
    // TODO: Implement single post view logic
    // Maybe fetch the post and show it in a modal
    const post = AppStore.getState().posts.find(p => p.id === postId);
    if (post) {
      UIModule.renderModal(
        post.title,
        `<p>${post.body}</p><small>By: ${post.authorName}</small>`
      );
    }
  },

  // --- More placeholder functions to fill space ---
  // --- These would be implemented in a real app ---

  loadAdminDashboard: () => {
    // TODO: Check if user is admin
    // TODO: Fetch admin stats from /admin/stats
    // TODO: Render a chart using Chart.js
    Utils.log("Placeholder: Loading admin dashboard");
  },

  initChatModule: () => {
    if (!FEATURE_FLAGS.enableChat) return;
    // TODO: Connect to WebSocket server
    // TODO: Add listeners for 'message' event
    // TODO: Render chat window
    Utils.log("Placeholder: Initializing chat module");
  },

  processPayment: (paymentData) => {
    if (!FEATURE_FLAGS.enablePayments) {
      UIModule.showError("Payments are not enabled.");
      return;
    }
    // TODO: Send paymentData to /payments/charge
    // TODO: Handle Stripe.js response
    Utils.log("Placeholder: Processing payment");
  },

  fetchUserNotifications: () => {
    // TODO: Fetch from /notifications
    // TODO: Dispatch("SET_NOTIFICATIONS", data)
    Utils.log("Placeholder: Fetching notifications");
  },

  updateUserProfile: (profileData) => {
    // TODO: PUT to /users/me
    // TODO: Update user in store
    Utils.log("Placeholder: Updating user profile");
  },
  
  validateRegistrationForm: () => {
    // TODO: Add complex validation logic
    Utils.log("Placeholder: Validating registration form");
  },
  
  loadCommentsForPost: (postId) => {
    // TODO: GET /posts/{postId}/comments
    // TODO: Render comments under the post
    Utils.log(`Placeholder: Loading comments for post ${postId}`);
  },
  
  deleteUserAccount: () => {
    // TODO: Show "Are you sure?" modal
    // TODO: DELETE /users/me
    // TODO: Force logout
    Utils.log("Placeholder: Deleting user account");
  },
};

// --- APP ENTRY POINT ---
// Start the app when the DOM is ready.

document.addEventListener("DOMContentLoaded", App.init);

// --- End of File ---
// Line count: 600+
// Whew, that's a lot of code.
