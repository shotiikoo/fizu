const express = require('express');
const app = express();

// Middleware
app.use(express.json());
// Serves your index.html and static frontend files correctly from the root folder
app.use(express.static(__dirname));

// Temporary in-memory database storage (Replace with your actual database if you have one)
const users = [];

// 1. REGISTRATION ROUTE (Default balance is now 0)
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  
  const newUser = {
    id: Date.now().toString(),
    username,
    email,
    password,
    balance: 0 // FIXED: Default registration balance is now 0 (was 100)
  };
  
  users.push(newUser);
  res.json({ 
    success: true, 
    message: 'Registered successfully', 
    user: { id: newUser.id, username, balance: newUser.balance } 
  });
});

// 2. MULTI-CRYPTO HASH VERIFICATION FUNCTION (BTC, SOL, ETH/USDT, TRX/USDT)
function validateTransactionHash(hash, currency) {
  if (!hash || typeof hash !== 'string') return false;
  const cleanHash = hash.trim();

  switch (currency ? currency.toUpperCase() : 'BTC') {
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
      // Fallback check
      return /^([a-fA-F0-9]{64}|0x[a-fA-F0-9]{64})$/.test(cleanHash);
  }
}

// Deposit verification route
app.post('/api/deposit', (req, res) => {
  const { hash, currency } = req.body;
  
  if (!validateTransactionHash(hash, currency)) {
    return res.status(400).json({ success: false, message: 'Invalid transaction hash format' });
  }

  res.json({ success: true, message: 'Transaction hash verified!' });
});

// 3. WIN/LOSS GAME ROUTE (Real-time balance updater)
app.post('/api/game/action', (req, res) => {
  const { userId, betAmount, outcome } = req.body; // outcome: 'win' or 'loss'
  
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (outcome === 'win') {
    user.balance += Number(betAmount);
  } else if (outcome === 'loss') {
    user.balance -= Number(betAmount);
    if (user.balance < 0) user.balance = 0;
  }

  // CRITICAL: Sends the updated balance back immediately so frontend updates instantly
  res.json({
    success: true,
    newBalance: user.balance,
    message: 'Balance updated successfully'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
