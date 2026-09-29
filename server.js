const express = require('express');
const app = express();
app.use(express.json());

// Example in-memory database or user store (replace with your actual database/JSON file logic)
// Make sure new registrations default to balance: 0
const users = []; // or your db connection

// 1. REGISTRATION ROUTE (Default balance = 0)
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // Check if user exists...
  const newUser = {
    id: Date.now().toString(),
    username,
    email,
    password,
    balance: 0 // <--- FIXED: Set default balance to 0 (was 100)
  };
  
  users.push(newUser);
  res.json({ success: true, message: 'Registered successfully', user: { id: newUser.id, username, balance: newUser.balance } });
});

// 2. MULTI-CRYPTO HASH VERIFICATION FUNCTION
function validateTransactionHash(hash, currency) {
  if (!hash || typeof hash !== 'string') return false;
  const cleanHash = hash.trim();

  switch (currency.toUpperCase()) {
    case 'BTC':
      // Bitcoin TXID: 64 characters hex
      return /^[a-fA-F0-9]{64}$/.test(cleanHash);

    case 'SOL':
      // Solana Signature: ~87-88 characters Base58
      return /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(cleanHash);

    case 'ETH':
    case 'USDT_ERC20':
      // EVM (Ethereum/USDT): 66 characters starting with 0x
      return /^0x[a-fA-F0-9]{64}$/.test(cleanHash);

    case 'TRX':
    case 'USDT_TRC20':
      // Tron (USDT): 64 characters hex
      return /^[a-fA-F0-9]{64}$/.test(cleanHash);

    default:
      // Fallback generic check
      return /^([a-fA-F0-9]{64}|0x[a-fA-F0-9]{64})$/.test(cleanHash);
  }
}

// Example deposit route using the multi-crypto validator
app.post('/api/deposit', (req, res) => {
  const { userId, hash, currency } = req.body;
  
  if (!validateTransactionHash(hash, currency)) {
    return res.status(400).json({ success: false, message: 'Invalid transaction hash format for ' + currency });
  }

  // Process deposit...
  res.json({ success: true, message: 'Deposit hash verified successfully!' });
});

// 3. WIN/LOSS GAME ROUTE (Real-time balance updater)
app.post('/api/game/action', (req, res) => {
  const { userId, betAmount, outcome } = req.body; // outcome: 'win' or 'loss'
  
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (outcome === 'win') {
    user.balance += Number(betAmount); // Add winnings
  } else if (outcome === 'loss') {
    user.balance -= Number(betAmount); // Subtract loss
    if (user.balance < 0) user.balance = 0;
  }

  // CRITICAL: Return the updated balance immediately so frontend updates without relogin
  res.json({
    success: true,
    newBalance: user.balance,
    message: `Game processed successfully`
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));
