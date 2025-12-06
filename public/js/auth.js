// Authentication Logic
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token && window.location.pathname === '/') {
        // Redirect to appropriate dashboard
        redirectToDashboard();
    }

    // Tab switching
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;

            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabName}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });

    // Login form handler
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form handler
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
});

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const messageEl = document.getElementById('login-message');

    try {
        messageEl.innerHTML = '<div class="alert alert-info">Signing in...</div>';

        const response = await api.login(email, password);

        if (response.success && response.token) {
            // Store token and user info
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));

            messageEl.innerHTML = '<div class="alert alert-success">Login successful! Redirecting...</div>';

            // Redirect based on role
            setTimeout(() => {
                redirectToDashboard(response.user.role);
            }, 500); // Reduced delay
        } else {
            messageEl.innerHTML = '<div class="alert alert-error">Login failed. Please check your credentials.</div>';
        }
    } catch (error) {
        console.error('Login error:', error);
        messageEl.innerHTML = `<div class="alert alert-error">${error.message || 'Login failed. Please check your credentials.'}</div>`;
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const phone = document.getElementById('register-phone').value;
    const password = document.getElementById('register-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    const messageEl = document.getElementById('register-message');

    // Validation
    if (password.length < 6) {
        messageEl.innerHTML = '<div class="alert alert-error">Password must be at least 6 characters long.</div>';
        return;
    }

    try {
        messageEl.innerHTML = '<div class="alert alert-info">Creating your account...</div>';

        const response = await api.register(name, email, password, role, phone);

        if (response.success) {
            messageEl.innerHTML = '<div class="alert alert-success">Account created successfully! Redirecting...</div>';

            // Store user info
            localStorage.setItem('user', JSON.stringify(response.user));

            // Redirect based on role
            setTimeout(() => {
                redirectToDashboard(response.user.role);
            }, 1000);
        }
    } catch (error) {
        messageEl.innerHTML = `<div class="alert alert-error">${error.message || 'Registration failed. Please try again.'}</div>`;
    }
}

// Redirect to appropriate dashboard
async function redirectToDashboard(role = null) {
    if (!role) {
        try {
            const response = await api.getCurrentUser();
            if (response.success && response.user) {
                role = response.user.role;
                localStorage.setItem('user', JSON.stringify(response.user));
            }
        } catch (error) {
            // Token invalid, logout
            api.logout();
            return;
        }
    }

    switch (role) {
        case 'student':
            window.location.href = '/student/dashboard.html';
            break;
        case 'professor':
            window.location.href = '/professor/dashboard.html';
            break;
        case 'admin':
            window.location.href = '/admin/dashboard.html';
            break;
        default:
            window.location.href = '/';
    }
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return null;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user;
}

// Logout function
function logout() {
    api.logout();
}

// Expose to window
window.checkAuth = checkAuth;
window.logout = logout;
