// --- AUTHENTICATION & STORAGE LOGIC ---

// Handle Registration
function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    let users = JSON.parse(localStorage.getItem('platform_users')) || [];
    
    // Check if email exists
    if(users.some(u => u.email === email)) {
        alert('An account with this email already exists!');
        return;
    }

    // Save new user with initial balance
    users.push({ username, email, password, balance: 0, usedHashes: [] });
    localStorage.setItem('platform_users', JSON.stringify(users));
    
    // Auto log them in
    localStorage.setItem('active_user', email);
    window.location.href = 'dashboard.html';
}

// Handle Login
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    let users = JSON.parse(localStorage.getItem('platform_users')) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if(!user) {
        alert('Invalid email or password!');
        return;
    }

    localStorage.setItem('active_user', email);
    window.location.href = 'dashboard.html';
}

// Log out user
function logoutUser() {
    localStorage.removeItem('active_user');
    window.location.href = 'login.html';
}

// Log out admin
function logoutAdmin() {
    window.location.href = 'index.html';
}


// --- DASHBOARD & HASH VERIFICATION LOGIC ---

document.addEventListener('DOMContentLoaded', () => {
    const activeEmail = localStorage.getItem('active_user');
    const path = window.location.pathname;

    // Protect Dashboard route
    if (path.includes('dashboard.html')) {
        if (!activeEmail) {
            window.location.href = 'login.html';
            return;
        }
        updateDashboardUI();
    }

    // Protect or load Admin metrics if on admin page
    if (path.includes('alexmaritn331616.html')) {
        let users = JSON.parse(localStorage.getItem('platform_users')) || [];
        const userCountEl = document.getElementById('admin-user-count');
        if(userCountEl) userCountEl.innerText = users.length;
    }

    // Update navbar on index if logged in
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

function updateDashboardUI() {
    const activeEmail = localStorage.getItem('active_user');
    let users = JSON.parse(localStorage.getItem('platform_users')) || [];
    const user = users.find(u => u.email === activeEmail);

    if (user) {
        document.getElementById('user-display').innerText = `👤 ${user.username}`;
        document.getElementById('user-balance').innerText = `$${user.balance.toFixed(2)}`;
    }
}

// Automated Hash ID Deposit Checker Simulation
function verifyDepositHash() {
    const hashInput = document.getElementById('tx-hash-input');
    const statusEl = document.getElementById('deposit-status');
    const txHash = hashInput.value.trim();

    if (!txHash) {
        statusEl.style.color = 'var(--danger)';
        statusEl.innerText = 'Please enter a valid transaction hash ID.';
        return;
    }

    statusEl.style.color = 'var(--warning)';
    statusEl.innerText = 'Checking blockchain network...';

    setTimeout(() => {
        let users = JSON.parse(localStorage.getItem('platform_users')) || [];
        const activeEmail = localStorage.getItem('active_user');
        let userIndex = users.findIndex(u => u.email === activeEmail);

        if (userIndex === -1) return;

        // Ensure user has array for tracking used hashes
        if (!users[userIndex].usedHashes) {
            users[userIndex].usedHashes = [];
        }

        // Prevent double spending / re-using same hash
        if (users[userIndex].usedHashes.includes(txHash)) {
            statusEl.style.color = 'var(--danger)';
            statusEl.innerText = '❌ Error: This transaction hash has already been processed.';
            return;
        }

        // Simulate a successful verification credit (e.g., adding $50.00 standard test deposit)
        const depositAmount = 50.00;
        users[userIndex].balance += depositAmount;
        users[userIndex].usedHashes.push(txHash);

        // Save back to localStorage
        localStorage.setItem('platform_users', JSON.stringify(users));

        statusEl.style.color = 'var(--success)';
        statusEl.innerText = `✅ Success! Transaction verified. Credited $${depositAmount.toFixed(2)} to your balance.`;
        hashInput.value = '';
        
        updateDashboardUI();
    }, 1200);
}
