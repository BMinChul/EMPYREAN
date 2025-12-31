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
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [lastWinAmount, setLastWinAmount]);

  // Price Trend logic
  useEffect(() => {
    setPrevPrice(currentPrice);
  }, [currentPrice]);

  const trend = currentPrice >= prevPrice ? 'up' : 'down';
  const trendColor = trend === 'up' ? '#00ff9d' : '#ff3b30';

  // Formatting: $0,000.00
  const fmtPrice = (val: number) => {
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Formatting: $00.00
  const fmtBalance = (val: number) => {
    return val.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="ui-overlay pointer-events-none">
      {/* --- Top Left: Main Ticker --- */}
      <div className="widget-panel top-left glass-panel">
        <div className="panel-row flex items-center gap-3">
          <div className="icon-box neon-border flex items-center justify-center w-10 h-10 rounded bg-black/40 border border-white/10">
            <Target size={20} color="#fff" />
          </div>
          <div className="col flex flex-col">
            <span className="label text-[10px] tracking-widest text-cyan-400 font-bold mb-1">ETH / USDT PERP</span>
            <div className="value-row flex items-center gap-3">
              <span className="value-lg text-2xl font-bold font-mono tracking-wider" style={{ color: trendColor, textShadow: `0 0 15px ${trendColor}66` }}>
                {fmtPrice(currentPrice)}
              </span>
              {trend === 'up' ? 
                <TrendingUp size={18} color={trendColor} /> : 
                <TrendingDown size={18} color={trendColor} />
              }
            </div>
          </div>
        </div>
      </div>

      {/* --- Top Center: Win Notification Bar --- */}
      <div className={`win-bar ${showWin ? 'active' : ''} glass-panel flex items-center justify-center gap-4`}>
        <Zap size={20} fill="#ffd700" stroke="#ffd700" />
        <span className="text-yellow-400 font-bold uppercase tracking-wider text-sm">YOU WON</span>
        <span className="text-white font-mono font-bold text-lg">
          {fmtBalance(lastWinAmount)}
        </span>
      </div>

      {/* --- Bottom Left: Balance --- */}
      <div className="widget-panel bottom-left glass-panel">
        <div className="panel-row flex items-center gap-3">
          <div className="icon-box wallet neon-border flex items-center justify-center w-10 h-10 rounded bg-emerald-900/30 border border-emerald-500/30">
            <Wallet size={20} color="#00ff9d" />
          </div>
          <div className="col flex flex-col">
            <span className="label text-[10px] tracking-widest text-emerald-400 font-bold mb-1">AVAILABLE BALANCE</span>
            <span className="value-md text-xl font-bold text-white font-mono tracking-wide shadow-emerald-500/20 drop-shadow-sm">
              {fmtBalance(balance)}
            </span>
          </div>
        </div>
      </div>

      {/* --- Bottom Right: Bet Controls --- */}
      <div className="widget-panel bottom-right glass-panel pointer-events-auto">
        <div className="flex flex-col items-end gap-2">
          <span className="label-center text-[10px] tracking-[0.2em] text-gray-400 mb-2 font-bold uppercase">Quick Bet Amount</span>
          <div className="bet-grid grid grid-cols-3 gap-2">
            {[1, 5, 10, 25, 50, 100].map(amt => (
              <button 
                key={amt}
                className={`bet-btn px-6 py-3 font-mono font-bold rounded-lg border transition-all duration-200 relative overflow-hidden group
                  ${betAmount === amt 
                    ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_20px_rgba(255,215,0,0.5)] scale-105 z-10' 
                    : 'bg-white/5 text-gray-300 border-white/10 hover:border-white/50 hover:text-white hover:bg-white/10'
                  }`}
                onClick={() => setBetAmount(amt)}
              >
                <span className="relative z-10">${amt}</span>
                {betAmount === amt && (
                   <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
