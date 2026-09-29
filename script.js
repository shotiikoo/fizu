async function verifyDepositHash() {
    const txHash = document.getElementById('tx-hash-input').value.trim();
    const statusEl = document.getElementById('deposit-status');

    if (!txHash || txHash.length < 15) {
        statusEl.style.color = 'var(--danger)';
        statusEl.innerText = 'Please enter a valid transaction hash ID.';
        return;
    }

    statusEl.style.color = 'var(--text-secondary)';
    statusEl.innerText = 'Checking transaction on-chain...';

    try {
        const response = await fetch('/api/verify-deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHash })
        });
        const data = await response.json();

        if (response.ok && data.success) {
            statusEl.style.color = 'var(--success)';
            statusEl.innerText = `Success! Credited $${data.amount.toFixed(2)} to your balance.`;
            document.getElementById('user-balance').innerText = `$${data.newBalance.toFixed(2)}`;
            document.getElementById('tx-hash-input').value = '';
        } else {
            statusEl.style.color = 'var(--danger)';
            statusEl.innerText = data.message || 'Transaction could not be verified or was already claimed.';
        }
    } catch (err) {
        statusEl.style.color = 'var(--danger)';
        statusEl.innerText = 'Server error verifying transaction. Please try again later.';
    }
}
