// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginUsername = document.getElementById('login-username');
const loginPassword = document.getElementById('login-password');
const registerUsername = document.getElementById('register-username');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');

// API Endpoints
const API = {
    login: '/api/Auth/login',
    register: '/api/auth/register'
};

// Utility Functions
const showError = (element, message) => {
    const errorElement = document.createElement('div');
    errorElement.className = 'error';
    errorElement.textContent = message;
    element.classList.add('error-border');
    element.parentNode.insertBefore(errorElement, element.nextSibling);
};

const clearErrors = () => {
    document.querySelectorAll('.error').forEach(el => el.remove());
    document.querySelectorAll('.error-border').forEach(el => el.classList.remove('error-border'));
};

const setLoading = (button, isLoading) => {
    if (isLoading) {
        button.innerHTML = '<span class="spinner"></span> Processing...';
        button.disabled = true;
    } else {
        button.innerHTML = button.dataset.originalText;
        button.disabled = false;
    }
};

const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Auth Functions
async function login() {
    clearErrors();
    const username = loginUsername.value.trim();
    const password = loginPassword.value;
    const loginBtn = document.querySelector('#login-form button');

    // Store original button text
    loginBtn.dataset.originalText = loginBtn.innerHTML;

    // Basic validation
    if (!username) {
        showError(loginUsername, 'Username is required');
        return;
    }
    if (!password) {
        showError(loginPassword, 'Password is required');
        return;
    }

    setLoading(loginBtn, true);

    try {
        const response = await fetch(API.login, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email: "", passwordHash: password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Invalid username or password');
        }

        const data = await response.json();

        if (!data.token) {
            throw new Error('Authentication token not received');
        }

        // Store authentication data
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', username);

        // Redirect to dashboard
        window.location.href = 'index.html';

    } catch (error) {
        showError(loginPassword, error.message);
        console.error('Login error:', error);
    } finally {
        setLoading(loginBtn, false);
    }
}

async function register() {
    clearErrors();
    const username = registerUsername.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const registerBtn = document.querySelector('#register-form button');

    // Store original button text
    registerBtn.dataset.originalText = registerBtn.innerHTML;

    // Validation
    let isValid = true;

    if (!username) {
        showError(registerUsername, 'Username is required');
        isValid = false;
    } else if (username.length < 3) {
        showError(registerUsername, 'Username must be at least 3 characters');
        isValid = false;
    }

    if (!email) {
        showError(registerEmail, 'Email is required');
        isValid = false;
    } else if (!validateEmail(email)) {
        showError(registerEmail, 'Please enter a valid email');
        isValid = false;
    }

    if (!password) {
        showError(registerPassword, 'Password is required');
        isValid = false;
    } else if (password.length < 6) {
        showError(registerPassword, 'Password must be at least 6 characters');
        isValid = false;
    }

    if (!isValid) return;

    setLoading(registerBtn, true);

    try {
        const response = await fetch(API.register, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, passwordHash: password })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Registration failed');
        }

        alert('Registration successful! Please login.');
        showLogin();

    } catch (error) {
        showError(registerPassword, error.message);
        console.error('Registration error:', error);
    } finally {
        setLoading(registerBtn, false);
    }
}

// Form Toggle Functions
function showRegister() {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    clearErrors();
    window.history.pushState(null, null, '#register');
}

function showLogin() {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    clearErrors();
    window.history.pushState(null, null, '#login');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Check URL hash on load
    if (window.location.hash === '#register') {
        showRegister();
    } else {
        showLogin();
    }

    // Form submissions
    document.querySelector('#login-form button').addEventListener('click', login);
    document.querySelector('#register-form button').addEventListener('click', register);

    // Toggle links
    document.querySelector('#login-form a').addEventListener('click', (e) => {
        e.preventDefault();
        showRegister();
    });
    document.querySelector('#register-form a').addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });

    // Handle Enter key
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (loginForm.contains(input)) login();
                if (registerForm.contains(input)) register();
            }
        });
    });
});