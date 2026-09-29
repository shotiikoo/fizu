// Function to update main site status
function checkStatus() {
    const statusText = document.getElementById('status-text');
    if (statusText) {
        statusText.innerText = "Checking...";
        setTimeout(() => {
            statusText.innerText = "🟢 All Systems Operational";
        }, 600);
    }
}

// CTA Button Listener
document.addEventListener('DOMContentLoaded', () => {
    const ctaBtn = document.getElementById('cta-btn');
    if (ctaBtn) {
        ctaBtn.addEventListener('click', () => {
            alert('Welcome! Your interactive frontend scripts are connected.');
        });
    }

    // Auto check status on main load
    if (document.getElementById('status-text')) {
        checkStatus();
    }
});

// Admin Panel Functions
function addNewLog() {
    const tbody = document.getElementById('logs-table-body');
    if (!tbody) return;

    const randomId = Math.floor(1000 + Math.random() * 9000);
    const now = new Date();
    const timeStr = `Today, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td>#${randomId}</td>
        <td>Admin Action Event</td>
        <td><span class="badge success">Success</span></td>
        <td>${timeStr}</td>
        <td><button onclick="deleteRow(this)" class="btn sm-btn danger-btn">Delete</button></td>
    `;
    
    tbody.prepend(newRow);
}

function deleteRow(button) {
    const row = button.closest('tr');
    if (row) {
        row.remove();
    }
}

function logoutAdmin() {
    if (confirm("Are you sure you want to log out of the admin panel?")) {
        window.location.href = "index.html";
    }
}