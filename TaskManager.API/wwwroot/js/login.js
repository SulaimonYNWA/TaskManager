async function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/Auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({username:username, email: "", passwordHash: password }) // Fix for password field name
        });

        if (!response.ok) {
            throw new Error('Invalid email or password');
        }

        const data = await response.json();
        // console.log("Login Response:", data); // Debugging

        if (data.token) {
            localStorage.setItem('token', data.token); // ✅ Store the token correctly
            window.location.href = 'index.html'; // Redirect to projects page
        } else {
            throw new Error('Token not received');
        }


        localStorage.setItem('token', data.token); // Fix for correct JSON key
        localStorage.setItem("username", username);
        alert('Login successful!');
        window.location.href = 'index.html'; // Redirect after login
    } catch (error) {
        alert(error.message);
    }
}

async function register() {
    const username = document.getElementById('register-username').value; // Added username field
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({username: username, email: email, passwordHash: password }) // Fix for password field
        });

        if (!response.ok) {
            throw new Error('Registration failed');
        }
      
        alert("Registration successful! You can now log in.");
        window.location.href = 'login.html'; // Redirect to login page after registration
    } catch (error) {
        alert(error.message);
    }
}

function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
}


