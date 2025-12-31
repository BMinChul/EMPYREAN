import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Wallet, Coins, ArrowDown, Zap } from 'lucide-react';

const UIOverlay: React.FC = () => {
  const { currentPrice, balance, betAmount, setBetAmount, lastWinAmount, setLastWinAmount } = useGameStore();
  const [showWin, setShowWin] = useState(false);

  // Format Helpers
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatPrice = (val: number) => {
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
        setLastWinAmount(0); // Reset after hide
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastWinAmount, setLastWinAmount]);

  return (
    <div className="ui-overlay">
      {/* --- Top Left: Price Widget --- */}
      <div className="glass-panel price-widget">
        <div className="icon-circle">
          {/* Simple SVG ETH Icon */}
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 32C7.163 32 0 24.837 0 16S7.163 0 16 0s16 7.163 16 16-7.163 16-16 16zm7.994-15.781L16.498 4 9 16.22l7.498 4.353 7.496-4.354zM24 17.616l-7.502 4.351L9 17.617l7.498 10.378L24 17.616z" fill="#fff"/>
          </svg>
        </div>
        <div className="price-info">
          <span className="label">ETH/USDT</span>
          <div className="value-row">
            <span className="price">{formatPrice(currentPrice)}</span>
            <ArrowDown size={14} className="arrow-icon" />
          </div>
        </div>
      </div>

      {/* --- Top Center: Title --- */}
      <div className="game-title">
        euphoria
      </div>

      {/* --- Center Top: Win Notification --- */}
      <div className={`win-notification ${showWin ? 'visible' : ''}`}>
        <Zap size={20} fill="#FFD700" stroke="#FFD700" />
        <span>You won {formatCurrency(lastWinAmount)}</span>
      </div>

      {/* --- Bottom Left: Balance --- */}
      <div className="glass-panel balance-widget">
        <div className="icon-circle wallet-icon">
          <Wallet size={20} color="#fff" />
        </div>
        <div className="balance-info">
          <span className="label">BALANCE</span>
          <span className="balance-value">{formatCurrency(balance)}</span>
        </div>
      </div>

      {/* --- Bottom Right: Bet Selector --- */}
      <div className="glass-panel bet-widget">
        <div className="icon-circle coins-icon">
          <Coins size={20} color="#fff" />
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
