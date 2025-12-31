import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Wallet, TrendingUp, TrendingDown, Zap, Target } from 'lucide-react';

const UIOverlay: React.FC = () => {
  const { currentPrice, balance, betAmount, setBetAmount, lastWinAmount, setLastWinAmount } = useGameStore();
  const [showWin, setShowWin] = useState(false);
  const [prevPrice, setPrevPrice] = useState(0);

  // Win Notification
  useEffect(() => {
    if (lastWinAmount > 0) {
      setShowWin(true);
      const t = setTimeout(() => {
        setShowWin(false);
        setLastWinAmount(0);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [lastWinAmount, setLastWinAmount]);

  // Price Trend
  useEffect(() => {
    setPrevPrice(currentPrice);
  }, [currentPrice]);

  const trend = currentPrice >= prevPrice ? 'up' : 'down';
  const trendColor = trend === 'up' ? '#00ff9d' : '#ff3b30';

  // Formatters
  const fmtPrice = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const fmtBalance = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="ui-overlay">
      {/* --- Top Left: Price Widget --- */}
      <div className="widget-panel top-left">
        <div className="panel-row">
          <div className="icon-box">
            <Target size={20} color="#fff" />
          </div>
          <div className="col">
            <span className="label">ETH / USDT</span>
            <div className="value-row">
              <span className="value-lg" style={{ color: trendColor }}>
                {fmtPrice(currentPrice)}
              </span>
              {trend === 'up' ? 
                <TrendingUp size={16} color={trendColor} /> : 
                <TrendingDown size={16} color={trendColor} />
              }
            </div>
          </div>
        </div>
      </div>

      {/* --- Win Popup --- */}
      <div className={`win-popup ${showWin ? 'active' : ''}`}>
        <div className="win-content">
          <Zap size={32} fill="#ffd700" stroke="#ffd700" />
          <div className="col">
            <span className="win-title">BIG WIN!</span>
            <span className="win-amount">+{fmtBalance(lastWinAmount)}</span>
          </div>
        </div>
      </div>

      {/* --- Bottom Left: Balance --- */}
      <div className="widget-panel bottom-left">
        <div className="panel-row">
          <div className="icon-box wallet">
            <Wallet size={20} color="#000" />
          </div>
          <div className="col">
            <span className="label">BALANCE</span>
            <span className="value-md">{fmtBalance(balance)}</span>
          </div>
        </div>
      </div>

      {/* --- Bottom Right: Bet Selector --- */}
      <div className="widget-panel bottom-right">
        <span className="label-center">BET AMOUNT</span>
        <div className="bet-grid">
          {[1, 5, 10, 25, 50, 100].map(amt => (
            <button 
              key={amt}
              className={`bet-btn ${betAmount === amt ? 'active' : ''}`}
              onClick={() => setBetAmount(amt)}
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
