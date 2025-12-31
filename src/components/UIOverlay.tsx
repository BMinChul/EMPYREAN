import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Wallet, TrendingUp, TrendingDown, Zap, Target } from 'lucide-react';

const UIOverlay: React.FC = () => {
  const { currentPrice, balance, betAmount, setBetAmount, lastWinAmount, setLastWinAmount } = useGameStore();
  const [showWin, setShowWin] = useState(false);
  const [prevPrice, setPrevPrice] = useState(0);

  // Win Notification logic
  useEffect(() => {
    if (lastWinAmount > 0) {
      setShowWin(true);
      const t = setTimeout(() => {
        setShowWin(false);
        setLastWinAmount(0);
      }, 3000); // Slightly longer for the "Big Win" feel
      return () => clearTimeout(t);
    }
  }, [lastWinAmount, setLastWinAmount]);

  // Price Trend logic
  useEffect(() => {
    setPrevPrice(currentPrice);
  }, [currentPrice]);

  const trend = currentPrice >= prevPrice ? 'up' : 'down';
  const trendColor = trend === 'up' ? '#00ff9d' : '#ff3b30';

  // Specific "Euphoria" formatting: $0,000.00
  const fmtPrice = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
    <div className="ui-overlay pointer-events-none">
      {/* --- Top Left: Main Ticker --- */}
      <div className="widget-panel top-left glass-panel">
        <div className="panel-row">
          <div className="icon-box neon-border">
            <Target size={24} color="#fff" />
          </div>
          <div className="col">
            <span className="label text-xs tracking-widest text-gray-400">ETH / USDT PERP</span>
            <div className="value-row flex items-center gap-2">
              <span className="value-lg text-2xl font-bold font-mono tracking-wider" style={{ color: trendColor, textShadow: `0 0 10px ${trendColor}` }}>
                {fmtPrice(currentPrice)}
              </span>
              {trend === 'up' ? 
                <TrendingUp size={20} color={trendColor} /> : 
                <TrendingDown size={20} color={trendColor} />
              }
            </div>
          </div>
        </div>
      </div>

      {/* --- Top Center: Win Notification --- */}
      <div className={`win-popup ${showWin ? 'active' : ''} glass-panel center-pop`}>
        <div className="win-content flex flex-col items-center justify-center p-6 border-2 border-yellow-400 rounded-xl bg-black/80">
          <Zap size={48} fill="#ffd700" stroke="#ffd700" className="mb-2 animate-bounce" />
          <span className="win-title text-yellow-400 font-black text-3xl tracking-widest uppercase">YOU WON</span>
          <span className="win-amount text-white font-mono text-4xl mt-2 drop-shadow-md">+{fmtBalance(lastWinAmount)}</span>
        </div>
      </div>

      {/* --- Bottom Left: Balance --- */}
      <div className="widget-panel bottom-left glass-panel">
        <div className="panel-row">
          <div className="icon-box wallet neon-border">
            <Wallet size={24} color="#fff" />
          </div>
          <div className="col">
            <span className="label text-xs tracking-widest text-gray-400">AVAILABLE BALANCE</span>
            <span className="value-md text-xl font-bold text-white font-mono">{fmtBalance(balance)}</span>
          </div>
        </div>
      </div>

      {/* --- Bottom Right: Bet Controls --- */}
      <div className="widget-panel bottom-right glass-panel pointer-events-auto">
        <div className="flex flex-col items-end gap-2">
          <span className="label-center text-xs tracking-widest text-gray-400 mb-1">QUICK BET</span>
          <div className="bet-grid grid grid-cols-3 gap-2">
            {[1, 5, 10, 25, 50, 100].map(amt => (
              <button 
                key={amt}
                className={`bet-btn px-4 py-2 font-mono font-bold rounded border transition-all duration-200
                  ${betAmount === amt 
                    ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_15px_rgba(255,215,0,0.6)] scale-105' 
                    : 'bg-black/40 text-gray-300 border-gray-600 hover:border-white hover:text-white'
                  }`}
                onClick={() => setBetAmount(amt)}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
