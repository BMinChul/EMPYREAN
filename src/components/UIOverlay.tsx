import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Wallet, Coins, ArrowDown, ArrowUp, Zap } from 'lucide-react';

const UIOverlay: React.FC = () => {
  const { currentPrice, balance, betAmount, setBetAmount, lastWinAmount, setLastWinAmount } = useGameStore();
  const [showWin, setShowWin] = useState(false);
  const [priceTrend, setPriceTrend] = useState<'up' | 'down'>('down');
  const [lastPrice, setLastPrice] = useState(0);

  // Detect Trend
  useEffect(() => {
    if (currentPrice > lastPrice) setPriceTrend('up');
    else if (currentPrice < lastPrice) setPriceTrend('down');
    setLastPrice(currentPrice);
  }, [currentPrice]);

  // Strict Formatting Helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatPrice = (val: number) => {
    // Force $0,000.00 format
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Win Notification Logic
  useEffect(() => {
    if (lastWinAmount > 0) {
      setShowWin(true);
      const timer = setTimeout(() => {
        setShowWin(false);
        setLastWinAmount(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastWinAmount, setLastWinAmount]);

  return (
    <div className="ui-overlay">
      {/* --- Top Left: Price Widget --- */}
      <div className="glass-panel price-widget">
        <div className="icon-circle">
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 32C7.163 32 0 24.837 0 16S7.163 0 16 0s16 7.163 16 16-7.163 16-16 16zm7.994-15.781L16.498 4 9 16.22l7.498 4.353 7.496-4.354zM24 17.616l-7.502 4.351L9 17.617l7.498 10.378L24 17.616z" fill="#fff"/>
          </svg>
        </div>
        <div className="info-col">
          <span className="label">ETH/USDT</span>
          <div className={`value-row ${priceTrend}`}>
            <span className="price">{formatPrice(currentPrice)}</span>
            {priceTrend === 'up' ? <ArrowUp size={16} color="#4cd964" /> : <ArrowDown size={16} color="#ff3b30" />}
          </div>
        </div>
      </div>

      {/* --- Center Top: Win Notification --- */}
      <div className={`win-popup ${showWin ? 'visible' : ''}`}>
        <div className="win-glow" />
        <div className="win-content">
          <Zap size={24} fill="#FFD700" stroke="#FFD700" />
          <div className="win-text">
            <span className="win-label">YOU WON</span>
            <span className="win-amount">{formatCurrency(lastWinAmount)}</span>
          </div>
        </div>
      </div>

      {/* --- Bottom Left: Balance --- */}
      <div className="glass-panel balance-widget">
        <div className="icon-circle wallet-icon">
          <Wallet size={20} color="#64ffda" />
        </div>
        <div className="info-col">
          <span className="label">BALANCE</span>
          <span className="balance-value">{formatCurrency(balance)}</span>
        </div>
      </div>

      {/* --- Bottom Right: Bet Selector --- */}
      <div className="glass-panel bet-widget">
        <div className="icon-circle coins-icon">
          <Coins size={20} color="#ffd700" />
        </div>
        <div className="bet-controls">
          <span className="label">BET AMOUNT</span>
          <div className="bet-buttons">
            {[1, 5, 10, 25].map((amount) => (
              <button
                key={amount}
                className={`bet-btn ${betAmount === amount ? 'active' : ''}`}
                onClick={() => setBetAmount(amount)}
              >
                ${amount}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
