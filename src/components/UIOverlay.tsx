import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useGameServer, useAsset } from '@agent8/gameserver';
import { Wallet, TrendingUp, TrendingDown, Target, CheckCircle2, ShoppingBag } from 'lucide-react';

const UIOverlay: React.FC = () => {
  const { currentPrice, balance, betAmount, setBetAmount, lastWinAmount, setLastWinAmount, setBalance } = useGameStore();
  const { connected, server } = useGameServer();
  const { assets } = useAsset();
  const [showWin, setShowWin] = useState(false);
  const [prevPrice, setPrevPrice] = useState(0);

  // Sync Server Asset to Game Store
  useEffect(() => {
    if (assets && typeof assets['credit'] === 'number') {
      setBalance(assets['credit']);
    }
  }, [assets, setBalance]);

  // Crossramp Shop
  const openShop = async () => {
    if (!connected || !server) return;
    try {
      const url = await server.getCrossRampShopUrl("en");
      window.open(url, "CrossRampShop", "width=1024,height=768");
    } catch (error) {
      console.error("Failed to open Shop:", error);
    }
  };

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
    <div className="ui-overlay pointer-events-none font-sans">
      {/* --- Top Left: Main Ticker --- */}
      <div className="widget-panel top-left glass-panel">
        <div className="panel-row flex items-center gap-3">
          <div className="icon-box neon-border flex items-center justify-center w-8 h-8 rounded bg-black/40 border border-white/10">
            <Target size={16} color="#fff" />
          </div>
          <div className="col flex flex-col">
            <span className="label text-[9px] tracking-widest text-cyan-400 font-bold mb-0.5">ETH-USDT SWAP</span>
            <div className="value-row flex items-center gap-2">
              <span className="value-lg text-xl font-bold font-mono tracking-wider text-white">
                {fmtPrice(currentPrice)}
              </span>
              {trend === 'up' ? 
                <TrendingUp size={14} color={trendColor} /> : 
                <TrendingDown size={14} color={trendColor} />
              }
            </div>
          </div>
        </div>
      </div>

      {/* --- Top Center: Minimal Win Notification Bar --- */}
      {/* "Minimal, small 'You won $XX.XX' bar" */}
      <div className={`win-bar ${showWin ? 'active' : ''} glass-panel flex items-center justify-center gap-3`}>
        <CheckCircle2 size={16} className="text-emerald-400" />
        <span className="text-gray-300 font-bold text-xs uppercase tracking-wide">You won</span>
        <span className="text-yellow-400 font-mono font-bold text-sm">
          {fmtBalance(lastWinAmount)}
        </span>
      </div>

      {/* --- Bottom Left: Balance --- */}
      <div className="widget-panel bottom-left glass-panel pointer-events-auto cursor-pointer hover:bg-white/5 transition-colors" onClick={openShop}>
        <div className="panel-row flex items-center gap-3">
          <div className="icon-box wallet neon-border flex items-center justify-center w-8 h-8 rounded bg-emerald-900/30 border border-emerald-500/30">
            <Wallet size={16} color="#00ff9d" />
          </div>
          <div className="col flex flex-col">
            <div className="flex items-center gap-1">
              <span className="label text-[9px] tracking-widest text-emerald-400 font-bold mb-0.5">BALANCE</span>
              <div className="bg-emerald-500/20 px-1 rounded text-[8px] text-emerald-300">Wallet</div>
            </div>
            <span className="value-md text-lg font-bold text-white font-mono tracking-wide">
              {fmtBalance(balance)}
            </span>
          </div>
          <ShoppingBag size={14} className="text-emerald-400/50 ml-1" />
        </div>
      </div>

      {/* --- Bottom Right: Bet Controls --- */}
      <div className="widget-panel bottom-right glass-panel pointer-events-auto">
        <div className="flex flex-col items-end gap-1">
          <span className="label-center text-[9px] tracking-[0.2em] text-gray-400 mb-2 font-bold uppercase">BET SIZE</span>
          <div className="bet-grid grid grid-cols-3 gap-1.5">
            {[1, 5, 10, 25, 50, 100].map(amt => (
              <button 
                key={amt}
                className={`bet-btn px-4 py-2 text-xs font-mono font-bold rounded-md border transition-all duration-200 relative overflow-hidden group
                  ${betAmount === amt 
                    ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_10px_rgba(255,215,0,0.3)] scale-100 z-10' 
                    : 'bg-white/5 text-gray-400 border-white/5 hover:border-white/20 hover:text-white hover:bg-white/10'
                  }`}
                onClick={() => setBetAmount(amt)}
              >
                <span className="relative z-10">${amt}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
