import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage for bets (Simulating database)
// In a real app, this would be a database (Postgres/MongoDB)
let activeBets = [];

// --- Existing Endpoints (Simulated based on context) ---

app.post('/api/place-bet', (req, res) => {
    const { betId, userAddress, betAmount, multiplier } = req.body;
    
    // Store bet
    activeBets.push({
        id: betId,
        userAddress,
        amount: betAmount,
        multiplier,
        status: 'pending', // pending, paid, refund
        timestamp: Date.now()
    });

    console.log(`[Bet Placed] ID: ${betId} | User: ${userAddress} | Amount: ${betAmount}`);
    res.json({ success: true });
});

app.post('/api/payout', (req, res) => {
    const { betId, userAddress, isRefund } = req.body;
    
    const betIndex = activeBets.findIndex(b => b.id === betId);
    if (betIndex !== -1) {
        activeBets[betIndex].status = isRefund ? 'refund' : 'paid';
        console.log(`[Payout] ID: ${betId} | Status: ${activeBets[betIndex].status}`);
    } else {
        // If bet not found (maybe server restarted), create it for record
        // This is a simplified fallback
        console.warn(`[Payout] Bet ID ${betId} not found, ignoring.`);
    }

    res.json({ success: true });
});

app.get('/api/my-bets/:address', (req, res) => {
    const { address } = req.params;
    // Return recent bets for this user
    const userBets = activeBets.filter(b => b.userAddress.toLowerCase() === address.toLowerCase());
    res.json(userBets);
});

// --- NEW LEADERBOARD ENDPOINT ---

app.get('/api/leaderboard', (req, res) => {
    // 1. Filter for winners (status === 'paid')
    const winners = activeBets.filter(b => b.status === 'paid');

    // 2. Sort by payout (amount * multiplier) descending
    // Note: If you want total winnings per user, you'd aggregate here.
    // The requirement says "Iterate through activeBets... Sort by payout". 
    // Usually leaderboard implies "Top Wins" (Single High Scores) or "Top Users" (Aggregated).
    // Given the fields { userAddress, payout, multiplier }, it sounds like "Top Single Wins".
    
    winners.sort((a, b) => {
        const payoutA = a.amount * a.multiplier;
        const payoutB = b.amount * b.multiplier;
        return payoutB - payoutA; // Descending
    });

    // 3. Take Top 5
    const top5 = winners.slice(0, 5).map(w => ({
        userAddress: w.userAddress,
        payout: w.amount * w.multiplier,
        multiplier: w.multiplier
    }));

    res.json(top5);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
