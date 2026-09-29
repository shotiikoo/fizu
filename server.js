const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

let users = [];

const DEPOSIT_ADDRESSES = {
    eth: "0x7cC7D071C3e1324DaF3370eFAb03a1a304298765".toLowerCase(),
    btc: "19xQ6qaNyrcyGtZPV6r42zS78Pn7SnSgou",
    sol: "5csZyW6JuHm4QsinaykoSEy9y1jB3sjGZjM6zdzDe5ii"
};

let processedHashes = new Set();

app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.json({ success: false, message: "All fields are required." });
    if (users.find(u => u.email === email)) return res.json({ success: false, message: "Email is already registered." });

    const newUser = { username, email, password, balance: 100.00 };
    users.push(newUser);
    return res.json({ success: true, user: { username, email, balance: newUser.balance } });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.json({ success: false, message: "Invalid email or password." });
    return res.json({ success: true, user: { username: user.username, email: user.email, balance: user.balance } });
});

app.get('/api/user/:email', (req, res) => {
    const user = users.find(u => u.email === req.params.email);
    if (!user) return res.json({ success: false });
    return res.json({ success: true, user: { username: user.username, email: user.email, balance: user.balance } });
});

app.post('/api/verify-deposit', async (req, res) => {
    const { email, txHash } = req.body;
    const cleanHash = txHash ? txHash.trim() : "";

    if (!cleanHash || !email) return res.json({ success: false, message: "Missing transaction hash or session." });
    if (processedHashes.has(cleanHash)) return res.json({ success: false, message: "This transaction hash has already been redeemed." });

    let confirmedAmountUSD = 0;
    let detectedNetwork = "";

    try {
        // 1. Check Bitcoin via Blockstream API
        try {
            const btcRes = await axios.get(`https://blockstream.info/api/tx/${cleanHash}`);
            const txData = btcRes.data;
            if (txData && txData.status && txData.status.confirmed) {
                for (let out of txData.vout) {
                    if (out.scriptpubkey_address === DEPOSIT_ADDRESSES.btc) {
                        const btcValue = out.value / 1e8;
                        confirmedAmountUSD = btcValue * 63000;
                        detectedNetwork = "Bitcoin (BTC)";
                        break;
                    }
                }
            }
        } catch (e) { /* Continue */ }

        // 2. Check Ethereum / ERC-20 via Blockchair Public API
        if (confirmedAmountUSD === 0) {
            try {
                const ethRes = await axios.get(`https://api.blockchair.com/ethereum/dashboards/transaction/${cleanHash}`);
                const txData = ethRes.data.data[cleanHash];
                if (txData && txData.transaction) {
                    const tx = txData.transaction;
                    if (tx.recipient && tx.recipient.toLowerCase() === DEPOSIT_ADDRESSES.eth) {
                        const ethValue = tx.value / 1e18;
                        confirmedAmountUSD = ethValue * 2650;
                        detectedNetwork = "Ethereum (ETH)";
                    }
                }
            } catch (e) { /* Continue */ }
        }

        // 3. Check Solana via Solana Mainnet Public RPC
        if (confirmedAmountUSD === 0) {
            try {
                const solRes = await axios.post('https://api.mainnet-beta.solana.com', {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "getTransaction",
                    params: [cleanHash, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }]
                });
                const solTx = solRes.data.result;
                if (solTx && solTx.meta && solTx.meta.err === null) {
                    confirmedAmountUSD = 50.00; // Credited upon successful Solana block confirmation
                    detectedNetwork = "Solana (SOL)";
                }
            } catch (e) { /* Continue */ }
        }

        if (confirmedAmountUSD <= 0) {
            return res.json({ 
                success: false, 
                message: "Transaction hash not found, unconfirmed, or sent to a different address." 
            });
        }

        const user = users.find(u => u.email === email);
        if (!user) return res.json({ success: false, message: "User session not found." });

        processedHashes.add(cleanHash);
        user.balance += confirmedAmountUSD;

        return res.json({
            success: true,
            message: `Confirmed on ${detectedNetwork}! Credited $${confirmedAmountUSD.toFixed(2)} to your balance.`,
            user: { balance: user.balance }
        });

    } catch (err) {
        console.error("Verification error:", err);
        return res.json({ success: false, message: "Failed to communicate with blockchain networks." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Casino Fizu server running on port ${PORT}`);
});
