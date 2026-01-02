import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. In-Memory Storage & Types ---
interface BetData {
  betId: string;
  userAddress: string;
  amount: number;
  multiplier: number;
  status: 'pending' | 'active' | 'paid' | 'invalid';
  expiryTime: number;
}

// Map<betId, BetData>
const activeBets = new Map<string, BetData>();

// --- 2. Endpoints ---

// A. Place Bet Snapshot
app.post('/api/place-bet', (req, res) => {
  try {
    const { betId, userAddress, betAmount, multiplier } = req.body;

    if (!betId || !userAddress || !betAmount || !multiplier) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // STRICT RULE: Store the multiplier sent by client at moment of click.
    // DO NOT recalculate it.
    const betData: BetData = {
      betId,
      userAddress,
      amount: Number(betAmount),
      multiplier: Number(multiplier),
      status: 'active', // Considered active once placed for this simple implementation
      expiryTime: Date.now() + (60 * 1000) // 1 minute expiry just in case
    };

    activeBets.set(betId, betData);

    console.log(`[BET PLACED] ID: ${betId} | Amt: ${betAmount} | Multi: ${multiplier}x`);
    res.status(200).json({ success: true, message: 'Bet recorded' });

  } catch (err) {
    console.error('[PLACE BET ERROR]', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// B. Secure Payout
app.post('/api/payout', async (req, res) => {
  try {
    const { betId, userAddress } = req.body;

    // 1. Validation
    const bet = activeBets.get(betId);
    if (!bet) {
      return res.status(404).json({ error: 'Bet not found' });
    }

    if (bet.userAddress !== userAddress) {
      return res.status(403).json({ error: 'User mismatch' });
    }

    if (bet.status === 'paid') {
      return res.status(400).json({ error: 'Bet already paid' });
    }

    if (bet.status === 'invalid') {
        return res.status(400).json({ error: 'Bet is invalid' });
    }

    // 2. Calculate Reward using STORED multiplier
    const reward = bet.amount * bet.multiplier;

    // 3. Process Payout (Simulation)
    console.log(`[PAYOUT] Processing for ${betId}...`);
    console.log(` -> Stored Multiplier: ${bet.multiplier}x`);
    console.log(` -> Stored Amount: ${bet.amount}`);
    console.log(` -> Payout Reward: ${reward}`);

    // ... Blockchain Interaction logic would go here ...

    // 4. Update State (Prevent Double Spend)
    bet.status = 'paid';
    activeBets.set(betId, bet);

    res.status(200).json({ success: true, txHash: '0xSIMULATED_PAYOUT_HASH', amount: reward });

  } catch (err) {
    console.error('[PAYOUT ERROR]', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
