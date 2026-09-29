// Register API Handler
async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        localStorage.setItem('active_email', data.user.email);
        window.location.href = 'dashboard.html';
    } catch (err) {
        alert('Network error during registration.');
    }
}

// Login API Handler
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (!data.success) {
            alert(data.message);
            return;
        }

        localStorage.setItem('active_email', data.user.email);
        window.location.href = 'dashboard.html';
    } catch (err) {
        alert('Network error during login.');
    }
}

function logoutUser() {
    localStorage.removeItem('active_email');
    window.location.href = 'login.html';
}

// Page initialization & routing checks
document.addEventListener('DOMContentLoaded', async () => {
    const activeEmail = localStorage.getItem('active_email');
    const path = window.location.pathname;

    if (path.includes('dashboard.html')) {
        if (!activeEmail) {
            window.location.href = 'login.html';
            return;
        }
        fetchUserData(activeEmail);
    }

    if (path.includes('alexmaritn331616.html')) {
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            if (data.success) {
                document.getElementById('admin-user-count').innerText = data.totalUsers;
            }
        } catch (e) {
            document.getElementById('admin-user-count').innerText = 'Error';
        }
    }

    if (path.includes('index.html') || path === '/' || path.endsWith('/')) {
        const navMenu = document.getElementById('nav-menu');
        if (navMenu && activeEmail) {
            navMenu.innerHTML = `
                <a href="index.html" class="active">Home</a>
                <a href="dashboard.html" class="btn sm-btn primary-btn" style="color:white; margin-left:1rem;">Dashboard</a>
            `;
        }
    }
});

async function fetchUserData(email) {
    try {
        const res = await fetch(`/api/user/${email}`);
        const data = await res.json();
        if (data.success) {
            document.getElementById('user-display').innerText = `👤 ${data.user.username}`;
            document.getElementById('user-balance').innerText = `$${parseFloat(data.user.balance).toFixed(2)}`;
        } else {
            logoutUser();
        }
    } catch (e) {
        console.error('Failed to fetch user data');
    }
}

// Automated Hash Verification API Call
async function verifyDepositHash() {
    const hashInput = document.getElementById('tx-hash-input');
    const statusEl = document.getElementById('deposit-status');
    const txHash = hashInput.value.trim();
    const email = localStorage.getItem('active_email');

    if (!txHash) {
        statusEl.style.color = 'var(--danger)';
        statusEl.innerText = 'Please enter a valid transaction hash ID.';
        return;
    }

    statusEl.style.color = 'var(--warning)';
    statusEl.innerText = 'Querying database & blockchain...';

    try {
        const response = await fetch('/api/verify-deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, txHash })
        });
        const data = await response.json();

        if (!data.success) {
            statusEl.style.color = 'var(--danger)';
            statusEl.innerText = `❌ ${data.message}`;
            return;
        }

        statusEl.style.color = 'var(--success)';
        statusEl.innerText = `✅ ${data.message}`;
        hashInput.value = '';
        
        document.getElementById('user-balance').innerText = `$${parseFloat(data.user.balance).toFixed(2)}`;
    } catch (err) {
        statusEl.style.color = 'var(--danger)';
        statusEl.innerText = '❌ Network connection error.';
    }
}
